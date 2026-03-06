// Pure JS audio conversion — no external dependencies
// Converts between PCM16 and mulaw (G.711 u-law) for telephony

/**
 * Convert PCM 16-bit signed to 8-bit mulaw
 * Vobiz WebSocket expects: mulaw 8kHz mono
 * Sarvam TTS returns: PCM 16-bit 8kHz mono (inside WAV container)
 */
function pcm16ToMulaw(pcmBuffer) {
  const samples = pcmBuffer.length / 2
  const mulaw   = Buffer.alloc(samples)
  for (let i = 0; i < samples; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2)
    mulaw[i] = _encodeMulaw(sample)
  }
  return mulaw
}

/**
 * Convert mulaw to PCM 16-bit signed
 * Vobiz sends mulaw → we convert to PCM for Sarvam STT
 */
function mulawToPcm16(mulawBuffer) {
  const pcm = Buffer.alloc(mulawBuffer.length * 2)
  for (let i = 0; i < mulawBuffer.length; i++) {
    const sample = _decodeMulaw(mulawBuffer[i])
    pcm.writeInt16LE(sample, i * 2)
  }
  return pcm
}

/**
 * Strip WAV header (44 bytes) and return raw PCM
 */
function wavToPcm(wavBuffer) {
  // WAV header is 44 bytes for standard PCM WAV
  if (wavBuffer.slice(0, 4).toString() === 'RIFF') {
    return wavBuffer.slice(44)
  }
  return wavBuffer // Already raw PCM
}

// ── G.711 u-law encoding ─────────────────────────────────────
const MULAW_BIAS = 33
const MULAW_MAX  = 32767

function _encodeMulaw(sample) {
  const sign    = (sample >> 8) & 0x80
  if (sign) sample = -sample
  if (sample > MULAW_MAX) sample = MULAW_MAX
  sample += MULAW_BIAS
  const exponent = _mulawExpTable[(sample >> 7) & 0xFF]
  const mantissa = (sample >> (exponent + 3)) & 0x0F
  const mulaw    = ~(sign | (exponent << 4) | mantissa) & 0xFF
  return mulaw
}

function _decodeMulaw(mulaw) {
  mulaw  = ~mulaw & 0xFF
  const sign     = mulaw & 0x80
  const exponent = (mulaw >> 4) & 0x07
  const mantissa = mulaw & 0x0F
  let   sample   = ((mantissa << 3) + MULAW_BIAS) << exponent
  sample -= MULAW_BIAS
  return sign ? -sample : sample
}

const _mulawExpTable = [
  0,0,1,1,2,2,2,2,3,3,3,3,3,3,3,3,
  4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
  5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
  5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
  6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
  6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
  6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
  6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
  7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,
]

module.exports = { pcm16ToMulaw, mulawToPcm16, wavToPcm }
