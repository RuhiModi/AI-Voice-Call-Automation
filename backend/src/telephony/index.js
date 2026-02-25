// src/telephony/index.js
// 🔥 TELEPHONY ROUTER — switches between Vobiz and Exotel via TELEPHONY_PROVIDER env.
// session.js imports from here — never directly from vobiz.js or exotel.js.
const config = require('../config')
const vobiz  = require('./vobiz')
const exotel = require('./exotel')

function _provider() {
  return config.telephonyProvider === 'exotel' ? exotel : vobiz
}

async function makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl) {
  return _provider().makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl)
}

async function transferCall(sessionId, targetNumber) {
  if (config.telephonyProvider === 'exotel') {
    console.warn('[Telephony] Exotel does not support blind transfer — skipping')
    return
  }
  return vobiz.transferCall(sessionId, targetNumber)
}

async function hangupCall(sessionId) {
  if (config.telephonyProvider === 'exotel') return // Exotel hangup not needed
  return vobiz.hangupCall(sessionId)
}

module.exports = { makeOutboundCall, transferCall, hangupCall }

