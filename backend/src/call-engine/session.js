// src/call-engine/session.js
// 🎙 THE BRAIN — manages each live call from connection to end.
// Coordinates: STT → LLM → TTS → DB saves → Google Sheets
const { v4: uuidv4 }    = require('uuid')
const { createSTTHandler, VoiceActivityDetector } = require('./stt/index')
const { streamTTSToSocket }   = require('./tts/index')
const { getAIResponse, parseRescheduleTime } = require('./llm/index')
const { buildSystemPrompt, buildGreeting }   = require('./prompts')
const { detectQuickIntent }  = require('./intent')
const callRepo     = require('../repositories/call.repo')
const contactRepo  = require('../repositories/contact.repo')
const campaignRepo = require('../repositories/campaign.repo')
const userRepo     = require('../repositories/user.repo')
const { appendToGoogleSheet } = require('../integrations/googleSheets')

// All active call sessions — key: sessionId, value: CallSession
const activeSessions = new Map()

// ═══════════════════════════════════════════════════════════════
class CallSession {
  constructor(contact, campaign, wsSocket) {
    this.sessionId = uuidv4()
    this.contact   = contact
    this.campaign  = campaign
    this.wsSocket  = wsSocket

    this.language      = campaign.language_priority || 'gu'
    this.transcript    = []   // Full conversation [{role, content}]
    this.collectedData = {}   // Data gathered during the call
    this.isActive      = true
    this.startTime     = Date.now()

    this.sttHandler = null
    this.vad        = null
    this.audioBuffer = Buffer.alloc(0)
  }

  // ── Start the call ─────────────────────────────────────────
  async start() {
    console.log(`[Session ${this.sessionId}] 📞 Call to ${this.contact.phone} starting`)

    try {
      await callRepo.create(this.contact.id, this.campaign.id, this.sessionId)

      const greeting = buildGreeting(this.campaign, this.contact, this.language)
      await this.speak(greeting)
      this.transcript.push({ role: 'assistant', content: greeting })

      this._setupSTT()
      this._setupVAD()

      activeSessions.set(this.sessionId, this)
    } catch (err) {
      console.error(`[Session ${this.sessionId}] Start error:`, err)
      await this.endCall('failed')
    }
  }

  // ── Setup STT (Sarvam or Google, via index.js) ─────────────
  _setupSTT() {
    this.sttHandler = createSTTHandler(
      async (text, detectedLang) => {
        if (!this.isActive) return
        this.language = detectedLang
        console.log(`[Session ${this.sessionId}] User (${detectedLang}): "${text}"`)
        this.transcript.push({ role: 'user', content: text })
        await this._processUserInput(text)
      },
      async (err) => {
        console.error(`[Session ${this.sessionId}] STT error:`, err.message)
        // Restart STT stream on recoverable errors (Google streaming only)
        if (this.isActive && this.sttHandler?.provider === 'google' && err.code !== 11) {
          setTimeout(() => { if (this.isActive) this._setupSTT() }, 1000)
        }
      },
      this.language
    )
  }

  // ── Voice Activity Detector ────────────────────────────────
  _setupVAD() {
    this.vad = new VoiceActivityDetector(async () => {
      // User stopped speaking — flush Sarvam buffer or push final Google chunk
      if (this.sttHandler?.provider === 'sarvam') {
        await this.sttHandler.flush()
      } else if (this.audioBuffer.length > 0 && this.sttHandler && !this.sttHandler.destroyed) {
        this.sttHandler.write(this.audioBuffer)
        this.audioBuffer = Buffer.alloc(0)
      }
    }, 900)
  }

  // ── Receive audio from WebSocket ───────────────────────────
  receiveAudio(audioData) {
    if (!this.isActive) return
    const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData)

    this.vad?.processChunk(buffer)

    if (this.sttHandler?.provider === 'sarvam') {
      // Sarvam: accumulate in handler's internal buffer
      this.sttHandler.write(buffer)
    } else {
      // Google: send in 3200-byte chunks (200ms at 8kHz 16-bit)
      this.audioBuffer = Buffer.concat([this.audioBuffer, buffer])
      const CHUNK_SIZE = 3200
      while (this.audioBuffer.length >= CHUNK_SIZE) {
        if (this.sttHandler && !this.sttHandler.destroyed) {
          this.sttHandler.write(this.audioBuffer.slice(0, CHUNK_SIZE))
        }
        this.audioBuffer = this.audioBuffer.slice(CHUNK_SIZE)
      }
    }
  }

  // ── Process user input through LLM ────────────────────────
  async _processUserInput(userText) {
    try {
      // Quick intent check — catches obvious DNC/transfer/reschedule before LLM
      const quickIntent = detectQuickIntent(userText)

      const systemPrompt = buildSystemPrompt(this.campaign, this.contact, this.language)
      const history      = this.transcript.slice(-10)

      const response = await getAIResponse(systemPrompt, history, userText)

      // Quick intent overrides LLM if LLM missed it
      if (quickIntent && response.action === 'continue') {
        response.action = quickIntent
        console.log(`[Session ${this.sessionId}] Quick intent override: ${quickIntent}`)
      }

      if (response.detected_language) this.language = response.detected_language
      this.collectedData = { ...this.collectedData, ...response.collected_data }

      this.transcript.push({ role: 'assistant', content: response.text })
      console.log(`[Session ${this.sessionId}] AI (${response.provider}) [${response.action}]: "${response.text}"`)

      await this.speak(response.text)
      await this._handleAction(response)
    } catch (err) {
      console.error(`[Session ${this.sessionId}] Process input error:`, err)
    }
  }

  // ── Speak text via TTS ─────────────────────────────────────
  async speak(text) {
    if (!this.isActive || !text) return
    try {
      await streamTTSToSocket(text, this.language, this.wsSocket)
    } catch (err) {
      console.error(`[Session ${this.sessionId}] Speak error:`, err.message)
    }
  }

  // ── Handle LLM action ──────────────────────────────────────
  async _handleAction({ action, reschedule_time }) {
    switch (action) {
      case 'reschedule': {
        const scheduledAt = await parseRescheduleTime(reschedule_time)
        if (scheduledAt) {
          await contactRepo.scheduleCallback(this.contact.id, scheduledAt)
          await callRepo.insertCallback(this.contact.id, this.campaign.id, scheduledAt, reschedule_time)
          console.log(`[Session ${this.sessionId}] 📅 Callback scheduled: ${scheduledAt}`)
        }
        await this.endCall('rescheduled')
        break
      }
      case 'transfer': {
        await this._transferToHuman()
        break
      }
      case 'dnc': {
        await contactRepo.markDNC(this.contact.id)
        console.log(`[Session ${this.sessionId}] 🚫 DNC: ${this.contact.phone}`)
        await this.endCall('dnc')
        break
      }
      case 'end': {
        await this.endCall('completed')
        break
      }
      // 'continue' → do nothing, wait for next user input
    }
  }

  // ── Transfer to human agent ────────────────────────────────
  async _transferToHuman() {
    const agentNumber = process.env.HUMAN_AGENT_NUMBER
    if (agentNumber) {
      try {
        const { transferCall } = require('../telephony')
        await transferCall(this.sessionId, agentNumber)
        console.log(`[Session ${this.sessionId}] 👤 Transferred to: ${agentNumber}`)
      } catch (err) {
        console.error(`[Session ${this.sessionId}] Transfer error:`, err.message)
      }
    }
    await this.endCall('transferred')
  }

  // ── End call + save everything ─────────────────────────────
  async endCall(outcome = 'completed') {
    if (!this.isActive) return
    this.isActive = false

    const duration = Math.floor((Date.now() - this.startTime) / 1000)
    console.log(`[Session ${this.sessionId}] 📵 Ended: ${outcome} (${duration}s)`)

    try {
      await callRepo.update(this.sessionId, {
        outcome,
        duration_sec:      duration,
        language_detected: this.language,
        transcript:        JSON.stringify(this.transcript),
        collected_data:    JSON.stringify(this.collectedData),
        ended_at:          new Date().toISOString(),
      })

      await contactRepo.updateStatus(this.contact.id, 'completed', outcome)
      await campaignRepo.incrementCompleted(this.campaign.id)

      // Write to Google Sheets if connected
      if (this.campaign.google_sheet_id) {
        const user = await userRepo.findById(this.campaign.user_id)
        if (user?.google_sheets_token) {
          await appendToGoogleSheet(
            user.google_sheets_token,
            this.campaign.google_sheet_id,
            this.contact, outcome, this.language, duration, this.collectedData
          ).catch(err => console.error('[Sheets] Error:', err.message))
        }
      }

      // Mark campaign complete if no more pending
      const stats   = await campaignRepo.getStats(this.campaign.id)
      const pending = parseInt(stats.pending) + parseInt(stats.calling) + parseInt(stats.scheduled)
      if (pending === 0 && this.campaign.status === 'active') {
        await campaignRepo.updateStatus(this.campaign.id, 'completed')
        console.log(`✅ Campaign completed: ${this.campaign.name}`)
      }
    } catch (err) {
      console.error(`[Session ${this.sessionId}] Save error:`, err)
    } finally {
      this.sttHandler?.destroy?.()
      this.vad?.destroy()
      activeSessions.delete(this.sessionId)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// WebSocket Connection Handler
// Called from server.js when a telephony provider connects.
// ═══════════════════════════════════════════════════════════════
async function handleWebSocketConnection(ws, req) {
  // Extract sessionId from URL: /ws/call/{sessionId} or /ws/{sessionId}
  const parts     = req.url.split('/')
  const sessionId = parts[parts.length - 1]

  if (!sessionId) { ws.close(); return }
  console.log(`[WS] New connection: ${sessionId}`)

  let session = activeSessions.get(sessionId)

  if (session) {
    session.wsSocket = ws
    await session.start()
  } else {
    // Session not in memory — check DB (edge case: server restart mid-call)
    console.log(`[WS] Session ${sessionId} not in memory, checking DB...`)
    try {
      const row = await callRepo.findBySession(sessionId)
      if (!row) { console.log(`[WS] No call log for ${sessionId}`); ws.close(); return }

      const contact  = { id: row.contact_id, phone: row.phone, variables: row.variables }
      const campaign = {
        id: row.campaign_id, name: row.name, language_priority: row.language_priority,
        script_content: row.script_content, system_prompt: row.system_prompt,
        persona_name: row.persona_name, persona_tone: row.persona_tone,
        data_fields: row.data_fields, handoff_keywords: row.handoff_keywords,
        caller_id: row.caller_id, user_id: row.user_id,
        google_sheet_id: row.google_sheet_id, campaign_type: row.campaign_type,
      }
      session = new CallSession(contact, campaign, ws)
      session.sessionId = sessionId
      await session.start()
    } catch (err) {
      console.error('[WS] DB lookup error:', err)
      ws.close()
      return
    }
  }

  ws.on('message', (data) => {
    const s = activeSessions.get(sessionId)
    if (s?.isActive) s.receiveAudio(data)
  })

  ws.on('close', async () => {
    console.log(`[WS] Disconnected: ${sessionId}`)
    const s = activeSessions.get(sessionId)
    if (s?.isActive) await s.endCall('disconnected')
  })

  ws.on('error', (err) => {
    console.error(`[WS] Error (${sessionId}):`, err.message)
  })
}

module.exports = { CallSession, activeSessions, handleWebSocketConnection }

