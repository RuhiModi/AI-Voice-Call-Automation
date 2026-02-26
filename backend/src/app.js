// ============================================================
// src/app.js — Express app setup.
// Split from server.js so tests can import app without
// opening a real HTTP port.
// ============================================================
const express = require('express')
const cors    = require('cors')
const morgan  = require('morgan')
const path    = require('path')
const fs      = require('fs')
const config  = require('./config')

// Middleware
const { rateLimiter, authRateLimiter } = require('./middleware/rateLimiter')
const errorHandler = require('./middleware/errorHandler')
const logger       = require('./middleware/logger')

// Routes
const authRoutes     = require('./routes/auth.routes')
const campaignRoutes = require('./routes/campaigns.routes')
const callRoutes     = require('./routes/calls.routes')
const webhookRoutes  = require('./routes/webhooks.routes')

// Integrations
const { getOAuthUrl, exchangeCodeForToken } = require('./integrations/googleSheets')
const userRepo = require('./repositories/user.repo')

const app = express()

// ── Ensure uploads folder exists ────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// ── CORS ─────────────────────────────────────────────────────
// Allows: any localhost port (dev), any *.vercel.app, and the
// explicit FRONTEND_URL set in Render env vars.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]
if (config.frontendUrl) allowedOrigins.push(config.frontendUrl)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    // Allow any vercel.app subdomain
    if (/\.vercel\.app$/.test(origin)) return callback(null, true)
    // Allow any localhost
    if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true)
    // Allow exact matches
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Allow all in development
    if (config.nodeEnv !== 'production') return callback(null, true)
    callback(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
}))

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── HTTP Request Logger (skip in test) ───────────────────────
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'))
}

// ── Custom structured logger ─────────────────────────────────
app.use(logger)

// ── Rate Limiter ─────────────────────────────────────────────
app.use('/auth', authRateLimiter)  // Tighter limit on auth endpoints
app.use(rateLimiter)               // General limit on everything else

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  const { activeSessions } = require('./call-engine/session')
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    activeCalls: activeSessions.size,
    llm: config.llmProvider,
    stt: config.sttProvider,
    tts: config.ttsProvider,
    env: config.nodeEnv,
  })
})

// ── API Routes ───────────────────────────────────────────────
app.use('/auth',      authRoutes)
app.use('/campaigns', campaignRoutes)
app.use('/calls',     callRoutes)
app.use('/webhooks',  webhookRoutes)

// ── Google Sheets OAuth ──────────────────────────────────────
app.get('/auth/google/sheets', (req, res) => {
  const userId = req.query.user_id
  if (!userId) return res.status(400).send('user_id required')
  res.redirect(getOAuthUrl(userId))
})

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query
    if (!code || !userId) return res.status(400).send('Missing code or state')
    const token = await exchangeCodeForToken(code)
    await userRepo.updateGoogleSheetsToken(userId, token)
    res.redirect(`${config.frontendUrl}/dashboard/settings?sheets=connected`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    res.redirect(`${config.frontendUrl}/dashboard/settings?sheets=error`)
  }
})

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// ── Global Error Handler (must be last) ──────────────────────
app.use(errorHandler)

module.exports = app
