const axios = require('axios')

/**
 * Exotel backup telephony.
 * Uses ExoML (XML) to stream audio to our WebSocket server.
 */

function getExotelClient() {
  return axios.create({
    baseURL: `https://${process.env.EXOTEL_SID}:${process.env.EXOTEL_TOKEN}@${process.env.EXOTEL_SUBDOMAIN}/v1/Accounts/${process.env.EXOTEL_SID}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  })
}

/**
 * Make outbound call via Exotel.
 * Exotel calls recipient then calls our webhook which returns ExoML.
 */
async function makeOutboundCall(fromNumber, toNumber, sessionId, serverUrl) {
  try {
    const client = getExotelClient()
    const response = await client.post('/Calls/connect.json', new URLSearchParams({
      From: toNumber,
      To: fromNumber,   // Exotel From/To is reversed
      CallerId: fromNumber,
      Url: `https://${serverUrl}/webhooks/exotel/stream/${sessionId}`,
      StatusCallback: `https://${serverUrl}/webhooks/exotel`,
      TimeLimit: 600,   // Max 10 minute calls
      TimeOut: 30,
    }))

    console.log(`[Exotel] Outbound call initiated to ${toNumber}, session: ${sessionId}`)
    return response.data
  } catch (err) {
    console.error('[Exotel] makeOutboundCall error:', err.response?.data || err.message)
    throw err
  }
}

/**
 * Returns ExoML XML to connect the call to our WebSocket stream.
 * Called by Exotel webhook when call is answered.
 */
function getStreamXML(sessionId, serverUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${serverUrl}/ws/call/${sessionId}" />
  </Connect>
</Response>`
}

module.exports = { makeOutboundCall, getStreamXML }

