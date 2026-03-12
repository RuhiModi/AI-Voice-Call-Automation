// src/routes/campaigns.routes.js
// Thin HTTP layer — validates input, calls service, returns response.
// No business logic here.
const express         = require('express')
const multer          = require('multer')
const auth            = require('../middleware/auth')
const { launchRateLimiter } = require('../middleware/rateLimiter')
const campaignService = require('../services/campaign.service')
const campaignRepo    = require('../repositories/campaign.repo')
const callRepo        = require('../repositories/call.repo')
const schedulerService = require('../services/scheduler.service')

const router = express.Router()
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'application/octet-stream',  // some Excel files come as this
    ]
    const allowedExt = ['.csv', '.xlsx', '.xls', '.pdf']
    const ext = require('path').extname(file.originalname).toLowerCase()
    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV, Excel (.xlsx/.xls), and PDF files are allowed'))
    }
  }
})

// GET /campaigns
router.get('/', auth, async (req, res, next) => {
  try {
    const campaigns = await campaignService.list(req.userId)
    res.json({ campaigns })
  } catch (err) { next(err) }
})

// POST /campaigns/script/preview  ← no campaign ID needed
// Generates a script preview from text — called during campaign creation before saving
router.post('/script/preview', auth, async (req, res, next) => {
  try {
    const { text, language, campaign_type } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' })

    const Groq     = require('groq-sdk')
    const groq     = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const langName = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }[language] || 'Gujarati'

    const prompt = `You are a voice call script writer. Convert this document into a phone conversation script in ${langName}.

STRICT RULES:
- Write every prompt in ${langName} — spoken, natural, short (max 2 sentences)
- options = short phrases the caller would say in response
- Last state must have "options": []
- Return ONLY valid JSON, no explanation, no markdown fences

Document:
${text.slice(0, 3000)}

Return this exact structure:
{"flow":[{"id":"intro","prompt":"...","options":["...","..."]},{"id":"q1","prompt":"...","options":["...","..."]},{"id":"closing","prompt":"...","options":[]}]}`

    const completion = await groq.chat.completions.create({
      model:       'llama-3.1-8b-instant',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens:  2000,
    })

    const raw = completion.choices[0]?.message?.content || ''
    console.log('[Script Preview] LLM raw:', raw.slice(0, 200))

    // Try to extract JSON — handle markdown fences and extra text
    let jsonStr = raw
      .replace(/```json/g, '').replace(/```/g, '')  // strip markdown
      .replace(/^[^{]*/, '')                          // strip leading text
      .replace(/[^}]*$/, match => {                  // strip trailing text after last }
        const last = match.lastIndexOf('}')
        return last >= 0 ? match.slice(0, last + 1) : match
      })
      .trim()

    // Find outermost { }
    const start = jsonStr.indexOf('{')
    const end   = jsonStr.lastIndexOf('}')
    if (start === -1 || end === -1) {
      console.error('[Script Preview] No JSON found in:', raw)
      return res.status(500).json({ error: 'Script generation failed — try again' })
    }
    jsonStr = jsonStr.slice(start, end + 1)

    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('[Script Preview] JSON parse error:', parseErr.message, '| raw:', jsonStr.slice(0, 200))
      return res.status(500).json({ error: 'Script generation failed — try again' })
    }

    if (!parsed.flow?.length) {
      return res.status(500).json({ error: 'Empty script generated — try again' })
    }

    // Normalize
    const flow = parsed.flow.map((s, i) => ({
      id:      (s.id || `step_${i}`).toString().toLowerCase().replace(/\s+/g, '_'),
      prompt:  (s.prompt || '').trim(),
      options: Array.isArray(s.options) ? s.options.map(o => String(o).trim()).filter(Boolean) : [],
    }))

    console.log(`[Script Preview] ✅ Generated ${flow.length} states for language: ${language}`)
    res.json({ flow, state_count: flow.length, language })

  } catch (err) {
    console.error('[Script Preview] Error:', err.message)
    next(err)
  }
})

// GET /campaigns/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const data = await campaignService.get(req.params.id, req.userId)
    res.json(data)
  } catch (err) { next(err) }
})

// POST /campaigns
router.post('/', auth, async (req, res, next) => {
  try {
    const campaign = await campaignService.create(req.userId, req.body)
    console.log(`✅ Campaign created: ${campaign.name}`)
    res.status(201).json({ campaign })
  } catch (err) { next(err) }
})

// PUT /campaigns/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const campaign = await campaignService.update(req.params.id, req.userId, req.body)
    res.json({ campaign })
  } catch (err) { next(err) }
})

// GET /campaigns/:id/contacts — list contacts with pagination
router.get('/:id/contacts', auth, async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 50
    const contactRepo = require('../repositories/contact.repo')
    const result = await contactRepo.list(req.params.id, page, limit)
    res.json(result)
  } catch (err) { next(err) }
})

// POST /campaigns/:id/contacts  (CSV upload)
router.post('/:id/contacts', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const result = await campaignService.importContacts(req.params.id, req.userId, req.file.path, req.file.originalname)
    res.json({ message: `${result.count} contacts imported`, ...result })
  } catch (err) {
    if (req.file) require('fs').unlink(req.file.path, () => {})
    next(err)
  }
})

// POST /campaigns/:id/script/pdf
// Extracts PDF → LLM generates full conversation script → saved to flow_config
router.post('/:id/script/pdf', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const fs     = require('fs')
    const buffer = fs.readFileSync(req.file.path)
    try { fs.unlinkSync(req.file.path) } catch {}

    const flowConfig = await campaignService.parseCampaignScript(
      req.params.id, buffer,
      { language: req.body.language, campaignType: req.body.campaign_type }
    )

    if (!flowConfig) return res.status(500).json({ error: 'Script generation failed — try again' })

    res.json({
      message:     `Script generated — ${flowConfig.flow?.length || 0} conversation states`,
      flow:        flowConfig.flow,
      source:      flowConfig.source,
      state_count: flowConfig.flow?.length || 0,
    })
  } catch (err) {
    if (req.file) require('fs').unlink(req.file.path, () => {})
    next(err)
  }
})

// POST /campaigns/:id/script/url
// Fetches URL → LLM generates full conversation script → saved to flow_config
router.post('/:id/script/url', auth, async (req, res, next) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL is required' })

    const text = await campaignService.extractFromUrl(url)
    const flowConfig = await campaignService.parseCampaignScript(
      req.params.id, text,
      { language: req.body.language, campaignType: req.body.campaign_type }
    )

    if (!flowConfig) return res.status(500).json({ error: 'Script generation failed — try again' })

    res.json({
      message:     `Script generated — ${flowConfig.flow?.length || 0} conversation states`,
      flow:        flowConfig.flow,
      source:      flowConfig.source,
      state_count: flowConfig.flow?.length || 0,
    })
  } catch (err) { next(err) }
})

// POST /campaigns/:id/script/text
// Converts plain typed script → LLM generates conversation flow → saved to flow_config
router.post('/:id/script/text', auth, async (req, res, next) => {
  try {
    const { text, language, campaign_type } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' })

    const flowConfig = await campaignService.parseCampaignScript(
      req.params.id, text,
      { language, campaignType: campaign_type }
    )

    if (!flowConfig) return res.status(500).json({ error: 'Script generation failed — try again' })

    res.json({
      message:     `Script generated — ${flowConfig.flow?.length || 0} conversation states`,
      flow:        flowConfig.flow,
      source:      flowConfig.source,
      state_count: flowConfig.flow?.length || 0,
    })
  } catch (err) { next(err) }
})


// DELETE /campaigns/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const schedulerService = require('../services/scheduler.service')
    schedulerService.pause(req.params.id)  // Stop any active calls first
    await campaignRepo.delete(req.params.id, req.userId)
    res.json({ message: 'Campaign deleted' })
  } catch (err) { next(err) }
})

// POST /campaigns/:id/launch
router.post('/:id/launch', auth, launchRateLimiter, async (req, res, next) => {
  try {
    const campaign = await campaignRepo.findById(req.params.id, req.userId)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    if (campaign.status === 'active') return res.status(400).json({ error: 'Campaign already active' })
    if (campaign.total_contacts === 0) return res.status(400).json({ error: 'Upload contacts first' })

    await campaignRepo.updateStatus(req.params.id, 'active')
    schedulerService.launch(campaign)  // Non-blocking — starts in background

    console.log(`🚀 Campaign launched: ${campaign.name}`)
    res.json({ message: 'Campaign launched', campaign_id: req.params.id })
  } catch (err) { next(err) }
})

// POST /campaigns/:id/pause
router.post('/:id/pause', auth, async (req, res, next) => {
  try {
    const campaign = await campaignRepo.findById(req.params.id, req.userId)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    await campaignRepo.updateStatus(req.params.id, 'paused')
    schedulerService.pause(req.params.id)
    res.json({ message: 'Campaign paused' })
  } catch (err) { next(err) }
})

// GET /campaigns/:id/stats
router.get('/:id/stats', auth, async (req, res, next) => {
  try {
    const stats = await campaignRepo.getStats(req.params.id)
    res.json({ stats })
  } catch (err) { next(err) }
})

// GET /campaigns/:id/calls
router.get('/:id/calls', auth, async (req, res, next) => {
  try {
    const limit  = parseInt(req.query.limit)  || 50
    const offset = parseInt(req.query.offset) || 0
    const logs   = await callRepo.findByCampaign(req.params.id, limit, offset)
    res.json({ logs })
  } catch (err) { next(err) }
})

module.exports = router
