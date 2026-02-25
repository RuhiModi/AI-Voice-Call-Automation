// src/call-engine/tts/sarvam.js
// Sarvam AI Text-to-Speech — Bulbul v2 model.
// ₹15/10K chars vs Google's ₹12, but with MUCH better Indian voices.
// Bulbul has 25+ Indian voices — Gujarati, Hindi, English with natural accents.
const axios  = require('axios')
const config = require('../../config')

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech'

// Sarvam voice configs per language
// Full voice list: https://docs.sarvam.ai/api-reference/text-to-speech
const SARVAM_VOICES = {
  gu: {
    target_language_code: 'gu-IN',
    speaker:              config.ttsVoiceGu || 'kavya',   // Natural Gujarati female
    model:                'bulbul:v2',
  },
  hi: {
    target_language_code: 'hi-IN',
    speaker:              config.ttsVoiceHi || 'neha',    // Natural Hindi female
    model:                'bulbul:v2',
  },
  en: {
    target_language_code: 'en-IN',
    speaker:              config.ttsVoiceEn || 'amelia',  // Indian English female
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

  const response = await axios.post(SARVAM_TTS_URL, {
    inputs:               [text.substring(0, 500)],
    target_language_code: voiceConfig.target_language_code,
    speaker:              voiceConfig.speaker,
    model:                voiceConfig.model,
    // Telephony optimized settings
    pitch:          0,
    pace:           0.9,    // Slightly slower for clarity on phone
    loudness:       1.2,
    speech_sample_rate: 8000,  // Match telephony sample rate
    enable_preprocessing: true, // Better handling of numbers, dates
    eng_interpolation_wt: 0.1, // Low English mixing for pure Indian voices
  }, {
    headers: {
      'api-subscription-key': config.sarvamApiKey,
      'Content-Type': 'application/json',
    },
    timeout: 8000,
  })

  // Sarvam returns base64-encoded audio
  const base64Audio = response.data?.audios?.[0]
  if (!base64Audio) throw new Error('Sarvam TTS returned no audio')

  const audioBuffer = Buffer.from(base64Audio, 'base64')

  if (_cache.size < MAX_CACHE) _cache.set(cacheKey, audioBuffer)

  return audioBuffer
}

module.exports = { sarvamTTS, SARVAM_VOICES }

