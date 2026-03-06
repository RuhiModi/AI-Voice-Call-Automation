// src/telephony/vobiz.js
const axios = require('axios')

function getClient() {
  const authId    = process.env.VOBIZ_AUTH_ID
  const authToken = process.env.VOBIZ_AUTH_TOKEN

  if (!authId || !authToken) throw new Error('VOBIZ_AUTH_ID and VOBIZ_AUTH_TOKEN required')

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

async function makeOutboundCall(fromNumber, toNumber, sessionId) {
  try {
    const vobiz     = getClient()
    const serverUrl = process.env.SERVER_URL || 'ai-voice-call-automation.onrender.com'

    // Clean phone number — must be E.164 format e.g. +919876543210
    const cleanTo = _cleanPhone(toNumber)
    if (!cleanTo) throw new Error(`Invalid phone number: ${toNumber}`)

    const answerUrl = `https://${serverUrl}/webhooks/vobiz/answer`
    const hangupUrl = `https://${serverUrl}/webhooks/vobiz/hangup`

    console.log(`[Vobiz] Calling ${cleanTo} | answer_url: ${answerUrl}`)

    const response = await vobiz.post('/Call/', {
      from:        fromNumber,
      to:          cleanTo,
      answer_url:  answerUrl,
      hangup_url:  hangupUrl,
      caller_name: sessionId,
    })

    console.log(`[Vobiz] ✅ Call initiated → ${cleanTo} | session: ${sessionId}`)
    return response.data

  } catch (err) {
    console.error('[Vobiz] makeOutboundCall error:', err.response?.data || err.message)
    throw err
  }
}

// Clean and validate phone number → E.164 format (+91XXXXXXXXXX)
function _cleanPhone(raw) {
  if (!raw) return null
  let phone = String(raw).replace(/[\s\-\.\(\)]/g, '')
  if (phone.startsWith('+91')) phone = phone.slice(3)
  else if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2)
  else if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1)
  if (!/^[6-9]\d{9}$/.test(phone)) return null
  return `+91${phone}`
}

function getAnswerXML(sessionId, serverUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream streamTimeout="86400" keepCallAlive="true" bidirectional="true" contentType="audio/x-mulaw;rate=8000">
    wss://${serverUrl}/ws/call/${sessionId}
  </Stream>
</Response>`
}

async function hangupCall(callUuid) {
  try {
    const vobiz = getClient()
    await vobiz.delete(`/Call/${callUuid}/`)
    console.log(`[Vobiz] ✅ Call ${callUuid} hung up`)
  } catch (err) {
    console.error('[Vobiz] hangupCall error:', err.response?.data || err.message)
  }
}

async function transferCall(callUuid, targetNumber) {
  try {
    const vobiz    = getClient()
    const response = await vobiz.post(`/Call/${callUuid}/`, {
      action:   'transfer',
      legs:     'aleg',
      aleg_url: `https://api.vobiz.ai/v1/transfer?to=${targetNumber}`,
    })
    return response.data
  } catch (err) {
    console.error('[Vobiz] transferCall error:', err.response?.data || err.message)
    throw err
  }
}

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
