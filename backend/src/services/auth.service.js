// src/routes/webhooks.routes.js
// Receives real-time events from Vobiz and Exotel.
// These are NOT authenticated with JWT — they come from telephony providers.
const express        = require('express')
const { activeSessions } = require('../call-engine/session')
const { getStreamXML }   = require('../telephony/exotel')
const callRepo           = require('../repositories/call.repo')

const router = express.Router()

// ── VOBIZ WEBHOOK ─────────────────────────────────────────────
// Vobiz fires this for: call.initiated, call.answered, call.ended,
// call.no_answer, call.busy, call.failed
router.post('/vobiz', async (req, res, next) => {
  const { event, session_id, status, recording_url, custom_data } = req.body
  const sessionId = session_id || custom_data?.session_id

  console.log(`[Vobiz] event=${event} session=${sessionId} status=${status}`)

  try {
    switch (event) {
      case 'call.initiated':
      case 'call.answered':
        // WebSocket will connect automatically — nothing to do here
        break

      case 'call.no_answer':
        await _handleCallEnd(sessionId, 'no_answer')
        break

      case 'call.busy':
        await _handleCallEnd(sessionId, 'busy')
        break

      case 'call.failed':
        await _handleCallEnd(sessionId, 'failed')
        break

      case 'call.ended': {
        if (recording_url && sessionId) {
          await callRepo.update(sessionId, { recording_url })
        }
        const session = activeSessions.get(sessionId)
        if (session) await session.endCall('completed')
        break
      }

      default:
        console.log(`[Vobiz] Unhandled event: ${event}`)
    }

    res.json({ status: 'ok' })
  } catch (err) { next(err) }
})

// ── EXOTEL — STREAM CONNECT ───────────────────────────────────
// Called when Exotel answers a call — returns ExoML to stream audio
router.post('/exotel/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const serverUrl = process.env.SERVER_URL || 'localhost:3000'
  console.log(`[Exotel] Stream connect: ${sessionId}`)
  res.set('Content-Type', 'text/xml')
  res.send(getStreamXML(sessionId, serverUrl))
})

// ── EXOTEL — STATUS EVENTS ────────────────────────────────────
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

// ── Helper ────────────────────────────────────────────────────
async function _handleCallEnd(sessionId, outcome) {
  if (!sessionId) return
  const session = activeSessions.get(sessionId)
  if (session) {
    await session.endCall(outcome)
    return
  }
  // Session not found — call never connected, update DB directly
  try {
    await callRepo.update(sessionId, { outcome, ended_at: new Date().toISOString() })
  } catch {
    console.log(`[Webhook] No call log for session ${sessionId}`)
  }
}

module.exports = router

