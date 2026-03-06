// Pure JS audio conversion — no external dependencies
// Converts between PCM16 and mulaw (G.711 u-law) for telephony

/**
 * Convert PCM 16-bit signed to 8-bit mulaw
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
 * Strip WAV header — find 'data' chunk properly
 */
function wavToPcm(wavBuffer) {
  if (wavBuffer.slice(0, 4).toString() !== 'RIFF') {
    console.log('[Audio] Not WAV, using as-is')
    return wavBuffer
  }
  // Find 'data' chunk by scanning headers
  let offset = 12
  while (offset < wavBuffer.length - 8) {
    const chunkId   = wavBuffer.slice(offset, offset + 4).toString()
    const chunkSize = wavBuffer.readUInt32LE(offset + 4)
    if (chunkId === 'data') {
      console.log(`[Audio] WAV data at offset ${offset + 8}, pcm size: ${chunkSize}`)
      return wavBuffer.slice(offset + 8)
    }
    offset += 8 + chunkSize
  }
  return wavBuffer.slice(44)
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
  return ~(sign | (exponent << 4) | mantissa) & 0xFF
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
