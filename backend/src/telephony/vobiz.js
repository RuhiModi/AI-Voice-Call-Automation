// src/telephony/vobiz.js
// Vobiz API — correct format from official docs
// Base URL: https://api.vobiz.ai/api/v1/Account/{AUTH_ID}/
// Auth: X-Auth-ID and X-Auth-Token headers

const axios = require('axios')

function getClient() {
  const authId    = process.env.VOBIZ_AUTH_ID
  const authToken = process.env.VOBIZ_AUTH_TOKEN

  if (!authId || !authToken) {
    throw new Error('VOBIZ_AUTH_ID and VOBIZ_AUTH_TOKEN required in environment variables')
  }

  return axios.create({
    baseURL: `https://api.vobiz.ai/api/v1/Account/${authId}`,
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
 * When call is answered, Vobiz hits our answer_url
 * which returns XML with WebSocket URL for audio streaming.
 */
async function makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl) {
  try {
    const vobiz    = getClient()
    const response = await vobiz.post('/Call/', {
      from:        fromNumber,
      to:          toNumber,
      // When answered — Vobiz hits this URL and gets XML with WebSocket
      answer_url:  `https://${serverUrl}/webhooks/vobiz/answer`,
      // Call status events (answered, busy, no_answer, completed)
      status_callback_url: `https://${serverUrl}/webhooks/vobiz`,
      ring_timeout: 30,
      // Pass session_id back via custom_data — webhook reads it from here
      custom_data: { session_id: sessionId },
    })
    console.log(`[Vobiz] ✅ Call initiated → ${toNumber} | session: ${sessionId}`)
    return response.data
  } catch (err) {
    console.error('[Vobiz] makeOutboundCall error:', err.response?.data || err.message)
    throw err
  }
}

/**
 * Get XML response for answered call — tells Vobiz to stream audio to our WebSocket
 * Vobiz hits our answer_url and we return this XML
 */
function getAnswerXML(sessionId, serverUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream streamTimeout="86400" keepCallAlive="true" bidirectional="true" contentType="audio/x-mulaw;rate=8000">
    wss://${serverUrl}/ws/call/${sessionId}
  </Stream>
</Response>`
}

/**
 * Transfer an ongoing call to a human agent
 */
async function transferCall(callUuid, targetNumber) {
  try {
    const vobiz    = getClient()
    const response = await vobiz.post(`/Call/${callUuid}/`, {
      action: 'transfer',
      legs:   'aleg',
      aleg_url: `https://api.vobiz.ai/v1/transfer?to=${targetNumber}`,
    })
    console.log(`[Vobiz] ✅ Call ${callUuid} transferred to ${targetNumber}`)
    return response.data
  } catch (err) {
    console.error('[Vobiz] transferCall error:', err.response?.data || err.message)
    throw err
  }
}

/**
 * Hang up an ongoing call
 */
async function hangupCall(callUuid) {
  try {
    const vobiz = getClient()
    await vobiz.delete(`/Call/${callUuid}/`)
    console.log(`[Vobiz] ✅ Call ${callUuid} hung up`)
  } catch (err) {
    console.error('[Vobiz] hangupCall error:', err.response?.data || err.message)
  }
}

/**
 * Get account balance
 */
async function getBalance() {
  try {
    const authId    = process.env.VOBIZ_AUTH_ID
    const authToken = process.env.VOBIZ_AUTH_TOKEN
    const response  = await axios.get(
      `https://api.vobiz.ai/api/v1/Account/${authId}/`,
      {
        auth: {
          username: authId,
          password: authToken,
        }
      }
    )
    return response.data
  } catch (err) {
    console.error('[Vobiz] getBalance error:', err.response?.data || err.message)
    throw err
  }
}

module.exports = { makeOutboundCall, getAnswerXML, transferCall, hangupCall, getBalance }
