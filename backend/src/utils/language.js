// src/utils/language.js
const LANG_NAMES = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }

/** Map BCP-47 code → our 2-letter code */
function parseLangCode(bcp47) {
  const lower = (bcp47 || '').toLowerCase()
  if (lower.startsWith('hi')) return 'hi'
  if (lower.startsWith('en')) return 'en'
  return 'gu'
}

module.exports = { LANG_NAMES, parseLangCode }

