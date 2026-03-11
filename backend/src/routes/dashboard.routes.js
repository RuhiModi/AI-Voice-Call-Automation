// src/routes/dashboard.routes.js
// Single endpoint that returns everything the dashboard needs in one call.

const express     = require('express')
const auth        = require('../middleware/auth')
const pool        = require('../db/supabaseClient')
const planService = require('../services/plan.service')

const router = express.Router()
router.use(auth)

// GET /dashboard/overview
router.get('/overview', async (req, res, next) => {
  try {
    const userId = req.ownerId

    // ── 1. Active campaigns with live progress ────────────────
    const { rows: activeCampaigns } = await pool.query(
      `SELECT
         c.id, c.name, c.campaign_type, c.status, c.created_at,
         c.language_priority,
         COUNT(ct.id)                                        AS total_contacts,
         COUNT(ct.id) FILTER (WHERE ct.status = 'completed') AS completed_contacts,
         COUNT(ct.id) FILTER (WHERE ct.status = 'pending')   AS pending_contacts,
         COUNT(ct.id) FILTER (WHERE ct.status = 'calling')   AS calling_contacts,
         COUNT(ct.id) FILTER (WHERE ct.status = 'failed')    AS failed_contacts
       FROM campaigns c
       LEFT JOIN contacts ct ON ct.campaign_id = c.id
       WHERE c.user_id = $1 AND c.status IN ('active', 'paused')
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [userId]
    )

    // ── 2. Recent campaigns (last 5, any status) ──────────────
    const { rows: recentCampaigns } = await pool.query(
      `SELECT
         c.id, c.name, c.campaign_type, c.status, c.created_at,
         COUNT(ct.id)                                        AS total_contacts,
         COUNT(ct.id) FILTER (WHERE ct.status = 'completed') AS completed_contacts
       FROM campaigns c
       LEFT JOIN contacts ct ON ct.campaign_id = c.id
       WHERE c.user_id = $1 AND c.status NOT IN ('active', 'paused')
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT 5`,
      [userId]
    )

    // ── 3. Today's call stats ─────────────────────────────────
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { rows: todayRows } = await pool.query(
      `SELECT
         COUNT(cl.id)                                                AS total_calls,
         COUNT(cl.id) FILTER (WHERE cl.outcome = 'completed')       AS completed,
         COUNT(cl.id) FILTER (WHERE cl.outcome = 'no_answer')       AS no_answer,
         COUNT(cl.id) FILTER (WHERE cl.outcome = 'failed')          AS failed,
         COUNT(cl.id) FILTER (WHERE cl.outcome = 'busy')            AS busy,
         ROUND(AVG(COALESCE(cl.billed_sec, cl.duration_sec))::NUMERIC, 0) AS avg_duration_sec,
         ROUND(SUM(COALESCE(cl.billed_sec, cl.duration_sec))::NUMERIC / 60, 1) AS total_minutes
       FROM call_logs cl
       JOIN campaigns c ON cl.campaign_id = c.id
       WHERE c.user_id = $1 AND COALESCE(cl.started_at, cl.ended_at) >= $2`,
      [userId, todayStart]
    )
    const today = todayRows[0]

    // ── 4. This month's stats ─────────────────────────────────
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { rows: monthRows } = await pool.query(
      `SELECT
         COUNT(cl.id)                                                AS total_calls,
         COUNT(cl.id) FILTER (WHERE cl.outcome = 'completed')       AS completed,
         ROUND(SUM(COALESCE(cl.billed_sec, cl.duration_sec))::NUMERIC / 60, 1) AS total_minutes
       FROM call_logs cl
       JOIN campaigns c ON cl.campaign_id = c.id
       WHERE c.user_id = $1 AND COALESCE(cl.started_at, cl.ended_at) >= $2`,
      [userId, monthStart]
    )
    const month = monthRows[0]

    // ── 5. Recent call activity (last 10 calls) ───────────────
    const { rows: recentCalls } = await pool.query(
      `SELECT
         cl.id, cl.outcome, cl.started_at,
         COALESCE(cl.billed_sec, cl.duration_sec) AS duration_sec,
         cl.acknowledged,
         c.name AS campaign_name,
         ct.phone, ct.variables
       FROM call_logs cl
       JOIN campaigns c  ON cl.campaign_id = c.id
       JOIN contacts  ct ON cl.contact_id  = ct.id
       WHERE c.user_id = $1
       ORDER BY COALESCE(cl.started_at, cl.ended_at) DESC
       LIMIT 10`,
      [userId]
    )

    // ── 6. Total counts ───────────────────────────────────────
    const { rows: totals } = await pool.query(
      `SELECT
         COUNT(DISTINCT c.id)  AS total_campaigns,
         COUNT(cl.id)          AS total_calls_ever
       FROM campaigns c
       LEFT JOIN call_logs cl ON cl.campaign_id = c.id
       WHERE c.user_id = $1`,
      [userId]
    )

    // ── 7. Plan + usage ───────────────────────────────────────
    const usageSummary = await planService.getUsageSummary(userId)

    // ── Answer rate ───────────────────────────────────────────
    const totalToday     = parseInt(today.total_calls || 0)
    const completedToday = parseInt(today.completed   || 0)
    const answerRate     = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : null

    res.json({
      active_campaigns:  activeCampaigns.map(c => ({
        ...c,
        total_contacts:     parseInt(c.total_contacts),
        completed_contacts: parseInt(c.completed_contacts),
        pending_contacts:   parseInt(c.pending_contacts),
        calling_contacts:   parseInt(c.calling_contacts),
        failed_contacts:    parseInt(c.failed_contacts),
        progress_pct: parseInt(c.total_contacts) > 0
          ? Math.round((parseInt(c.completed_contacts) / parseInt(c.total_contacts)) * 100)
          : 0,
      })),
      recent_campaigns:  recentCampaigns.map(c => ({
        ...c,
        total_contacts:     parseInt(c.total_contacts),
        completed_contacts: parseInt(c.completed_contacts),
      })),
      today: {
        total_calls:      parseInt(today.total_calls  || 0),
        completed:        parseInt(today.completed    || 0),
        no_answer:        parseInt(today.no_answer    || 0),
        failed:           parseInt(today.failed       || 0),
        busy:             parseInt(today.busy         || 0),
        avg_duration_sec: parseInt(today.avg_duration_sec || 0),
        total_minutes:    parseFloat(today.total_minutes  || 0),
        answer_rate:      answerRate,
      },
      month: {
        total_calls:   parseInt(month.total_calls  || 0),
        completed:     parseInt(month.completed    || 0),
        total_minutes: parseFloat(month.total_minutes || 0),
      },
      totals: {
        campaigns:   parseInt(totals[0]?.total_campaigns    || 0),
        calls_ever:  parseInt(totals[0]?.total_calls_ever   || 0),
      },
      recent_calls: recentCalls.map(cl => ({
        ...cl,
        duration_sec: parseInt(cl.duration_sec || 0),
        variables: typeof cl.variables === 'string'
          ? (() => { try { return JSON.parse(cl.variables) } catch { return {} } })()
          : cl.variables || {},
      })),
      usage: usageSummary,
    })
  } catch (err) { next(err) }
})

module.exports = router
