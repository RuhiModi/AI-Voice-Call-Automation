// src/routes/webhooks.routes.js
// Vobiz sends form-urlencoded data (not JSON!)
// Fields: CallSID, From, To, Direction, CallStatus, Duration, HangupCause

const express            = require('express')
const { activeSessions } = require('../call-engine/session')
const { getAnswerXML }   = require('../telephony/vobiz')
const callRepo           = require('../repositories/call.repo')

const router = express.Router()

// ── VOBIZ ANSWER URL ──────────────────────────────────────────
// Vobiz hits this when call is answered
// Body contains: CallSID, From, To, Direction, CallStatus
// caller_name contains our session_id (we set it when making call)
router.post('/vobiz/answer', (req, res) => {
  // Vobiz sends form-urlencoded
  const callSid   = req.body?.CallSID   || req.body?.call_uuid
  const callerName = req.body?.CallerName || req.body?.caller_name
  const from      = req.body?.From       || req.body?.from
  const to        = req.body?.To         || req.body?.to

  // session_id was passed as caller_name when we made the call
  const sessionId = callerName || callSid

  const serverUrl = (process.env.SERVER_URL || req.headers.host || 'localhost:3000')
    .replace(/^https?:\/\//, '')

  console.log(`[Vobiz] 📞 Answer URL hit | CallSID: ${callSid} | Session: ${sessionId} | From: ${from} | To: ${to}`)
  console.log(`[Vobiz] Full body:`, JSON.stringify(req.body))
  console.log(`[Vobiz] Session in memory: ${require('../call-engine/session').activeSessions.has(sessionId)}`)
  console.log(`[Vobiz] Total active sessions: ${require('../call-engine/session').activeSessions.size}`)

  res.set('Content-Type', 'text/xml')
  res.send(getAnswerXML(sessionId, serverUrl))
})

// ── VOBIZ HANGUP URL ──────────────────────────────────────────
// Vobiz hits this when call ends
// Body: CallSID, CallStatus=completed, Duration, HangupCause
router.post('/vobiz/hangup', async (req, res, next) => {
  try {
    const callSid    = req.body?.CallSID    || req.body?.call_uuid
    const status     = req.body?.CallStatus || req.body?.call_status
    const duration   = req.body?.Duration   || req.body?.duration
    const hangupCause = req.body?.HangupCause || req.body?.hangup_cause
    const callerName  = req.body?.CallerName  || req.body?.caller_name
    const sessionId   = callerName || callSid

    console.log(`[Vobiz] 📴 Hangup | CallSID: ${callSid} | Status: ${status} | Duration: ${duration}s | Cause: ${hangupCause}`)

    const outcome = _mapHangupCause(status, hangupCause)
    await _handleCallEnd(sessionId, outcome)

    res.json({ status: 'ok' })
  } catch (err) { next(err) }
})

// ── VOBIZ GENERAL WEBHOOK ─────────────────────────────────────
// Fallback for any other Vobiz events
router.post('/vobiz', async (req, res, next) => {
  try {
    console.log(`[Vobiz] Webhook received:`, JSON.stringify(req.body))
    res.json({ status: 'ok' })
  } catch (err) { next(err) }
})

// ── EXOTEL ROUTES (keeping for fallback) ─────────────────────
router.post('/exotel/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const serverUrl = process.env.SERVER_URL || 'localhost:3000'
  console.log(`[Exotel] Stream connect: ${sessionId}`)
  res.set('Content-Type', 'text/xml')
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream bidirectional="true" streamTimeout="86400">
    wss://${serverUrl}/ws/call/${sessionId}
  </Stream>
</Response>`)
})

router.post('/exotel', async (req, res, next) => {
  const { CallSid, Status, RecordingUrl } = req.body
  console.log(`[Exotel] CallSid=${CallSid} Status=${Status}`)
  try {
    switch (Status) {
      case 'completed': {
        if (RecordingUrl) await callRepo.update(CallSid, { recording_url: RecordingUrl })
        const session = activeSessions.get(CallSid)
        if (session) await session.endCall('completed')
        break
      }
      case 'no-answer': await _handleCallEnd(CallSid, 'no_answer'); break
      case 'busy':      await _handleCallEnd(CallSid, 'busy');      break
      case 'failed':    await _handleCallEnd(CallSid, 'failed');    break
    }
    res.json({ status: 'ok' })
  } catch (err) { next(err) }
})

// ── Helpers ───────────────────────────────────────────────────
function _mapHangupCause(status, cause) {
  if (status === 'completed')  return 'completed'
  if (status === 'no-answer')  return 'no_answer'
  if (status === 'busy')       return 'busy'
  if (status === 'failed')     return 'failed'
  if (cause  === 'NORMAL_CLEARING') return 'completed'
  if (cause  === 'NO_ANSWER')       return 'no_answer'
  if (cause  === 'USER_BUSY')       return 'busy'
  return 'failed'
}

async function _handleCallEnd(sessionId, outcome) {
  if (!sessionId) return
  const session = activeSessions.get(sessionId)
  if (session) {
    await session.endCall(outcome)
    return
  }
  try {
    await callRepo.update(sessionId, { outcome, ended_at: new Date().toISOString() })
  } catch {
    console.log(`[Webhook] No call log for session ${sessionId}`)
  }
}

module.exports = router
