// src/repositories/wallet.repo.js
// All DB operations for the wallet system
const pool = require('../db/supabaseClient')

const walletRepo = {

  // ── Get wallet info for a user ──────────────────────────────
  async getWallet(userId) {
    const { rows } = await pool.query(
      `SELECT wallet_balance, total_recharged, total_spent
       FROM users WHERE id = $1`,
      [userId]
    )
    return rows[0] || { wallet_balance: 0, total_recharged: 0, total_spent: 0 }
  },

  // ── Get current call rate ───────────────────────────────────
  async getRate() {
    const { rows } = await pool.query(
      `SELECT rate_per_min FROM call_rates WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1`
    )
    return parseFloat(rows[0]?.rate_per_min || 1.00)
  },

  // ── List wallet transactions (paginated) ────────────────────
  async getTransactions(userId, limit = 50, offset = 0) {
    const { rows } = await pool.query(
      `SELECT * FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    return rows
  },

  // ── Recharge: credit wallet atomically ─────────────────────
  async creditWallet(userId, amount, description, referenceId, paymentRef = null) {
    const { rows } = await pool.query(
      `SELECT credit_wallet($1, $2, $3, $4, $5) AS new_balance`,
      [userId, amount, description, referenceId, paymentRef]
    )
    return parseFloat(rows[0]?.new_balance || 0)
  },

  // ── Deduct wallet after call ────────────────────────────────
  async deductWallet(userId, amount, description, referenceId) {
    const { rows } = await pool.query(
      `SELECT * FROM deduct_wallet($1, $2, $3, $4)`,
      [userId, amount, description, referenceId]
    )
    return rows[0] // { success, new_balance, error_msg }
  },

  // ── Create a recharge request ───────────────────────────────
  async createRechargeRequest(userId, amount) {
    const GST = 0.18
    const amountWithGst = Math.round(amount * (1 + GST) * 100) / 100
    const { rows } = await pool.query(
      `INSERT INTO recharge_requests (user_id, amount, amount_with_gst)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, amount, amountWithGst]
    )
    return rows[0]
  },

  // ── Complete a recharge request ─────────────────────────────
  async completeRechargeRequest(requestId, paymentRef) {
    // Get the request
    const { rows: req } = await pool.query(
      `UPDATE recharge_requests
       SET status = 'completed', payment_ref = $2, completed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [requestId, paymentRef]
    )
    if (!req[0]) throw new Error('Recharge request not found or already completed')

    // Credit the wallet
    const newBalance = await walletRepo.creditWallet(
      req[0].user_id,
      req[0].amount,
      `Wallet recharge`,
      requestId,
      paymentRef
    )
    return { request: req[0], newBalance }
  },

  // ── Get recharge history ────────────────────────────────────
  async getRechargeHistory(userId, limit = 20) {
    const { rows } = await pool.query(
      `SELECT * FROM recharge_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return rows
  },

  // ── Check if user has enough balance ───────────────────────
  async hasBalance(userId, minAmount = 0) {
    const { rows } = await pool.query(
      `SELECT wallet_balance FROM users WHERE id = $1`,
      [userId]
    )
    const bal = parseFloat(rows[0]?.wallet_balance || 0)
    return bal > minAmount
  },

  // ── Usage stats for dashboard ───────────────────────────────
  async getUsageStats(userId) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(cl.id)                                              AS total_calls,
         COALESCE(SUM(COALESCE(cl.billed_sec, cl.duration_sec)), 0) AS total_seconds,
         COALESCE(SUM(cl.billed_amount), 0)                        AS total_spent_calls,
         COUNT(CASE WHEN cl.outcome = 'completed' THEN 1 END)      AS answered_calls,
         COUNT(CASE WHEN cl.started_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS calls_today,
         COALESCE(SUM(CASE WHEN cl.started_at >= NOW() - INTERVAL '24 hours'
                           THEN cl.billed_amount ELSE 0 END), 0) AS spent_today
       FROM call_logs cl
       JOIN campaigns camp ON cl.campaign_id = camp.id
       WHERE camp.user_id = $1`,
      [userId]
    )
    return rows[0]
  },

  // ── Daily spend for the last 30 days ───────────────────────
  async getDailySpend(userId, days = 30) {
    const { rows } = await pool.query(
      `SELECT
         DATE(cl.started_at) AS day,
         COUNT(cl.id)        AS calls,
         COALESCE(SUM(cl.billed_amount), 0) AS amount,
         ROUND(SUM(COALESCE(cl.billed_sec, cl.duration_sec))::NUMERIC / 60, 2) AS minutes
       FROM call_logs cl
       JOIN campaigns camp ON cl.campaign_id = camp.id
       WHERE camp.user_id = $1
         AND cl.started_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY DATE(cl.started_at)
       ORDER BY day ASC`,
      [userId, days]
    )
    return rows
  },
}

module.exports = walletRepo
