// src/utils/constants.js
module.exports = {
  LANGUAGES: { gu: 'Gujarati', hi: 'Hindi', en: 'English' },
  CALL_OUTCOMES: ['completed','rescheduled','transferred','dnc','failed','no_answer','busy','disconnected'],
  CAMPAIGN_STATUSES: ['draft','active','paused','completed'],
  DEFAULT_PERSONA: 'Priya',
  DEFAULT_LANG: 'gu',
  MAX_CALL_DURATION_SEC: 600,   // 10 minutes max per call
  MIN_AUDIO_BUFFER_BYTES: 12800, // ~800ms at 8kHz 16-bit
  IST_TIMEZONE: 'Asia/Kolkata',
}

