const { Pool } = require('pg')
const config   = require('../config')

const pool = new Pool({
  connectionString:        config.databaseUrl,
  ssl:                     { rejectUnauthorized: false },
  max:                     5,
  min:                     0,
  idleTimeoutMillis:       10000,
  connectionTimeoutMillis: 10000,  // Fail fast, let retry handle it
  keepAlive:               true,
  keepAliveInitialDelayMillis: 10000,
})

pool.on('error', (err) => {
  if (!err.message.includes('timeout') && !err.message.includes('terminated')) {
    console.error('❌ DB pool error:', err.message)
  }
})

// ── Query with auto-retry ──────────────────────────────────────
// Wraps pool.query with 3 retries on connection errors.
// This fixes the "Connection terminated due to connection timeout" issue
// that happens when Supabase drops idle connections on free tier.
const originalQuery = pool.query.bind(pool)
pool.query = async function queryWithRetry(text, params) {
  const MAX_RETRIES = 3
  let lastErr
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await originalQuery(text, params)
    } catch (err) {
      lastErr = err
      const isRetryable = err.message.includes('timeout') ||
                          err.message.includes('terminated') ||
                          err.message.includes('ECONNRESET') ||
                          err.message.includes('Connection refused')
      if (!isRetryable) throw err  // Don't retry SQL errors
      if (i < MAX_RETRIES - 1) {
        console.warn(`[DB] Retry ${i + 1}/${MAX_RETRIES - 1}: ${err.message}`)
        await new Promise(r => setTimeout(r, 500 * (i + 1)))
      }
    }
  }
  throw lastErr
}

// Initial connection test
async function connectWithRetry(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect()
      console.log('✅ Database connected')
      client.release()
      return
    } catch (err) {
      console.error(`❌ DB connect attempt ${i + 1}/${retries}: ${err.message}`)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 3000 * (i + 1)))
    }
  }
  console.error('❌ Database failed after all retries — check DATABASE_URL')
}

connectWithRetry()
module.exports = pool
