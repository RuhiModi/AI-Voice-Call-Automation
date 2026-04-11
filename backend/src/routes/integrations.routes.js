// src/routes/integrations.routes.js
// Handles Google Sheets connection status, connect, and disconnect.
const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const pool    = require('../db/supabaseClient')

// ── GET /integrations/sheets/status ──────────────────────────
// Returns whether the user has connected Google Sheets
router.get('/sheets/status', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT google_sheets_token FROM users WHERE id = $1',
      [req.userId]
    )
    const token = rows[0]?.google_sheets_token
    if (!token) {
      return res.json({ connected: false, email: null })
    }
    // Parse token to get email if stored
    let email = null
    try {
      const parsed = typeof token === 'string' ? JSON.parse(token) : token
      email = parsed.email || null
    } catch {}

    res.json({ connected: true, email })
  } catch (err) { next(err) }
})

// ── POST /integrations/sheets/connect ────────────────────────
// Called after OAuth callback to save token (also handled in app.js callback)
router.post('/sheets/connect', auth, async (req, res, next) => {
  try {
    const { token, spreadsheet_id, email } = req.body
    if (!token) return res.status(400).json({ error: 'token required' })

    // Store token with email metadata
    const tokenData = typeof token === 'object'
      ? { ...token, email: email || null }
      : token

    await pool.query(
      'UPDATE users SET google_sheets_token = $1 WHERE id = $2',
      [JSON.stringify(tokenData), req.userId]
    )

    if (spreadsheet_id) {
      await pool.query(
        'UPDATE users SET default_sheet_id = $1 WHERE id = $2',
        [spreadsheet_id, req.userId]
      ).catch(() => {}) // column may not exist yet — safe to ignore
    }

    res.json({ success: true })
  } catch (err) { next(err) }
})

// ── POST /integrations/sheets/disconnect ─────────────────────
// Removes the stored Google Sheets token
router.post('/sheets/disconnect', auth, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE users SET google_sheets_token = NULL WHERE id = $1',
      [req.userId]
    )
    res.json({ success: true, message: 'Google Sheets disconnected' })
  } catch (err) { next(err) }
})

module.exports = router
