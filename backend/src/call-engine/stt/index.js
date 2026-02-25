// src/call-engine/stt/index.js
// 🔥 STT ROUTER — reads STT_PROVIDER from config and routes to
// Sarvam (Indian/cheap) or Google (fallback).
//
// The session.js only imports from here — never directly from sarvam.js or google.js.
// This is the VAD + buffering + provider-switching layer.
const config = require('../../config')
const { transcribeWithSarvam }  = require('./sarvam')
const { createGoogleSTTStream } = require('./google')

// ── Sarvam Mode: Buffer → Batch Transcribe ────────────────────
// Sarvam doesn't support streaming WebSocket — we buffer audio
// chunks for ~800ms of speech then send as a batch request.
// This gives latency similar to streaming (800ms vs 500ms on Google).

/**
 * Create STT handler that routes to Sarvam or Google.
 *
 * For Sarvam: returns an object with processChunk() — buffers audio,
 *             calls onTranscript after silence detected.
 * For Google:  returns a writable stream (legacy streaming mode).
 *
 * @param {Function} onTranscript  - Called with (text, lang) when user finishes speaking
 * @param {Function} onError       - Called on errors
 * @param {string}   hintLang      - 'gu' | 'hi' | 'en'
 */
function createSTTHandler(onTranscript, onError, hintLang = 'gu') {
  if (config.sttProvider === 'sarvam') {
    return new SarvamSTTHandler(onTranscript, onError, hintLang)
  }
  // Fallback: Google streaming
  const stream = createGoogleSTTStream(onTranscript, onError)
  stream.provider = 'google'
  return stream
}

// ── Sarvam STT Handler ────────────────────────────────────────
class SarvamSTTHandler {
  constructor(onTranscript, onError, hintLang) {
    this.onTranscript = onTranscript
    this.onError      = onError
    this.hintLang     = hintLang
    this.provider     = 'sarvam'
    this.buffer       = Buffer.alloc(0)
    this.destroyed    = false

    // MIN_BUFFER: ~800ms of audio at 8kHz 16-bit = 12800 bytes
    this.MIN_BUFFER_SIZE = 12800
  }

  // Write audio chunks (called from session.receiveAudio)
  write(audioChunk) {
    if (this.destroyed) return
    this.buffer = Buffer.concat([this.buffer, audioChunk])
  }

  // Called by VAD when user stops speaking — flush buffer to Sarvam
  async flush() {
    if (this.destroyed || this.buffer.length < this.MIN_BUFFER_SIZE) {
      this.buffer = Buffer.alloc(0)
      return
    }

    const audioToProcess = this.buffer
    this.buffer = Buffer.alloc(0)

    try {
      console.log(`[STT:Sarvam] Sending ${(audioToProcess.length / 1024).toFixed(1)}KB to Sarvam...`)
      const { transcript, detectedLang } = await transcribeWithSarvam(audioToProcess, this.hintLang)
      if (transcript) {
        console.log(`[STT:Sarvam] (${detectedLang}): "${transcript}"`)
        this.onTranscript(transcript, detectedLang)
      }
    } catch (err) {
      console.error('[STT:Sarvam] Error:', err.message)
      if (this.onError) this.onError(err)
    }
  }

  destroy() {
    this.destroyed = true
    this.buffer    = Buffer.alloc(0)
  }
}

// ── Voice Activity Detector ───────────────────────────────────
// Detects when user stops speaking using RMS energy.
// Works the same regardless of STT provider.
class VoiceActivityDetector {
  constructor(onSilenceDetected, silenceThresholdMs = 800) {
    this.onSilenceDetected  = onSilenceDetected
    this.silenceThresholdMs = silenceThresholdMs
    this.isSpeaking         = false
    this.silenceTimer       = null
    this.ENERGY_THRESHOLD   = 300  // Tune: lower = more sensitive
  }

  processChunk(audioBuffer) {
    const energy = this._rms(audioBuffer)
    if (energy > this.ENERGY_THRESHOLD) {
      this.isSpeaking = true
      if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null }
    } else if (this.isSpeaking && !this.silenceTimer) {
      this.silenceTimer = setTimeout(() => {
        this.isSpeaking   = false
        this.silenceTimer = null
        this.onSilenceDetected()
      }, this.silenceThresholdMs)
    }
  }

  _rms(buffer) {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2)
    let sum = 0
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
    return Math.sqrt(sum / samples.length)
  }

  destroy() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
  }
}

module.exports = { createSTTHandler, VoiceActivityDetector, SarvamSTTHandler }

