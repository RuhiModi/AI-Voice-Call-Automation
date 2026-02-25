// src/db/supabaseClient.js
// Single Postgres connection pool used by all repositories.
// One place to change connection settings.
const { Pool } = require('pg')
const config   = require('../config')

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 3000,
})

pool.connect((err, client, release) => {
  if (err) console.error('❌ Database connection error:', err.message)
  else { console.log('✅ Database connected'); release() }
})

module.exports = pool

