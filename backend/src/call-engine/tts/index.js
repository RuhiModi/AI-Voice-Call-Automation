const config     = require('../../config')
const { sarvamTTS } = require('./sarvam')
const { googleTTS } = require('./google')

async function streamTTSToSocket(text, lang, ws) {
  if (!text || !ws || ws.readyState !== 1) return

  // Split on sentence boundaries — works for Gujarati, Hindi, English
  const sentences = text
    .split(/(?<=[.!?।\n])\s+|(?<=[.!?।])\s*(?=[A-Zઁ-૿ા-હ])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // If no splits happened, send as one chunk
  const chunks = sentences.length > 0 ? sentences : [text]

  console.log(`[TTS] Sending ${chunks.length} chunk(s) for: "${text.substring(0,50)}"`)

  for (const chunk of chunks) {
    if (!ws || ws.readyState !== 1) break

    try {
      const audio = await _getTTS(chunk, lang)
      if (!audio || audio.length === 0) {
        console.error('[TTS] Empty audio returned — skipping chunk')
        continue
      }
      console.log(`[TTS] ✅ Sending ${audio.length} bytes for: "${chunk.substring(0,30)}"`)
      ws.send(audio)
      // Small gap between sentences for natural flow
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      console.error(`[TTS] Failed for chunk "${chunk.substring(0,30)}": ${err.message}`)
    }
  }
}

async function _getTTS(text, lang) {
  // Try primary
  try {
    return await sarvamTTS(text, lang)
  } catch (err) {
    console.error(`[TTS] Sarvam failed: ${err.message} | ${JSON.stringify(err.response?.data)}`)
  }
  // No Google fallback — just throw
  throw new Error('TTS failed — check SARVAM_API_KEY and voice config')
}

module.exports = { streamTTSToSocket }
