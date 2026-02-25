// src/call-engine/stt/sarvam.js
// Sarvam AI Speech-to-Text — Saaras v3 model.
// ₹30/hr vs Google's ₹120/hr. Native Gujarati/Hindi support.
// Sign up at sarvam.ai → get ₹1,000 free credits.
//
// Sarvam STT API accepts audio file uploads (multipart/form-data).
// For streaming phone calls we buffer audio chunks and send every ~500ms.
const axios  = require('axios')
const config = require('../../config')

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text'

// Language code mapping: our codes → Sarvam BCP-47 codes
const LANG_MAP = {
  gu: 'gu-IN',
  hi: 'hi-IN',
  en: 'en-IN',
}

/**
 * Transcribe an audio buffer using Sarvam AI.
 * Returns { transcript, detectedLang }
 *
 * @param {Buffer} audioBuffer  - PCM 8kHz 16-bit mono audio
 * @param {string} hintLang     - 'gu' | 'hi' | 'en' (hint, not forced)
 */
async function transcribeWithSarvam(audioBuffer, hintLang = 'gu') {
  if (!config.sarvamApiKey) throw new Error('SARVAM_API_KEY not set in .env')

  const FormData = require('form-data')
  const form = new FormData()

  // Sarvam expects WAV/PCM — we send raw PCM with WAV header
  const wavBuffer = _addWavHeader(audioBuffer, 8000, 1, 16)
  form.append('file', wavBuffer, { filename: 'audio.wav', contentType: 'audio/wav' })
  form.append('model', 'saaras:v2')
  form.append('language_code', LANG_MAP[hintLang] || 'gu-IN')
  // Enable multi-language detection
  form.append('with_timestamps', 'false')

  const response = await axios.post(SARVAM_STT_URL, form, {
    headers: {
      ...form.getHeaders(),
      'api-subscription-key': config.sarvamApiKey,
    },
    timeout: 10000,
  })

  const transcript = response.data?.transcript || ''
  // Sarvam returns detected language in response
  const langCode   = response.data?.language_code || LANG_MAP[hintLang]

  // Map back to our lang codes
  let detectedLang = hintLang
  if (langCode?.startsWith('hi')) detectedLang = 'hi'
  else if (langCode?.startsWith('en')) detectedLang = 'en'
  else if (langCode?.startsWith('gu')) detectedLang = 'gu'

  return { transcript: transcript.trim(), detectedLang }
}

// ── WAV Header Helper ──────────────────────────────────────────
// Sarvam API expects WAV format — add 44-byte header to raw PCM
function _addWavHeader(pcmBuffer, sampleRate, numChannels, bitDepth) {
  const byteRate   = sampleRate * numChannels * (bitDepth / 8)
  const blockAlign = numChannels * (bitDepth / 8)
  const dataSize   = pcmBuffer.length
  const buffer     = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)         // Subchunk1Size
  buffer.writeUInt16LE(1, 20)          // PCM format
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitDepth, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  pcmBuffer.copy(buffer, 44)

  return buffer
}

module.exports = { transcribeWithSarvam }

