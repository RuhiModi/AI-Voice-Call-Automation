// src/call-engine/tts/index.js
// 🔥 TTS ROUTER — reads TTS_PROVIDER from config.
// session.js only imports streamTTSToSocket() from here.
// Switch providers via .env: TTS_PROVIDER=sarvam or TTS_PROVIDER=google
const config = require('../../config')
const { sarvamTTS }  = require('./sarvam')
const { googleTTS }  = require('./google')

/**
 * Convert text to audio and stream to WebSocket.
 * Splits into sentences for fast first-byte delivery.
 * User hears first sentence in ~300ms instead of waiting for full response.
 *
 * @param {string}    text  - Text to speak
 * @param {string}    lang  - 'gu' | 'hi' | 'en'
 * @param {WebSocket} ws    - Active WebSocket connection
 */
async function streamTTSToSocket(text, lang, ws) {
  if (!text || !ws || ws.readyState !== 1) return

  // Split into sentences for streaming — faster perceived latency
  const sentences = text
    .split(/(?<=[।!?.।]+)\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  for (const sentence of sentences) {
    if (ws.readyState !== 1) break  // Socket closed mid-stream

    try {
      const audio = config.ttsProvider === 'sarvam'
        ? await sarvamTTS(sentence, lang)
        : await googleTTS(sentence, lang)

      if (ws.readyState === 1) ws.send(audio)

    } catch (err) {
      console.error(`[TTS] Primary (${config.ttsProvider}) failed: ${err.message} — trying fallback`)
      // Auto-fallback to other provider
      try {
        const audio = config.ttsProvider === 'sarvam'
          ? await googleTTS(sentence, lang)
          : await sarvamTTS(sentence, lang)
        if (ws.readyState === 1) ws.send(audio)
      } catch (fallbackErr) {
        console.error('[TTS] Fallback also failed:', fallbackErr.message)
        // Skip sentence — better than crashing the call
      }
    }
  }
}

module.exports = { streamTTSToSocket }

