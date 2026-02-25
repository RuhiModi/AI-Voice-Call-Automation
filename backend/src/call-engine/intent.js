// src/call-engine/intent.js
// Pre-LLM intent detection using keyword matching.
// Catches obvious cases instantly (< 1ms) before spending tokens on LLM.
// Also used to double-check LLM-detected intents.

const DNC_KEYWORDS = [
  // Gujarati
  'ना', 'નહ', 'ન ઉઠ', 'band karo', 'nahi chahiye', 'remove',
  // Hindi
  'नहीं', 'बंद करो', 'मत करो', 'हटाओ',
  // English
  'stop calling', 'dont call', "don't call", 'remove me', 'unsubscribe', 'not interested',
  'do not call', 'block me',
]

const TRANSFER_KEYWORDS = [
  // Gujarati
  'manager', 'senior', 'saheb', 'superior',
  // Hindi
  'मैनेजर', 'अधिकारी', 'सीनियर', 'ऊपर वाले',
  // English
  'human', 'agent', 'person', 'real person', 'supervisor', 'transfer',
  'speak to someone', 'talk to someone',
]

const RESCHEDULE_KEYWORDS = [
  // Gujarati
  'bad me', 'baad me', 'kal', 'aaje nai', 'pachhi',
  // Hindi
  'बाद में', 'कल', 'अभी नहीं', 'व्यस्त हूं', 'baad mein',
  // English
  'call back', 'call later', 'busy', 'not now', 'tomorrow', 'in the evening',
  'tonight', 'another time', 'some other time',
]

/**
 * Quick intent check from raw user text.
 * Returns 'dnc' | 'transfer' | 'reschedule' | null
 *
 * @param {string} text
 * @returns {string|null}
 */
function detectQuickIntent(text) {
  if (!text) return null
  const lower = text.toLowerCase()

  if (DNC_KEYWORDS.some(k => lower.includes(k.toLowerCase()))) return 'dnc'
  if (TRANSFER_KEYWORDS.some(k => lower.includes(k.toLowerCase()))) return 'transfer'
  if (RESCHEDULE_KEYWORDS.some(k => lower.includes(k.toLowerCase()))) return 'reschedule'

  return null
}

module.exports = { detectQuickIntent, DNC_KEYWORDS, TRANSFER_KEYWORDS, RESCHEDULE_KEYWORDS }

