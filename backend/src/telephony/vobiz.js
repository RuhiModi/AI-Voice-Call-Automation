const axios = require('axios')

const vobiz = axios.create({
  baseURL: process.env.VOBIZ_API_URL || 'https://api.vobiz.in/v1',
  headers: {
    'X-API-Key': process.env.VOBIZ_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

/**
 * Make an outbound call via Vobiz.
 * Vobiz will call the recipient, and when answered,
 * open a WebSocket to our server for audio streaming.
 */
async function makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl) {
  try {
    const response = await vobiz.post('/calls/outbound', {
      from: fromNumber,
      to: toNumber,
      // WebSocket URL — Vobiz streams audio here
      websocket_url: `wss://${serverUrl}/ws/call/${sessionId}`,
      // Webhook for call events (answered, busy, no_answer, etc.)
      webhook_url: `https://${serverUrl}/webhooks/vobiz`,
      record: true,
      language: 'gu-IN',
      timeout: 30,           // Ring for 30 seconds before giving up
      custom_data: { session_id: sessionId },
    })

    console.log(`[Vobiz] Outbound call initiated to ${toNumber}, session: ${sessionId}`)
    return response.data
  } catch (err) {
    console.error('[Vobiz] makeOutboundCall error:', err.response?.data || err.message)
    throw err
  }
}

/**
 * Transfer an ongoing call to a different number (human agent).
 */
async function transferCall(sessionId, targetNumber) {
  try {
    const response = await vobiz.post(`/calls/${sessionId}/transfer`, {
      to: targetNumber,
      type: 'blind',  // Blind transfer — no consultation
    })
    console.log(`[Vobiz] Call ${sessionId} transferred to ${targetNumber}`)
    return response.data
  } catch (err) {
    console.error('[Vobiz] transferCall error:', err.response?.data || err.message)
    throw err
  }
}

/**
 * Hang up an ongoing call.
 */
async function hangupCall(sessionId) {
  try {
    await vobiz.post(`/calls/${sessionId}/hangup`)
    console.log(`[Vobiz] Call ${sessionId} hung up`)
  } catch (err) {
    console.error('[Vobiz] hangupCall error:', err.response?.data || err.message)
  }
}

module.exports = { makeOutboundCall, transferCall, hangupCall }

