// src/db/supabaseClient.js
const { Pool } = require('pg')
const config   = require('../config')

// Supabase gives IPv6 by default on port 5432
// Use port 6543 (Session mode) which supports IPv4 on Render
let connectionString = config.databaseUrl

const pool = new Pool({
  connectionString,
  ssl:  { rejectUnauthorized: false },
  max:  5,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 15000,
})

pool.connect((err, client, release) => {
  if (err) console.error('❌ Database connection error:', err.message)
  else     { console.log('✅ Database connected'); release() }
})

module.exports = pool
