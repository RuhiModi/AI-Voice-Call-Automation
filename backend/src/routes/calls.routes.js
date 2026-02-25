// src/routes/calls.routes.js
// Individual call management — get logs, replay transcripts, etc.
const express  = require('express')
const auth     = require('../middleware/auth')
const callRepo = require('../repositories/call.repo')

const router = express.Router()

// GET /calls/:sessionId — Get a single call's full transcript + data
router.get('/:sessionId', auth, async (req, res, next) => {
  try {
    const call = await callRepo.findBySession(req.params.sessionId)
    if (!call) return res.status(404).json({ error: 'Call not found' })
    res.json({ call })
  } catch (err) { next(err) }
})

module.exports = router

