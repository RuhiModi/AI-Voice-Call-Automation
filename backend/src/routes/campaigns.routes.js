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
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } })

// GET /campaigns
router.get('/', auth, async (req, res, next) => {
  try {
    const campaigns = await campaignService.list(req.userId)
    res.json({ campaigns })
  } catch (err) { next(err) }
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

// POST /campaigns/:id/contacts  (CSV upload)
router.post('/:id/contacts', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const result = await campaignService.importContacts(req.params.id, req.userId, req.file.path)
    res.json({ message: `${result.count} contacts imported`, ...result })
  } catch (err) {
    if (req.file) require('fs').unlink(req.file.path, () => {})
    next(err)
  }
})

// POST /campaigns/:id/script/pdf
router.post('/:id/script/pdf', auth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const text = await campaignService.extractFromPdf(req.file.path)
    res.json({ text })
  } catch (err) {
    if (req.file) require('fs').unlink(req.file.path, () => {})
    next(err)
  }
})

// POST /campaigns/:id/script/url
router.post('/:id/script/url', auth, async (req, res, next) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'URL is required' })
    const text = await campaignService.extractFromUrl(url)
    res.json({ text })
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

