// src/routes/simulate.routes.js
// 🧪 CALL SIMULATOR — Full test without Vobiz/phone
// Supports: custom script text, PDF upload, website URL scraping
const express      = require('express')
const multer       = require('multer')
const path         = require('path')
const fs           = require('fs')
const auth         = require('../middleware/auth')
const campaignRepo = require('../repositories/campaign.repo')
const contactRepo  = require('../repositories/contact.repo')
const callRepo     = require('../repositories/call.repo')
const { getAIResponse }    = require('../call-engine/llm/index')
const { buildSystemPrompt } = require('../call-engine/prompts')

const router  = express.Router()
const upload  = multer({ dest: 'uploads/sim/', limits: { fileSize: 5 * 1024 * 1024 } })
const simSessions = new Map()

router.use(auth)

// ── helpers ──────────────────────────────────────────────────
function buildSimGreeting(campaign, contact, lang, customScript) {
  const persona = campaign?.persona_name || 'Priya'
  const name    = contact?.variables?.name || ''
  const script  = customScript || campaign?.script_content || ''

  // Extract first sentence of script as the opening line if available
  const firstLine = script.split(/[.।\n]/)[0]?.trim()

  const greetings = {
    gu: `નમસ્તે${name ? ' ' + name : ''}! હું ${persona} બોલું છું. ${firstLine || 'આજે હું તમારી સાથે થોડી વાત કરવા માંગું છું.'}`,
    hi: `नमस्ते${name ? ' ' + name + ' जी' : ''}! मैं ${persona} बोल रही हूं। ${firstLine || 'आज मैं आपसे कुछ बात करना चाहती हूं।'}`,
    en: `Hello${name ? ' ' + name : ''}! This is ${persona} calling. ${firstLine || 'I\'d like to have a quick chat with you today.'}`,
  }
  return greetings[lang] || greetings.en
}

function buildSimSystemPrompt(campaign, contact, lang, customScript, customPersona) {
  const script  = customScript || campaign?.script_content || 'Have a helpful conversation.'
  const persona = customPersona || campaign?.persona_name || 'Priya'
  const name    = contact?.variables?.name || 'the contact'
  const langNames = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }
  const langName  = langNames[lang] || 'English'
  const contactVars = contact?.variables ? JSON.stringify(contact.variables) : '{}'

  return `You are ${persona}, an AI voice assistant on an outbound phone call.

CONTACT NAME: ${name}
CONTACT INFO: ${contactVars}
LANGUAGE: ${langName} — respond ONLY in ${langName} unless the user switches language

YOUR SCRIPT / CAMPAIGN GOAL:
${script}

STRICT RULES:
1. Keep responses SHORT — max 2 sentences. This is a phone call.
2. Follow the script naturally — do NOT ask for name if you already know it (${name})
3. Do NOT introduce yourself again after greeting
4. If user says stop/remove/nahi chahiye → action = "dnc"
5. If user says busy/call later → ask when → action = "reschedule"  
6. If user asks for human/agent → action = "transfer"
7. If goal is complete → action = "end_call"
8. Never say you are an AI unless directly asked
9. Match user's language if they switch

ALWAYS respond with valid JSON only:
{
  "text": "<what to say — short, natural>",
  "action": "continue" | "reschedule" | "transfer" | "end_call" | "dnc",
  "collected_data": { "<field>": "<value>" },
  "detected_language": "gu" | "hi" | "en"
}`
}

// ── POST /simulate/extract-url ────────────────────────────────
// Scrape text from a website URL to use as script
router.post('/extract-url', async (req, res, next) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'url is required' })

    // Simple fetch — no puppeteer needed for most sites
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoiceAI-Bot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await response.text()

    // Strip HTML tags, get readable text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000) // Max 3000 chars

    res.json({ text, length: text.length })
  } catch (err) {
    res.status(400).json({ error: 'Could not fetch URL: ' + err.message })
  }
})

// ── POST /simulate/extract-pdf ────────────────────────────────
// Extract text from uploaded PDF
router.post('/extract-pdf', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' })

    // Use pdf-parse if available, else return placeholder
    let text = ''
    try {
      const pdfParse = require('pdf-parse')
      const buffer   = fs.readFileSync(req.file.path)
      const data     = await pdfParse(buffer)
      text = data.text?.slice(0, 3000) || ''
    } catch (parseErr) {
      // pdf-parse not installed — install it or fallback
      text = `[PDF uploaded: ${req.file.originalname}] — pdf-parse package needed. Run: npm install pdf-parse`
    }

    // Clean up temp file
    fs.unlinkSync(req.file.path)

    res.json({ text: text.trim(), filename: req.file.originalname })
  } catch (err) { next(err) }
})

// ── POST /simulate/start ──────────────────────────────────────
router.post('/start', async (req, res, next) => {
  try {
    const {
      campaign_id,
      custom_script,   // Text typed/pasted by user
      custom_persona,  // Override agent name
      language,        // Override language
      contact_name,    // Dummy contact name for simulation
    } = req.body

    // Load campaign if provided
    let campaign = null
    if (campaign_id) {
      campaign = await campaignRepo.findById(campaign_id, req.userId)
    }

    // Build dummy contact
    const contact = {
      id:        'sim-contact',
      phone:     '+919876543210',
      variables: { name: contact_name || 'Rajesh Bhai' },
    }

    // Try to load a real contact if campaign exists
    if (campaign_id && campaign) {
      try {
        const realContacts = await contactRepo.getPending(campaign_id, 1)
        if (realContacts?.[0]) {
          contact.id        = realContacts[0].id
          contact.variables = realContacts[0].variables || contact.variables
          contact.phone     = realContacts[0].phone
        }
      } catch (e) { /* use dummy */ }
    }

    const lang         = language || campaign?.language_priority || 'en'
    const systemPrompt = buildSimSystemPrompt(campaign, contact, lang, custom_script, custom_persona)
    const greeting     = buildSimGreeting(campaign, contact, lang, custom_script)
    const sessionId    = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    const session = {
      sessionId,
      campaign,
      contact,
      lang,
      systemPrompt,
      custom_script,
      transcript:   [{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }],
      startTime:    Date.now(),
      status:       'active',
      collectedData: {},
    }

    simSessions.set(sessionId, session)
    setTimeout(() => simSessions.delete(sessionId), 30 * 60 * 1000)

    console.log(`[Simulator] 🧪 Session: ${sessionId} | Lang: ${lang} | Script: ${custom_script ? 'custom' : 'campaign'}`)

    res.json({
      session_id:    sessionId,
      campaign_name: campaign?.name || 'Custom Simulation',
      contact,
      language:      lang,
      greeting,
      transcript:    session.transcript,
    })
  } catch (err) { next(err) }
})

// ── POST /simulate/message ────────────────────────────────────
router.post('/message', async (req, res, next) => {
  try {
    const { session_id, message } = req.body
    if (!session_id || !message) return res.status(400).json({ error: 'session_id and message required' })

    const session = simSessions.get(session_id)
    if (!session) return res.status(404).json({ error: 'Session expired. Start a new simulation.' })
    if (session.status !== 'active') return res.status(400).json({ error: 'Session already ended' })

    session.transcript.push({ role: 'user', content: message, timestamp: new Date().toISOString() })

    const history = session.transcript.slice(0, -1).map(t => ({ role: t.role, content: t.content }))
    const aiResult = await getAIResponse(session.systemPrompt, history, message)

    const aiEntry = {
      role:      'assistant',
      content:   aiResult.text,
      action:    aiResult.action,
      timestamp: new Date().toISOString(),
    }
    session.transcript.push(aiEntry)

    if (aiResult.collected_data) {
      session.collectedData = { ...session.collectedData, ...aiResult.collected_data }
    }
    if (aiResult.detected_language) session.lang = aiResult.detected_language
    if (['end_call', 'transfer', 'dnc'].includes(aiResult.action)) {
      session.status = 'ended'
    }

    console.log(`[Simulator] 💬 ${session_id} | "${message.slice(0,30)}" → "${aiResult.text.slice(0,30)}" | ${aiResult.action}`)

    res.json({
      response:          aiResult.text,
      action:            aiResult.action,
      detected_language: aiResult.detected_language || session.lang,
      collected_data:    session.collectedData,
      session_status:    session.status,
      transcript:        session.transcript,
    })
  } catch (err) { next(err) }
})

// ── POST /simulate/end ────────────────────────────────────────
router.post('/end', async (req, res, next) => {
  try {
    const { session_id, outcome } = req.body
    const session = simSessions.get(session_id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    session.status = 'ended'
    const durationSec = Math.round((Date.now() - session.startTime) / 1000)

    // Save to call_logs if real contact
    if (session.contact.id !== 'sim-contact') {
      try {
        await callRepo.create(session.contact.id, session.campaign?.id, session.sessionId)
        await callRepo.update(session.sessionId, {
          outcome:           outcome || 'completed',
          duration_sec:      durationSec,
          language_detected: session.lang,
          transcript:        JSON.stringify(session.transcript),
          collected_data:    JSON.stringify(session.collectedData),
          ended_at:          new Date().toISOString(),
        })
      } catch (e) { console.warn('[Simulator] Could not save call log:', e.message) }
    }

    simSessions.delete(session_id)
    res.json({
      message:        'Simulation ended',
      duration_sec:   durationSec,
      total_turns:    session.transcript.length,
      outcome:        outcome || 'completed',
      collected_data: session.collectedData,
      transcript:     session.transcript,
    })
  } catch (err) { next(err) }
})

module.exports = router
