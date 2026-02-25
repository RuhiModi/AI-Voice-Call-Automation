// src/utils/datetime.js

/** Format date in IST for display */
function toISTString(date = new Date()) {
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

/** Get current IST hour (for calling hours check) */
function istHour() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours()
}

/** Milliseconds until next calling window start */
function msUntilHour(targetHour) {
  const now  = new Date()
  const next = new Date()
  next.setHours(targetHour, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

module.exports = { toISTString, istHour, msUntilHour }

