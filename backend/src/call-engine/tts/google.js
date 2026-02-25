// src/call-engine/tts/google.js
// Google Cloud Text-to-Speech — fallback / alternative to Sarvam.
// More expensive but has Neural2 voices for Hindi/English.
const textToSpeech = require('@google-cloud/text-to-speech')

let ttsClient
function getClient() {
  if (!ttsClient) {
    const opts = {}
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      opts.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    }
    ttsClient = new textToSpeech.TextToSpeechClient(opts)
  }
  return ttsClient
}

const GOOGLE_VOICES = {
  gu: { languageCode: 'gu-IN', name: 'gu-IN-Standard-A',  ssmlGender: 'FEMALE' },
  hi: { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A',   ssmlGender: 'FEMALE' },
  en: { languageCode: 'en-IN', name: 'en-IN-Neural2-A',   ssmlGender: 'FEMALE' },
}

const _cache   = new Map()
const MAX_CACHE = 200

async function googleTTS(text, lang = 'gu') {
  const cacheKey = `${lang}:${text}`
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)

  const voice = GOOGLE_VOICES[lang] || GOOGLE_VOICES.gu

  const [response] = await getClient().synthesizeSpeech({
    input: { text: text.substring(0, 500) },
    voice,
    audioConfig: {
      audioEncoding:    'LINEAR16',
      sampleRateHertz:  8000,
      effectsProfileId: ['telephony-class-application'],
      pitch:            0,
      speakingRate:     0.9,
    },
  })

  const audio = response.audioContent
  if (_cache.size < MAX_CACHE) _cache.set(cacheKey, audio)
  return audio
}

module.exports = { googleTTS, GOOGLE_VOICES }

