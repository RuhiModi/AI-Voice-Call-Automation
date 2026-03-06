// src/call-engine/tts/sarvam.js
// Sarvam AI Text-to-Speech — Bulbul v2 model.
// ₹15/10K chars vs Google's ₹12, but with MUCH better Indian voices.
// Bulbul has 25+ Indian voices — Gujarati, Hindi, English with natural accents.
const axios  = require('axios')
const config = require('../../config')
const { wavToPcm } = require('./audioConvert')

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech'

// Sarvam voice configs per language
// Full voice list: https://docs.sarvam.ai/api-reference/text-to-speech
// Valid bulbul:v2 speakers: anushka, abhilash, manisha, vidya, arya, karun, hitesh
const SARVAM_VOICES = {
  gu: {
    target_language_code: 'gu-IN',
    speaker:              config.ttsVoiceGu || 'anushka',  // Female Gujarati
    model:                'bulbul:v2',
  },
  hi: {
    target_language_code: 'hi-IN',
    speaker:              config.ttsVoiceHi || 'anushka',  // Female Hindi
    model:                'bulbul:v2',
  },
  en: {
    target_language_code: 'en-IN',
    speaker:              config.ttsVoiceEn || 'anushka',  // Female English
    model:                'bulbul:v2',
  },
}

// Simple in-memory cache — avoid re-generating same phrases
const _cache   = new Map()
const MAX_CACHE = 200

/**
 * Convert text to PCM audio using Sarvam Bulbul v2.
 * Returns a Buffer of PCM 8kHz 16-bit mono audio.
 *
 * @param {string} text
 * @param {string} lang  - 'gu' | 'hi' | 'en'
 * @returns {Buffer}
 */
async function sarvamTTS(text, lang = 'gu') {
  if (!config.sarvamApiKey) throw new Error('SARVAM_API_KEY not set in .env')

  const cacheKey = `${lang}:${text}`
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)

  const voiceConfig = SARVAM_VOICES[lang] || SARVAM_VOICES.gu

  console.log(`[Sarvam TTS] Calling API | lang: ${lang} | text: "${text.substring(0,40)}" | key: ${config.sarvamApiKey ? config.sarvamApiKey.substring(0,8)+'...' : 'MISSING'}`)
  const response = await axios.post(SARVAM_TTS_URL, {
    inputs:               [text.substring(0, 500)],
    target_language_code: voiceConfig.target_language_code,
    speaker:              voiceConfig.speaker,
    model:                voiceConfig.model,
    pitch:                0,
    pace:                 1.0,
    loudness:             1.5,
    speech_sample_rate:   8000,
    enable_preprocessing: true,
  }, {
    headers: {
      'api-subscription-key': config.sarvamApiKey,
      'Authorization':        `Bearer ${config.sarvamApiKey}`,
      'Content-Type':         'application/json',
    },
    timeout: 10000,
  })

  // Sarvam returns base64-encoded audio
  const base64Audio = response.data?.audios?.[0]
  console.log(`[Sarvam TTS] Response received | has audio: ${!!base64Audio} | data keys: ${Object.keys(response.data||{}).join(',')}`)
  if (!base64Audio) throw new Error('Sarvam TTS returned no audio')

  const wavBuffer = Buffer.from(base64Audio, 'base64')
  const pcmBuffer = wavToPcm(wavBuffer)  // Strip WAV header → raw PCM16 (x-l16)

  console.log(`[Sarvam TTS] wav:${wavBuffer.length}B → pcm16:${pcmBuffer.length}B`)

  if (_cache.size < MAX_CACHE) _cache.set(cacheKey, pcmBuffer)

  return pcmBuffer
}

module.exports = { sarvamTTS, SARVAM_VOICES }
