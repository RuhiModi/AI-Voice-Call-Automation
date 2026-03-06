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
// 
// IMPORTANT: ws library 'path' option matches EXACT path only.
// We use noServer mode + manually upgrade to handle dynamic paths like
// /ws/call/15ae9f67-xxx which would NOT match path: '/ws/call'
const wss = new WebSocket.Server({ noServer: true })
wss.on('connection', handleWebSocketConnection)

server.on('upgrade', (req, socket, head) => {
  const url = req.url || ''
  console.log(`[WS] Upgrade request: ${url}`)
  
  // Accept any /ws/* path
  if (url.startsWith('/ws')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    console.log(`[WS] Rejected upgrade for path: ${url}`)
    socket.destroy()
  }
})

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
