// src/telephony/vobiz.js
// Vobiz API — based on official docs
// Auth: X-Auth-ID and X-Auth-Token headers
// Base: https://api.vobiz.ai/api/v1/Account/{AUTH_ID}/

const axios = require('axios')

function getClient() {
  const authId    = process.env.VOBIZ_AUTH_ID
  const authToken = process.env.VOBIZ_AUTH_TOKEN

  if (!authId || !authToken) {
    throw new Error('VOBIZ_AUTH_ID and VOBIZ_AUTH_TOKEN required')
  }

  return axios.create({
    baseURL: `https://api.vobiz.ai/api/v1/Account/${authId}`,
    headers: {
      'X-Auth-ID':    authId,
      'X-Auth-Token': authToken,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  })
}

/**
 * Make an outbound call via Vobiz
 * Vobiz hits answer_url when call connects
 * We return XML to stream audio via WebSocket
 */
async function makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl) {
  try {
    const authId = process.env.VOBIZ_AUTH_ID
    const appId  = process.env.VOBIZ_APP_ID

    const vobiz    = getClient()
    const response = await vobiz.post('/Call/', {
      from:       fromNumber,
      to:         toNumber,
      answer_url: `https://${serverUrl}/webhooks/vobiz/answer`,
      hangup_url: `https://${serverUrl}/webhooks/vobiz/hangup`,
      // Pass session_id so we can match webhook back to our session
      caller_name: sessionId,
    })

    console.log(`[Vobiz] ✅ Call initiated → ${toNumber} | session: ${sessionId}`)
    console.log(`[Vobiz] Response:`, JSON.stringify(response.data))
    return response.data

  } catch (err) {
    console.error('[Vobiz] makeOutboundCall error:', err.response?.data || err.message)
    throw err
  }
}

/**
 * XML response for answered call
 * Vobiz hits answer_url → we return this XML
 * This tells Vobiz to stream audio to our WebSocket
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
 * Hang up a call
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
 * Get account info and balance
 */
async function getBalance() {
  try {
    const vobiz    = getClient()
    const response = await vobiz.get('/')
    return response.data
  } catch (err) {
    console.error('[Vobiz] getBalance error:', err.response?.data || err.message)
    throw err
  }
}

module.exports = { makeOutboundCall, getAnswerXML, hangupCall, getBalance }
