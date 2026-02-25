// ============================================================
// src/config/index.js
// Central configuration — all env vars in ONE place.
// Validates on startup so you get a clear error instead of
// a cryptic crash 5 minutes later.
// ============================================================
require('dotenv').config()
const path = require('path')
const fs   = require('fs')

// ── Write Google credentials from env string (for Render) ──
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = path.join(__dirname, '..', '..', 'google-service-account.json')
  fs.writeFileSync(credPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath
  console.log('✅ Google credentials written from env var')
}

// ── Required vars — app won't start without these ──────────
const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
]

const missing = REQUIRED.filter(k => !process.env[k])
if (missing.length) {
  console.error(`\n❌ Missing required environment variables:\n   ${missing.join('\n   ')}\n`)
  process.exit(1)
}

const config = {
  // ── Server ────────────────────────────────────────────
  port:        parseInt(process.env.PORT) || 3000,
  nodeEnv:     process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  serverUrl:   process.env.SERVER_URL || 'localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // ── Database ──────────────────────────────────────────
  databaseUrl:        process.env.DATABASE_URL,
  supabaseUrl:        process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  // ── Auth ──────────────────────────────────────────────
  jwtSecret:      process.env.JWT_SECRET,
  jwtExpiresIn:   '7d',

  // ── LLM Provider ─────────────────────────────────────
  // Set LLM_PROVIDER=groq  → use Groq (free credits)
  // Set LLM_PROVIDER=openai → use OpenAI (paid)
  llmProvider:    process.env.LLM_PROVIDER || 'groq',
  groqApiKey:     process.env.GROQ_API_KEY,
  groqModel:      process.env.LLM_MODEL_GROQ    || 'llama-3.1-70b-versatile',
  openaiApiKey:   process.env.OPENAI_API_KEY,
  openaiModel:    process.env.LLM_MODEL_OPENAI  || 'gpt-4o-mini',

  // ── STT Provider ─────────────────────────────────────
  // Set STT_PROVIDER=sarvam → Sarvam AI (Indian, cheaper)
  // Set STT_PROVIDER=google → Google Cloud STT
  sttProvider:    process.env.STT_PROVIDER || 'sarvam',
  sarvamApiKey:   process.env.SARVAM_API_KEY,

  // ── TTS Provider ─────────────────────────────────────
  ttsProvider:    process.env.TTS_PROVIDER || 'sarvam',
  ttsVoiceGu:     process.env.TTS_VOICE_GUJARATI || 'kavya',
  ttsVoiceHi:     process.env.TTS_VOICE_HINDI    || 'neha',
  ttsVoiceEn:     process.env.TTS_VOICE_ENGLISH  || 'amelia',

  // ── Telephony ─────────────────────────────────────────
  telephonyProvider: process.env.TELEPHONY_PROVIDER || 'vobiz',
  vobizApiKey:       process.env.VOBIZ_API_KEY,
  vobizApiUrl:       process.env.VOBIZ_API_URL || 'https://api.vobiz.in/v1',
  exotelSid:         process.env.EXOTEL_SID,
  exotelToken:       process.env.EXOTEL_TOKEN,
  exotelSubdomain:   process.env.EXOTEL_SUBDOMAIN,

  // ── Google Sheets OAuth ───────────────────────────────
  googleSheetsClientId:     process.env.GOOGLE_SHEETS_CLIENT_ID,
  googleSheetsClientSecret: process.env.GOOGLE_SHEETS_CLIENT_SECRET,
  googleSheetsRedirectUri:  process.env.GOOGLE_SHEETS_REDIRECT_URI
                            || 'http://localhost:3000/auth/google/callback',

  // ── Calling Rules ─────────────────────────────────────
  humanAgentNumber:    process.env.HUMAN_AGENT_NUMBER,
  maxConcurrentCalls:  parseInt(process.env.MAX_CONCURRENT_CALLS) || 5,
  defaultCallingStart: '09:00',
  defaultCallingEnd:   '21:00',
}

module.exports = config

