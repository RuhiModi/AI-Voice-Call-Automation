// src/call-engine/session.js
// 🎙 THE BRAIN — manages each live call from connection to end.
// Coordinates: STT → LLM → TTS → DB saves → Google Sheets
const { v4: uuidv4 }    = require('uuid')
const { createSTTHandler, VoiceActivityDetector } = require('./stt/index')
const { streamTTSToSocket }   = require('./tts/index')
const { parseRescheduleTime } = require('./llm/index')
const { parseScript, ScriptFlowExecutor } = require('./scriptFlow')
const { AnnouncementFlowExecutor }         = require('./announcementFlow')
const callRepo     = require('../repositories/call.repo')
const contactRepo  = require('../repositories/contact.repo')
const campaignRepo = require('../repositories/campaign.repo')
const userRepo     = require('../repositories/user.repo')
const { appendToGoogleSheet }       = require('../integrations/googleSheets')
const { translatePromptIfNeeded }   = require('./promptTranslate')
const { deliverWebhook }      = require('../services/webhookDelivery')

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
    this.flowExecutor   = null  // Script flow executor
    this.collectedData = {}   // Data gathered during the call
    this.llmUsed       = false  // Whether LLM was activated at all
    this.llmTurns      = 0      // How many turns LLM handled
    this.isActive      = true
    this.startTime     = Date.now()
    this.answeredAt    = null   // set when call is actually answered (Vobiz charges from here)

    this.sttHandler    = null
    this.vad           = null
    this.audioBuffer   = Buffer.alloc(0)
    this.agentSpeaking = false  // true while TTS is playing — mutes STT input
    this.vobizCallUuid  = null   // Set by scheduler after makeOutboundCall
    this.vobizCreds     = {}     // Set by scheduler — needed for hangup API
  }

  // ── Start the call ─────────────────────────────────────────
  async start() {
    console.log(`[Session ${this.sessionId}] 📞 Call starting | WS ready: ${this.wsSocket?.readyState}`)

    try {
      await callRepo.create(this.contact.id, this.campaign.id, this.sessionId)
      activeSessions.set(this.sessionId, this)

      // Small delay — let WebSocket fully establish before sending audio
      await new Promise(r => setTimeout(r, 500))

      if (!this.wsSocket || this.wsSocket.readyState !== 1) {
        console.error(`[Session ${this.sessionId}] ❌ WebSocket not open! State: ${this.wsSocket?.readyState}`)
        await this.endCall('failed')
        return
      }

      console.log(`[Session ${this.sessionId}] ✅ WebSocket open — starting state machine flow`)

      // Pick executor based on campaign type
      const campaignType = this.campaign?.campaign_type || 'survey'

      if (campaignType === 'announcement') {
        // Personalized message + ack flow (e.g. driver route notifications)
        this.flowExecutor = new AnnouncementFlowExecutor(this.campaign, this.contact)
        console.log(`[Session ${this.sessionId}] 📢 Announcement flow loaded`)
      } else {
        // Survey / verification flow — driven by PDF state machine
        const pdfTexts = this.campaign?.flow_config || null
        this.flowExecutor = new ScriptFlowExecutor(pdfTexts)
        const src = pdfTexts ? '📄 PDF' : '⚙️ Fallback'
        console.log(`[Session ${this.sessionId}] 📋 Script flow loaded (${src}) — states: ${this.flowExecutor.stateOrder?.join(' → ') || 'none'}`)
        if (pdfTexts?.flow) {
          console.log(`[Session ${this.sessionId}] 🗺 Flow options sample:`, JSON.stringify(pdfTexts.flow[0]?.options?.slice(0,2)))
        }
      }

      // Give executor the contact info for name verification
      if (this.flowExecutor.setContact) {
        this.flowExecutor.setContact(
          this.contact,
          this.campaign.persona_name,
          this.language
        )
      }

      // Speak name verification opening — then STOP and wait for user
      const opening = this.flowExecutor.getNameVerifyOpening
        ? this.flowExecutor.getNameVerifyOpening()
        : this.flowExecutor.getOpening()
      this.transcript.push({ role: 'assistant', content: opening })
      await this.speak(opening)

      this._setupSTT()
      this._setupVAD()

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
      console.log(`[Session ${this.sessionId}] 🔇 Silence detected — flushing STT buffer`)
      if (this.sttHandler?.provider === 'sarvam') {
        await this.sttHandler.flush()
      } else if (this.audioBuffer.length > 0 && this.sttHandler && !this.sttHandler.destroyed) {
        this.sttHandler.write(this.audioBuffer)
        this.audioBuffer = Buffer.alloc(0)
      }
    }, 400)  // Reduced from 900ms for faster response
  }

  // ── Receive audio from WebSocket ───────────────────────────
  receiveAudio(audioData) {
    if (!this.isActive) return
    const mulawBuffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData)
    if (!this._audioLogCount) this._audioLogCount = 0
    if (this._audioLogCount++ < 3) {
      console.log(`[Session ${this.sessionId}] 🎤 Receiving audio: ${mulawBuffer.length} bytes (mulaw)`)
    }

    // Vobiz sends mulaw audio — convert to PCM16 for STT processing
    const { mulawToPcm16 } = require('./tts/audioConvert')
    const buffer = mulawToPcm16(mulawBuffer)

    // VAD decides if user is speaking
    this.vad?.processChunk(buffer)

    if (this.sttHandler?.provider === 'sarvam') {
      // Only buffer audio when user is actually speaking — prevents huge silent buffers
      if (this.vad?.isSpeaking) {
        this.sttHandler.write(buffer)
      }
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
    // Ignore input while agent is speaking — prevents echo/barge-in
    if (this.agentSpeaking) {
      console.log(`[Session ${this.sessionId}] 🔇 Ignored input (agent speaking): "${userText.substring(0,30)}"`)
      return
    }
    // Ignore if flow already done
    if (this.flowExecutor?.done) {
      console.log(`[Session ${this.sessionId}] 🔇 Ignored input (flow done): "${userText.substring(0,30)}"`)
      return
    }
    try {
      // ── 0. Post-LLM resume for announcement flow ─────────────
      // After LLM handled one turn, next input goes back to announcement executor
      if (this._postLLMPending && this.flowExecutor instanceof AnnouncementFlowExecutor) {
        this._postLLMPending = false
        const resumeResult = this.flowExecutor.resumeAfterLLM(userText)
        this.transcript.push({ role: 'assistant', content: resumeResult.text })
        await this.speak(resumeResult.text)
        if (resumeResult.action === 'end') await this._handleAction(resumeResult)
        return
      }

      // ── 1. Flow executor (ScriptFlow or AnnouncementFlow) ─────
      const flowResult = this.flowExecutor.process(userText, this.language)

      if (!flowResult.useLLM) {
        // Sync collected data
        const summary = this.flowExecutor.getSummary()
        this.collectedData = { ...this.collectedData, ...(summary.collectedData || {}) }

        if (!flowResult.text) {
          console.log(`[Session ${this.sessionId}] ✅ Flow END reached`)
          await this._handleAction({ action: 'end' })
          return
        }

        // AUTO-LANGUAGE: translate prompt to user's current language if different from script base
        const promptToSpeak = await translatePromptIfNeeded(
          flowResult.text,
          this.language,
          this.campaign._baseLang || this.campaign.language_priority || 'gu'
        )
        this.transcript.push({ role: 'assistant', content: promptToSpeak })
        console.log(`[Session ${this.sessionId}] 📋 Flow [${flowResult.stateId || ''}] (${this.language}): "${promptToSpeak.substring(0,60)}"`)
        await this.speak(promptToSpeak)

        if (flowResult.action === 'end') {
          // Terminal state — script is done. Wait briefly then end call.
          // Do NOT call _sayGoodbyeAndHangup — agent already spoke the closing line.
          console.log(`[Session ${this.sessionId}] 🏁 Terminal state reached — ending call`)
          await new Promise(r => setTimeout(r, 1500))
          await this.endCall('completed')
          return
        }

        if (flowResult.action && flowResult.action !== 'continue') {
          await this._handleAction(flowResult)
        }
        return
      }

      // ── 2. No LLM — pure IVR mode ─────────────────────────────
      // Flow already re-asked the question — just log and wait
      this.llmUsed  = false
      console.log(`[Session ${this.sessionId}] ❓ Off-script input ignored — waiting for valid response`)
    } catch (err) {
      console.error(`[Session ${this.sessionId}] Process input error:`, err)
    }
  }

  // ── Speak text via TTS ─────────────────────────────────────
  async speak(text) {
    if (!this.isActive || !text) return
    console.log(`[Session ${this.sessionId}] 🗣️ Speaking: "${text.substring(0,60)}..." | WS state: ${this.wsSocket?.readyState} | Lang: ${this.language}`)
    this.agentSpeaking = true
    try {
      await streamTTSToSocket(text, this.language, this.wsSocket)
      console.log(`[Session ${this.sessionId}] ✅ Audio sent successfully`)
    } catch (err) {
      console.error(`[Session ${this.sessionId}] ❌ Speak error:`, err.message, err.response?.data || '')
    } finally {
      // Wait for audio to finish playing
      // 8kHz mulaw: ~125 bytes/ms. Sarvam returns compressed audio.
      // Use chars as proxy: ~50ms/char for Gujarati speech, max 6s
      const chars  = text.length
      const waitMs = Math.min(Math.max(chars * 50 + 200, 1200), 6000)
      console.log(`[Session ${this.sessionId}] ⏳ Audio wait: ${waitMs}ms (${chars} chars)`)
      // Release early if user starts speaking (VAD detects voice)
      const startWait = Date.now()
      while (Date.now() - startWait < waitMs) {
        if (this.vad?.isSpeaking) {
          console.log(`[Session ${this.sessionId}] 🎤 User started speaking — releasing lock early`)
          break
        }
        await new Promise(r => setTimeout(r, 100))
      }
      this.agentSpeaking = false
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
        await this._sayGoodbyeAndHangup()
        break
      }
      // 'continue' → do nothing, wait for next user input
    }
  }

  // ── Say goodbye then hang up ───────────────────────────────
  async _sayGoodbyeAndHangup() {
    try {
      const goodbyes = {
        gu: 'આભાર! તમારો સમય આપવા બદલ ધન્યવાદ. આવજો!',
        hi: 'धन्यवाद! आपका समय देने के लिए शुक्रिया। नमस्ते!',
        en: 'Thank you for your time. Have a great day. Goodbye!',
      }
      const goodbye = goodbyes[this.language] || goodbyes.en
      console.log(`[Session ${this.sessionId}] 👋 Saying goodbye: "${goodbye}"`)
      this.transcript.push({ role: 'assistant', content: goodbye })
      await this.speak(goodbye)
      // Short wait for audio to finish — hangupCall will cut the line cleanly
      await new Promise(r => setTimeout(r, 800))
    } catch (err) {
      console.error(`[Session ${this.sessionId}] Goodbye error:`, err.message)
    }
    await this.endCall('completed')
  }

  // ── Transfer to human agent ────────────────────────────────
  async _transferToHuman() {
    const agentNumber = process.env.HUMAN_AGENT_NUMBER
    if (agentNumber) {
      try {
        const { transferCall } = require('../telephony')
        await transferCall(this.sessionId, agentNumber, this.campaign?._vobizCreds || {})
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

    // ── Immediately hang up Vobiz call — don't wait for webhook ──────────────
    if (this.vobizCallUuid) {
      try {
        const { hangupCall } = require('../telephony')
        await hangupCall(this.vobizCallUuid, this.vobizCreds || {})
        console.log(`[Session ${this.sessionId}] 📵 Vobiz call ${this.vobizCallUuid} hung up via API`)
      } catch (err) {
        console.warn(`[Session ${this.sessionId}] ⚠️  hangupCall failed: ${err.message}`)
      }
    } else {
      // Fallback: close WebSocket — Vobiz detects stream end within ~2s
      try {
        if (this.wsSocket?.readyState === 1) {
          this.wsSocket.close()
          console.log(`[Session ${this.sessionId}] 📵 WebSocket closed (fallback hangup)`)
        }
      } catch {}
    }

    const duration   = Math.floor((Date.now() - this.startTime) / 1000)
    // billedSec = full duration from ringing start (billing starts when call is initiated)
    const billedSec  = this.answeredAt
      ? Math.floor((Date.now() - this.startTime) / 1000)  // ringing-start billing
      : null
    console.log(`[Session ${this.sessionId}] 📵 Ended: ${outcome} (${duration}s)`)

    try {
      // Pull final summary from flow executor
      const flowSummary = this.flowExecutor?.getSummary?.() || {}
      this.collectedData = { ...this.collectedData, ...(flowSummary.collectedData || {}) }

      await callRepo.update(this.sessionId, {
        outcome,
        duration_sec:      duration,
        billed_sec:        billedSec,
        ringing_at:        new Date(this.startTime).toISOString(),
        answered_at:       this.answeredAt ? new Date(this.answeredAt).toISOString() : null,
        language_detected: this.language,
        transcript:        JSON.stringify(this.transcript),
        collected_data:    JSON.stringify(this.collectedData),
        ended_at:          new Date().toISOString(),
        confusion_count:   this.flowExecutor?.confusionCount || 0,
        acknowledged:      flowSummary.acknowledged ?? null,
        campaign_type:     this.campaign?.campaign_type || null,
        llm_used:          this.llmUsed,
        llm_turns:         this.llmTurns,
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

      // Deliver to external webhook if configured
      if (this.campaign.webhook_url) {
        const callLog = {
          session_id:      this.sessionId,
          outcome,
          duration_sec:    duration,
          language_detected: this.language,
          collected_data:  JSON.stringify(this.collectedData),
          acknowledged:    flowSummary.acknowledged ?? null,
          confusion_count: this.flowExecutor?.confusionCount || 0,
          llm_used:        this.llmUsed,
          ended_at:        new Date().toISOString(),
        }
        deliverWebhook(this.campaign, this.contact, callLog)
          .catch(err => console.error('[Webhook] Delivery error:', err.message))
      }

      // Mark campaign complete if no more pending
      const stats   = await campaignRepo.getStats(this.campaign.id)
      const pending = parseInt(stats.pending) + parseInt(stats.calling) + parseInt(stats.scheduled)
      if (pending === 0 && this.campaign.status === 'active') {
        await campaignRepo.updateStatus(this.campaign.id, 'completed')
        console.log(`✅ Campaign completed: ${this.campaign.name}`)
        // Fire campaign completion webhook
        if (this.campaign.webhook_url) {
          const { deliverCampaignWebhook } = require('../services/webhookDelivery')
          deliverCampaignWebhook(this.campaign)
            .catch(err => console.error('[Webhook] Campaign summary error:', err.message))
        }
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

  let _msgCount = 0
  ws.on('message', (data) => {
    const s = activeSessions.get(sessionId)
    if (!s?.isActive) return

    _msgCount++
    // Log first 3 messages to see exact format from Vobiz
    if (_msgCount <= 3) {
      const preview = Buffer.isBuffer(data) ? `[Binary ${data.length} bytes]` : data.toString().substring(0, 200)
      console.log(`[WS] Message #${_msgCount} from Vobiz: ${preview}`)
    }

    // Try JSON first
    try {
      const msg = JSON.parse(data.toString())
      if (_msgCount <= 3) console.log(`[WS] Parsed event: "${msg.event}" | keys: ${Object.keys(msg).join(',')}`)

      if (msg.event === 'media' && msg.media?.payload) {
        const audioBuffer = Buffer.from(msg.media.payload, 'base64')
        s.receiveAudio(audioBuffer)
      } else if (msg.event === 'start') {
        console.log(`[WS] Stream started | streamSid: ${msg.streamSid || msg.stream_id || 'N/A'}`)
        console.log(`[WS] Start details:`, JSON.stringify(msg).substring(0, 300))
      } else if (msg.event === 'stop') {
        console.log(`[WS] Stream stopped`)
      } else if (msg.event === 'connected') {
        console.log(`[WS] Connected event received`)
      } else {
        console.log(`[WS] Unknown event: "${msg.event}" | full: ${JSON.stringify(msg).substring(0,200)}`)
      }
    } catch (e) {
      // Raw binary — treat as mulaw directly
      if (_msgCount <= 3) console.log(`[WS] Raw binary audio: ${data.length} bytes`)
      s.receiveAudio(Buffer.isBuffer(data) ? data : Buffer.from(data))
    }
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
