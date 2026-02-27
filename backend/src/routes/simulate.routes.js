// src/routes/simulate.routes.js
// 🧪 CALL SIMULATOR — Tests full AI conversation without Vobiz/phone
// Uses real Groq LLM + real campaign script + real contact data
// No audio, no telephony — pure text conversation
const express      = require('express')
const auth         = require('../middleware/auth')
const campaignRepo = require('../repositories/campaign.repo')
const contactRepo  = require('../repositories/contact.repo')
const callRepo     = require('../repositories/call.repo')
const { getAIResponse }               = require('../call-engine/llm/index')
const { buildSystemPrompt, buildGreeting } = require('../call-engine/prompts')

const router = express.Router()
router.use(auth)

// Active simulation sessions (in-memory)
const simSessions = new Map()

// ── POST /simulate/start ────────────────────────────────────
// Start a simulated call for a campaign
router.post('/start', async (req, res, next) => {
  try {
    const { campaign_id, contact_phone } = req.body
    if (!campaign_id) return res.status(400).json({ error: 'campaign_id is required' })

    // Load campaign
    const campaign = await campaignRepo.findById(campaign_id, req.userId)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    // Load a real contact or use a dummy
    let contact = null
    if (contact_phone) {
      const contacts = await contactRepo.getPending(campaign_id, 1)
      contact = contacts.find(c => c.phone === contact_phone) || contacts[0]
    } else {
      const contacts = await contactRepo.getPending(campaign_id, 1)
      contact = contacts[0]
    }

    // Use dummy contact if none exist
    if (!contact) {
      contact = {
        id:        'sim-contact',
        phone:     '+919876543210',
        variables: { name: 'Rajesh', bus_number: 'Bus 47' },
      }
    }

    // Build session
    const sessionId   = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const lang        = campaign.language_priority || 'gu'
    const systemPrompt = buildSystemPrompt(campaign, contact, lang)
    const greeting    = buildGreeting(campaign, contact, lang)

    const session = {
      sessionId,
      campaign,
      contact,
      lang,
      systemPrompt,
      transcript: [{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }],
      startTime:  Date.now(),
      status:     'active',
    }
    simSessions.set(sessionId, session)

    // Auto-cleanup after 30 minutes
    setTimeout(() => simSessions.delete(sessionId), 30 * 60 * 1000)

    console.log(`[Simulator] 🧪 Session started: ${sessionId} | Campaign: ${campaign.name}`)

    res.json({
      session_id:   sessionId,
      campaign_name: campaign.name,
      contact:      { phone: contact.phone, variables: contact.variables },
      language:     lang,
      greeting,
      transcript:   session.transcript,
    })
  } catch (err) { next(err) }
})

// ── POST /simulate/message ──────────────────────────────────
// Send a user message and get AI response
router.post('/message', async (req, res, next) => {
  try {
    const { session_id, message } = req.body
    if (!session_id || !message) return res.status(400).json({ error: 'session_id and message are required' })

    const session = simSessions.get(session_id)
    if (!session) return res.status(404).json({ error: 'Session not found or expired. Start a new simulation.' })
    if (session.status !== 'active') return res.status(400).json({ error: 'Session already ended' })

    // Add user message to transcript
    const userEntry = { role: 'user', content: message, timestamp: new Date().toISOString() }
    session.transcript.push(userEntry)

    // Build history for LLM (exclude system prompt entries)
    const history = session.transcript.map(t => ({ role: t.role, content: t.content }))

    // Get AI response using real Groq
    const aiResult = await getAIResponse(session.systemPrompt, history.slice(0, -1), message)

    const aiEntry = {
      role:      'assistant',
      content:   aiResult.text,
      action:    aiResult.action,
      timestamp: new Date().toISOString(),
    }
    session.transcript.push(aiEntry)

    // Update detected language
    if (aiResult.detected_language) session.lang = aiResult.detected_language

    // Handle end actions
    if (['end_call', 'transfer', 'dnc'].includes(aiResult.action)) {
      session.status       = 'ended'
      session.endReason    = aiResult.action
      session.collectedData = aiResult.collected_data || {}
    }

    console.log(`[Simulator] 💬 ${session_id} | User: "${message.slice(0,40)}" | AI: "${aiResult.text.slice(0,40)}..." | Action: ${aiResult.action}`)

    res.json({
      response:          aiResult.text,
      action:            aiResult.action,
      detected_language: aiResult.detected_language || session.lang,
      collected_data:    aiResult.collected_data || {},
      session_status:    session.status,
      transcript:        session.transcript,
    })
  } catch (err) { next(err) }
})

// ── POST /simulate/end ──────────────────────────────────────
// End the simulation and get summary
router.post('/end', async (req, res, next) => {
  try {
    const { session_id, outcome } = req.body
    if (!session_id) return res.status(400).json({ error: 'session_id is required' })

    const session = simSessions.get(session_id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    session.status   = 'ended'
    session.endReason = outcome || 'manual'

    const durationSec = Math.round((Date.now() - session.startTime) / 1000)

    // Optionally save to call_logs as a simulation record
    try {
      if (session.contact.id !== 'sim-contact') {
        const log = await callRepo.create(session.contact.id, session.campaign.id, session.sessionId)
        if (log) {
          await callRepo.update(session.sessionId, {
            outcome:           outcome || 'completed',
            duration_sec:      durationSec,
            language_detected: session.lang,
            transcript:        JSON.stringify(session.transcript),
            collected_data:    JSON.stringify(session.collectedData || {}),
            ended_at:          new Date().toISOString(),
          })
        }
      }
    } catch (dbErr) {
      console.warn('[Simulator] Could not save call log:', dbErr.message)
    }

    simSessions.delete(session_id)
    console.log(`[Simulator] ✅ Session ended: ${session_id} | Duration: ${durationSec}s`)

    res.json({
      message:       'Simulation ended',
      duration_sec:  durationSec,
      total_turns:   session.transcript.length,
      outcome:       outcome || 'completed',
      collected_data: session.collectedData || {},
      transcript:    session.transcript,
    })
  } catch (err) { next(err) }
})

// ── GET /simulate/session/:id ───────────────────────────────
router.get('/session/:id', async (req, res) => {
  const session = simSessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json({ session_id: req.params.id, status: session.status, transcript: session.transcript })
})

module.exports = router
