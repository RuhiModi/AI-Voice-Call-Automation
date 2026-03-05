// src/db/supabaseClient.js
const { Pool } = require('pg')
const config   = require('../config')

// Using Supabase Session Pooler URL — IPv4 compatible, works on Render
// URL format: postgresql://postgres.xxx:[pass]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
const pool = new Pool({
  connectionString:        config.databaseUrl,
  ssl:                     { rejectUnauthorized: false },
  max:                     3,
  min:                     1,
  idleTimeoutMillis:       60000,
  connectionTimeoutMillis: 30000,
  keepAlive:               true,
})

pool.on('error', (err) => {
  console.error('❌ DB pool error:', err.message)
})

pool.connect((err, client, release) => {
  if (err) console.error('❌ Database connection error:', err.message)
  else     { console.log('✅ Database connected'); release() }
})

module.exports = pool
