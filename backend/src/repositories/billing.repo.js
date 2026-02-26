// src/repositories/billing.repo.js
const pool = require('../db/supabaseClient')

const billingRepo = {

  // ── Usage summary for a user over a date range ─────────────
  async getUsageSummary(userId, startDate, endDate) {
    const { rows } = await pool.query(
      `SELECT
         camp.id          AS campaign_id,
         camp.name        AS campaign_name,
         camp.status      AS campaign_status,
         COUNT(cl.id)                                  AS total_calls,
         SUM(cl.duration_sec)                          AS total_seconds,
         ROUND(SUM(cl.duration_sec)::NUMERIC / 60, 2) AS total_minutes
       FROM call_logs cl
       JOIN campaigns camp ON cl.campaign_id = camp.id
       WHERE camp.user_id  = $1
         AND cl.started_at >= $2
         AND cl.started_at <  $3
         AND cl.outcome = 'completed'
         AND cl.duration_sec > 0
       GROUP BY camp.id, camp.name, camp.status
       ORDER BY total_calls DESC`,
      [userId, startDate, endDate]
    )
    return rows
  },

  // ── Total stats for a user (all time or period) ─────────────
  async getTotals(userId, startDate, endDate) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(cl.id)                                  AS total_calls,
         SUM(cl.duration_sec)                          AS total_seconds,
         ROUND(SUM(cl.duration_sec)::NUMERIC / 60, 2) AS total_minutes,
         COUNT(DISTINCT cl.campaign_id)                AS campaigns_count
       FROM call_logs cl
       JOIN campaigns camp ON cl.campaign_id = camp.id
       WHERE camp.user_id  = $1
         AND cl.started_at >= $2
         AND cl.started_at <  $3
         AND cl.outcome = 'completed'
         AND cl.duration_sec > 0`,
      [userId, startDate, endDate]
    )
    return rows[0]
  },

  // ── Monthly breakdown (last 6 months) ──────────────────────
  async getMonthlyBreakdown(userId) {
    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', cl.started_at), 'Mon YYYY') AS month,
         DATE_TRUNC('month', cl.started_at)                      AS month_date,
         COUNT(cl.id)                                             AS total_calls,
         ROUND(SUM(cl.duration_sec)::NUMERIC / 60, 2)            AS total_minutes
       FROM call_logs cl
       JOIN campaigns camp ON cl.campaign_id = camp.id
       WHERE camp.user_id = $1
         AND cl.started_at >= NOW() - INTERVAL '6 months'
         AND cl.outcome = 'completed'
         AND cl.duration_sec > 0
       GROUP BY DATE_TRUNC('month', cl.started_at)
       ORDER BY month_date DESC`,
      [userId]
    )
    return rows
  },

  // ── Get user's billing rate ─────────────────────────────────
  async getUserRate(userId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(
         (SELECT rate_per_min FROM billing_rates
          WHERE user_id = $1 ORDER BY effective_from DESC LIMIT 1),
         (SELECT rate_per_min FROM billing_rates_default LIMIT 1),
         6.00
       ) AS rate_per_min`,
      [userId]
    )
    return parseFloat(rows[0]?.rate_per_min || 6.00)
  },

  // ── List invoices for a user ────────────────────────────────
  async getInvoices(userId) {
    const { rows } = await pool.query(
      `SELECT i.*, 
         (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) AS line_count
       FROM invoices i
       WHERE i.user_id = $1
       ORDER BY i.period_start DESC
       LIMIT 24`,
      [userId]
    )
    return rows
  },

  // ── Get one invoice with line items ────────────────────────
  async getInvoice(invoiceId, userId) {
    const { rows: inv } = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND user_id = $2',
      [invoiceId, userId]
    )
    if (!inv[0]) return null
    const { rows: lines } = await pool.query(
      'SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY line_total DESC',
      [invoiceId]
    )
    return { ...inv[0], line_items: lines }
  },

  // ── Daily call counts for sparkline (last 30 days) ─────────
  async getDailyActivity(userId) {
    const { rows } = await pool.query(
      `SELECT
         DATE(cl.started_at)  AS day,
         COUNT(cl.id)         AS calls,
         SUM(cl.duration_sec) AS seconds
       FROM call_logs cl
       JOIN campaigns camp ON cl.campaign_id = camp.id
       WHERE camp.user_id = $1
         AND cl.started_at >= NOW() - INTERVAL '30 days'
         AND cl.outcome = 'completed'
       GROUP BY DATE(cl.started_at)
       ORDER BY day ASC`,
      [userId]
    )
    return rows
  },

}

module.exports = billingRepo
