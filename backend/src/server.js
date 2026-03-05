// ============================================================
// src/server.js — Entry point. Only job: start HTTP server.
// All Express config lives in app.js — keeps this file clean
// and makes testing possible (import app.js without opening port).
// ============================================================
const http    = require('http')
const WebSocket = require('ws')
const config  = require('./config')
const app     = require('./app')
const { handleWebSocketConnection } = require('./call-engine/session')

const server = http.createServer(app)

// ── WebSocket Server ────────────────────────────────────────
// Telephony providers (Vobiz/Exotel) connect here when a call answers.
// URL pattern: /ws/call/{sessionId}
// Accept WebSocket on ANY path under /ws/
// Vobiz connects to: wss://server/ws/call/{sessionId}
const wss = new WebSocket.Server({ server, path: '/ws/call' })
wss.on('connection', handleWebSocketConnection)

// Also accept root /ws path for flexibility
const wss2 = new WebSocket.Server({ server, path: '/ws' })
wss2.on('connection', handleWebSocketConnection)

// ── Start ───────────────────────────────────────────────────
server.listen(config.port, () => {
  console.log('\n══════════════════════════════════════════════════')
  console.log(`🚀 VoiceAI India Backend — v2.0`)
  console.log(`   Port      : ${config.port}`)
  console.log(`   Health    : http://localhost:${config.port}/health`)
  console.log(`   WebSocket : ws://localhost:${config.port}/ws/call/{sessionId}`)
  console.log(`   LLM       : ${config.llmProvider.toUpperCase()} (${config.llmProvider === 'groq' ? config.groqModel : config.openaiModel})`)
  console.log(`   STT       : ${config.sttProvider.toUpperCase()}`)
  console.log(`   TTS       : ${config.ttsProvider.toUpperCase()}`)
  console.log(`   Env       : ${config.nodeEnv}`)
  console.log('══════════════════════════════════════════════════\n')
})

// ── Graceful shutdown ───────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully')
  const { activeSessions } = require('./call-engine/session')
  for (const [, session] of activeSessions) {
    await session.endCall('server_shutdown').catch(() => {})
  }
  server.close(() => process.exit(0))
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
