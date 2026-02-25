// src/repositories/user.repo.js
// All DB queries for the users table.
// Routes/services never write raw SQL — they call functions here.
const pool = require('../db/supabaseClient')

const userRepo = {

  async create(email, passwordHash, companyName) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, company_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, company_name, plan, created_at`,
      [email, passwordHash, companyName]
    )
    return rows[0]
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return rows[0] || null
  },

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, email, company_name, plan, google_sheets_token, created_at FROM users WHERE id = $1',
      [id]
    )
    return rows[0] || null
  },

  async updateGoogleSheetsToken(userId, token) {
    await pool.query(
      'UPDATE users SET google_sheets_token = $1 WHERE id = $2',
      [JSON.stringify(token), userId]
    )
  },

}

module.exports = userRepo

