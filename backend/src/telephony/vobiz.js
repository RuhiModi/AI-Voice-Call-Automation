// src/telephony/vobiz.js
const axios = require('axios')

function getClient() {
  const authId    = process.env.VOBIZ_AUTH_ID
  const authToken = process.env.VOBIZ_AUTH_TOKEN

  if (!authId || !authToken) {
    throw new Error('VOBIZ_AUTH_ID and VOBIZ_AUTH_TOKEN are required in environment variables')
  }

  return axios.create({
    baseURL: process.env.VOBIZ_API_URL || 'https://api.vobiz.in/v1',
    auth: {
      username: authId,
      password: authToken,
    },
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  })
}

/**
 * Make an outbound call via Vobiz.
 * Vobiz calls the recipient, then opens WebSocket to our server for audio.
 */
async function makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl) {
  try {
    const vobiz    = getClient()
    const response = await vobiz.post('/calls/outbound', {
      from:          fromNumber,
      to:            toNumber,
      websocket_url: `wss://${serverUrl}/ws/call/${sessionId}`,
      webhook_url:   `https://${serverUrl}/webhooks/vobiz`,
      record:        false,
      timeout:       30,
      custom_data:   { session_id: sessionId },
    })
    console.log(`[Vobiz] ✅ Call initiated → ${toNumber} | session: ${sessionId}`)
    return response.data
  } catch (err) {
    console.error('[Vobiz] makeOutboundCall error:', err.response?.data || err.message)
    throw err
  }
}

/**
 * Transfer an ongoing call to a human agent.
 */
async function transferCall(sessionId, targetNumber) {
  try {
    const vobiz    = getClient()
    const response = await vobiz.post(`/calls/${sessionId}/transfer`, {
      to:   targetNumber,
      type: 'blind',
    })
    console.log(`[Vobiz] ✅ Call ${sessionId} transferred to ${targetNumber}`)
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
    const vobiz = getClient()
    await vobiz.post(`/calls/${sessionId}/hangup`)
    console.log(`[Vobiz] ✅ Call ${sessionId} hung up`)
  } catch (err) {
    console.error('[Vobiz] hangupCall error:', err.response?.data || err.message)
  }
}

/**
 * Get account balance — useful to check remaining credits
 */
async function getBalance() {
  try {
    const vobiz    = getClient()
    const response = await vobiz.get('/account/balance')
    return response.data
  } catch (err) {
    console.error('[Vobiz] getBalance error:', err.response?.data || err.message)
    throw err
  }
}

module.exports = { makeOutboundCall, transferCall, hangupCall, getBalance }
