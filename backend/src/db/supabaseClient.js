// src/db/supabaseClient.js
const { Pool } = require('pg')
const config   = require('../config')

const pool = new Pool({
  connectionString:        config.databaseUrl,
  ssl:                     { rejectUnauthorized: false },
  max:                     3,
  min:                     0,   // Don't hold idle connections — Supabase free tier limit
  idleTimeoutMillis:       10000,
  connectionTimeoutMillis: 30000,
  keepAlive:               true,
  keepAliveInitialDelayMillis: 10000,
})

pool.on('error', (err) => {
  // Suppress common noise — pool will auto-reconnect
  if (!err.message.includes('timeout') && !err.message.includes('terminated')) {
    console.error('❌ DB pool error:', err.message)
  }
})

// Test connection with retry
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
  console.error('❌ Database failed to connect after all retries — check DATABASE_URL')
}

connectWithRetry()

module.exports = pool
