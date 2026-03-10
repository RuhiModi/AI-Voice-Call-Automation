// src/routes/settings.routes.js
const express = require('express')
const auth    = require('../middleware/auth')
const pool    = require('../db/supabaseClient')
const router  = express.Router()

// GET /settings
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT email, company_name, vobiz_auth_id, vobiz_auth_token, vobiz_from_number, api_key FROM users WHERE id = $1',
      [req.userId]
    )
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({
      email:             user.email,
      company_name:      user.company_name      || '',
      vobiz_auth_id:     user.vobiz_auth_id     || '',
      vobiz_auth_token:  user.vobiz_auth_token  ? '••••••••' + user.vobiz_auth_token.slice(-4) : '',
      vobiz_from_number: user.vobiz_from_number || '',
      has_vobiz_creds:   !!(user.vobiz_auth_id && user.vobiz_auth_token),
      api_key:           user.api_key           || null,
    })
  } catch (err) { next(err) }
})

// PUT /settings
router.put('/', auth, async (req, res, next) => {
  try {
    const { company_name, vobiz_auth_id, vobiz_auth_token, vobiz_from_number } = req.body

    const updates = []
    const values  = []
    let   idx     = 1

    if (company_name      !== undefined) { updates.push(`company_name = $${idx++}`);      values.push(company_name) }
    if (vobiz_auth_id     !== undefined) { updates.push(`vobiz_auth_id = $${idx++}`);     values.push(vobiz_auth_id) }
    if (vobiz_from_number !== undefined) { updates.push(`vobiz_from_number = $${idx++}`); values.push(vobiz_from_number) }

    // Only update token if it's a real new value (not the masked ••• display value)
    if (vobiz_auth_token !== undefined && !vobiz_auth_token.includes('••')) {
      updates.push(`vobiz_auth_token = $${idx++}`)
      values.push(vobiz_auth_token)
    }

    if (updates.length === 0) return res.json({ message: 'Nothing to update' })

    values.push(req.userId)
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    )
    res.json({ message: 'Settings saved' })
  } catch (err) { next(err) }
})

// POST /settings/test-vobiz — verify credentials actually work
router.post('/test-vobiz', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT vobiz_auth_id, vobiz_auth_token, vobiz_from_number FROM users WHERE id = $1',
      [req.userId]
    )
    const user = rows[0]
    if (!user?.vobiz_auth_id || !user?.vobiz_auth_token) {
      return res.status(400).json({ error: 'No Vobiz credentials saved yet' })
    }

    const axios    = require('axios')
    const response = await axios.get(
      `https://api.vobiz.ai/api/v1/Account/${user.vobiz_auth_id}/`,
      {
        headers: {
          'X-Auth-ID':    user.vobiz_auth_id,
          'X-Auth-Token': user.vobiz_auth_token,
        },
        timeout: 8000,
      }
    )

    res.json({
      success: true,
      account: response.data?.objects?.[0] || response.data,
    })
  } catch (err) {
    const status = err.response?.status
    if (status === 401 || status === 403) {
      return res.status(400).json({ error: 'Invalid credentials — check your Auth ID and Token' })
    }
    res.status(400).json({ error: 'Could not connect to Vobiz: ' + (err.response?.data?.error || err.message) })
  }
})

// POST /settings/regenerate-api-key — generate a new pull API key
router.post('/regenerate-api-key', auth, async (req, res, next) => {
  try {
    const crypto = require('crypto')
    const newKey = 'vbz_' + crypto.randomBytes(24).toString('hex')
    await pool.query('UPDATE users SET api_key = $1 WHERE id = $2', [newKey, req.userId])
    res.json({ api_key: newKey })
  } catch (err) { next(err) }
})

// POST /settings/test-webhook — test user's external webhook URL
router.post('/test-webhook', auth, async (req, res, next) => {
  try {
    const { webhook_url, webhook_secret } = req.body
    if (!webhook_url) return res.status(400).json({ error: 'webhook_url is required' })
    const { testWebhook } = require('../services/webhookDelivery')
    const result = await testWebhook(webhook_url, webhook_secret || '')
    res.json(result)
  } catch (err) {
    const status = err.response?.status || null
    res.status(400).json({
      error: `Webhook test failed: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      status,
    })
  }
})

module.exports = router
