// src/utils/helpers.js

/** Clean a phone number → E.164 format for India */
function normalizePhone(raw) {
  let digits = String(raw).replace(/\D/g, '')
  if (digits.length === 10) digits = '91' + digits
  if (!digits.startsWith('+')) digits = '+' + digits
  return digits
}

/** Get current hour in IST */
function istHour() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  ).getHours()
}

/** Sleep helper */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/** Safe JSON parse — returns null on error instead of throwing */
function safeJsonParse(str) {
  try { return JSON.parse(str) } catch { return null }
}

module.exports = { normalizePhone, istHour, sleep, safeJsonParse }

