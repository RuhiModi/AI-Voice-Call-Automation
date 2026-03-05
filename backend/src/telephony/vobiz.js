// src/telephony/vobiz.js
// Vobiz Integration — REST API + SIP Trunk
// Auth: X-Auth-ID + X-Auth-Token headers for REST API
// Calls: Made via REST API with SIP trunk credentials

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
 * Make outbound call via Vobiz REST API
 * Uses XML Application (answer_url) for call flow
 */
async function makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl) {
  try {
    const authId = process.env.VOBIZ_AUTH_ID
    const appId  = process.env.VOBIZ_APP_ID

    const vobiz = getClient()

    // Make call using XML application
    const response = await vobiz.post('/Call/', {
      from:        fromNumber,
      to:          toNumber,
      app_id:      appId,
      caller_name: sessionId,  // Pass session_id — comes back in webhook
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
 * Tells Vobiz to stream bidirectional audio to our WebSocket
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
 * Hang up an active call
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
 * Transfer call to human agent
 */
async function transferCall(callUuid, targetNumber) {
  try {
    const vobiz    = getClient()
    const response = await vobiz.post(`/Call/${callUuid}/`, {
      action:   'transfer',
      legs:     'aleg',
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
 * Get account balance
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

module.exports = { makeOutboundCall, getAnswerXML, hangupCall, transferCall, getBalance }
