// src/routes/results.routes.js
// Public-facing pull API — external servers can GET call results
// authenticated via API key (stored per user in DB).
//
// Endpoints:
//   GET /results/campaigns/:id          → campaign summary + stats
//   GET /results/campaigns/:id/calls    → paginated call list with outcomes
//   GET /results/campaigns/:id/contacts → contact list with status

const express = require('express')
const pool    = require('../db/supabaseClient')
const router  = express.Router()

// ── API Key auth middleware ────────────────────────────────────
// External servers pass: Authorization: Bearer <api_key>
// or ?api_key=<api_key> as query param
async function apiKeyAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const apiKey = header.startsWith('Bearer ')
    ? header.slice(7)
    : req.query.api_key

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required. Pass as Authorization: Bearer <key> or ?api_key=<key>' })
  }

  try {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE api_key = $1',
      [apiKey]
    )
    if (!rows[0]) return res.status(401).json({ error: 'Invalid API key' })
    req.userId = rows[0].id
    next()
  } catch (err) {
    next(err)
  }
}

// ── GET /results/campaigns/:id ─────────────────────────────────
// Campaign summary with full stats
router.get('/campaigns/:id', apiKeyAuth, async (req, res, next) => {
  try {
    // Verify campaign belongs to this user
    const { rows: campRows } = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    if (!campRows[0]) return res.status(404).json({ error: 'Campaign not found' })
    const campaign = campRows[0]

    // Contact stats
    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*)                                         AS total,
         COUNT(*) FILTER (WHERE status='completed')       AS completed,
         COUNT(*) FILTER (WHERE status='pending')         AS pending,
         COUNT(*) FILTER (WHERE status='failed')          AS failed,
         COUNT(*) FILTER (WHERE last_outcome='no_answer') AS no_answer,
         COUNT(*) FILTER (WHERE do_not_call=TRUE)         AS dnc
       FROM contacts WHERE campaign_id = $1`,
      [campaign.id]
    )

    // Call quality stats
    const { rows: callRows } = await pool.query(
      `SELECT
         COUNT(*)                                        AS total_calls,
         COUNT(*) FILTER (WHERE acknowledged=TRUE)       AS acknowledged,
         COUNT(*) FILTER (WHERE acknowledged=FALSE)      AS not_acknowledged,
         ROUND(AVG(duration_sec))                        AS avg_duration_sec,
         ROUND(AVG(confusion_count), 1)                  AS avg_confusion,
         COUNT(*) FILTER (WHERE llm_used=TRUE)           AS llm_activations,
         COUNT(*) FILTER (WHERE webhook_sent=TRUE)       AS webhook_delivered
       FROM call_logs WHERE campaign_id = $1`,
      [campaign.id]
    )

    const stats = statsRows[0]
    const calls = callRows[0]

    res.json({
      campaign: {
        id:           campaign.id,
        name:         campaign.name,
        type:         campaign.campaign_type,
        status:       campaign.status,
        language:     campaign.language_priority,
        created_at:   campaign.created_at,
        updated_at:   campaign.updated_at,
      },
      contacts: {
        total:        parseInt(stats.total),
        completed:    parseInt(stats.completed),
        pending:      parseInt(stats.pending),
        failed:       parseInt(stats.failed),
        no_answer:    parseInt(stats.no_answer),
        dnc:          parseInt(stats.dnc),
      },
      calls: {
        total:            parseInt(calls.total_calls),
        acknowledged:     parseInt(calls.acknowledged),
        not_acknowledged: parseInt(calls.not_acknowledged),
        avg_duration_sec: parseInt(calls.avg_duration_sec) || 0,
        avg_confusion:    parseFloat(calls.avg_confusion)  || 0,
        llm_activations:  parseInt(calls.llm_activations),
        webhook_delivered: parseInt(calls.webhook_delivered),
      },
    })
  } catch (err) { next(err) }
})

// ── GET /results/campaigns/:id/calls ──────────────────────────
// Paginated list of all calls with outcomes and collected data
router.get('/campaigns/:id/calls', apiKeyAuth, async (req, res, next) => {
  try {
    // Verify ownership
    const { rows: campRows } = await pool.query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    if (!campRows[0]) return res.status(404).json({ error: 'Campaign not found' })

    const page  = parseInt(req.query.page)  || 1
    const limit = Math.min(parseInt(req.query.limit) || 100, 500)
    const offset = (page - 1) * limit

    // Optional filters
    const outcome = req.query.outcome  // e.g. ?outcome=completed
    const ack     = req.query.acknowledged  // ?acknowledged=true|false

    let where = 'cl.campaign_id = $1'
    const params = [req.params.id]
    let idx = 2

    if (outcome) { where += ` AND cl.outcome = $${idx++}`; params.push(outcome) }
    if (ack === 'true')  { where += ` AND cl.acknowledged = TRUE` }
    if (ack === 'false') { where += ` AND cl.acknowledged = FALSE` }

    const { rows } = await pool.query(
      `SELECT
         cl.session_id,
         c.phone,
         c.variables,
         cl.outcome,
         cl.duration_sec,
         cl.language_detected,
         cl.acknowledged,
         cl.confusion_count,
         cl.llm_used,
         cl.collected_data,
         cl.ended_at,
         cl.webhook_sent,
         cl.webhook_status
       FROM call_logs cl
       JOIN contacts c ON c.id = cl.contact_id
       WHERE ${where}
       ORDER BY cl.ended_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    )

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM call_logs cl WHERE cl.campaign_id = $1`,
      [req.params.id]
    )

    res.json({
      page,
      limit,
      total: parseInt(countRows[0].count),
      calls: rows.map(r => ({
        session_id:      r.session_id,
        phone:           r.phone,
        contact_data:    typeof r.variables === 'object' ? r.variables
                           : (() => { try { return JSON.parse(r.variables || '{}') } catch { return {} } })(),
        outcome:         r.outcome,
        duration_sec:    r.duration_sec,
        language:        r.language_detected,
        acknowledged:    r.acknowledged,
        confusion_count: r.confusion_count,
        llm_used:        r.llm_used,
        collected_data:  (() => { try { return JSON.parse(r.collected_data || '{}') } catch { return {} } })(),
        ended_at:        r.ended_at,
        webhook_sent:    r.webhook_sent,
        webhook_status:  r.webhook_status,
      })),
    })
  } catch (err) { next(err) }
})

// ── GET /results/campaigns/:id/contacts ───────────────────────
// Full contact list with current status — useful for syncing
router.get('/campaigns/:id/contacts', apiKeyAuth, async (req, res, next) => {
  try {
    const { rows: campRows } = await pool.query(
      'SELECT id FROM campaigns WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    )
    if (!campRows[0]) return res.status(404).json({ error: 'Campaign not found' })

    const page   = parseInt(req.query.page)  || 1
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500)
    const offset = (page - 1) * limit
    const status = req.query.status  // ?status=completed|pending|failed

    let where  = 'campaign_id = $1'
    const params = [req.params.id]
    if (status) { where += ` AND status = $2`; params.push(status) }

    const { rows } = await pool.query(
      `SELECT phone, variables, status, last_outcome, call_count, do_not_call, next_call_at
       FROM contacts WHERE ${where}
       ORDER BY created_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    res.json({
      page,
      limit,
      contacts: rows.map(r => ({
        phone:        r.phone,
        data:         typeof r.variables === 'object' ? r.variables
                        : (() => { try { return JSON.parse(r.variables || '{}') } catch { return {} } })(),
        status:       r.status,
        last_outcome: r.last_outcome,
        call_count:   r.call_count,
        do_not_call:  r.do_not_call,
        next_call_at: r.next_call_at,
      })),
    })
  } catch (err) { next(err) }
})

module.exports = router
