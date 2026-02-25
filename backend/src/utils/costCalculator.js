// src/utils/costCalculator.js
// Estimate cost of each call based on providers used.
// Useful for billing.service.js and analytics dashboard.

const RATES = {
  // Telephony (Vobiz approximate rate for India)
  vobiz_per_min: 0.45,   // ₹0.45/min

  // STT
  sarvam_stt_per_hr: 30,   // ₹30/hr
  google_stt_per_hr: 120,  // ₹120/hr

  // TTS (per 10K characters)
  sarvam_tts_per_10k: 15,  // ₹15/10K chars (Bulbul v2)
  google_tts_per_10k: 12,  // ₹12/10K chars

  // LLM (approximate, Groq is free)
  groq_per_call:   0,        // ₹0 (free tier)
  openai_per_1k_tokens: 0.013, // $0.00015/1K tokens * 86 = ₹0.013
}

/**
 * Estimate total cost of a single call.
 * @param {number} durationSec   - Call duration in seconds
 * @param {number} ttsChars      - Characters spoken via TTS
 * @param {string} sttProvider   - 'sarvam' | 'google'
 * @param {string} ttsProvider   - 'sarvam' | 'google'
 * @param {string} llmProvider   - 'groq' | 'openai'
 * @returns {Object} { telephony, stt, tts, llm, total } all in ₹
 */
function estimateCallCost(durationSec, ttsChars = 500, sttProvider = 'sarvam', ttsProvider = 'sarvam', llmProvider = 'groq') {
  const durationMin = durationSec / 60
  const durationHr  = durationSec / 3600

  const telephony = parseFloat((durationMin * RATES.vobiz_per_min).toFixed(3))

  const sttRate = sttProvider === 'sarvam' ? RATES.sarvam_stt_per_hr : RATES.google_stt_per_hr
  const stt     = parseFloat((durationHr * sttRate).toFixed(3))

  const ttsRate = ttsProvider === 'sarvam' ? RATES.sarvam_tts_per_10k : RATES.google_tts_per_10k
  const tts     = parseFloat(((ttsChars / 10000) * ttsRate).toFixed(3))

  const llm   = llmProvider === 'groq' ? 0 : parseFloat((0.05).toFixed(3))  // ~₹0.05 per OpenAI call
  const total = parseFloat((telephony + stt + tts + llm).toFixed(3))

  return { telephony, stt, tts, llm, total, currency: '₹' }
}

module.exports = { estimateCallCost, RATES }

