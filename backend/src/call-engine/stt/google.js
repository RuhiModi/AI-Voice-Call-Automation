// src/call-engine/stt/google.js
// Google Cloud Speech-to-Text — streaming mode.
// Used as fallback when STT_PROVIDER=google or Sarvam is down.
// More expensive (₹120/hr) but battle-tested streaming support.
const speech = require('@google-cloud/speech')

let speechClient
function getClient() {
  if (!speechClient) {
    const opts = {}
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      opts.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    }
    speechClient = new speech.SpeechClient(opts)
  }
  return speechClient
}

/**
 * Create a Google STT streaming session.
 * Returns a writable stream — write PCM audio buffers to it.
 *
 * @param {Function} onTranscript  - Called with (text, detectedLang) on final result
 * @param {Function} onError       - Called on stream errors
 */
function createGoogleSTTStream(onTranscript, onError) {
  const stream = getClient()
    .streamingRecognize({
      config: {
        encoding:                  'LINEAR16',
        sampleRateHertz:           8000,
        audioChannelCount:         1,
        enableAutomaticPunctuation: true,
        model:                     'phone_call',
        useEnhanced:               true,
        languageCode:              'gu-IN',
        alternativeLanguageCodes:  ['hi-IN', 'en-IN'],
      },
      interimResults: false,
      singleUtterance: false,
    })
    .on('error', (err) => {
      console.error('[STT:Google] Stream error:', err.message)
      if (onError) onError(err)
    })
    .on('data', (data) => {
      const result = data.results?.[0]
      if (!result?.isFinal) return
      const transcript = result.alternatives?.[0]?.transcript?.trim()
      if (!transcript) return

      const langCode    = (result.languageCode || 'gu-in').toLowerCase()
      const detectedLang = langCode.startsWith('hi') ? 'hi'
                         : langCode.startsWith('en') ? 'en' : 'gu'

      console.log(`[STT:Google] (${detectedLang}): "${transcript}"`)
      onTranscript(transcript, detectedLang)
    })

  return stream
}

module.exports = { createGoogleSTTStream }

