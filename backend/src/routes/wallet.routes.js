// src/routes/wallet.routes.js
// Wallet: balance, recharge, transactions, admin credit
const express   = require('express')
const router    = express.Router()
const auth      = require('../middleware/auth')
const walletRepo = require('../repositories/wallet.repo')

const MIN_RECHARGE = 500   // ₹500 minimum top-up

// ── GET /wallet — balance + stats ───────────────────────────────
router.get('/', auth, async (req, res, next) => {
  try {
    const [wallet, stats, rate] = await Promise.all([
      walletRepo.getWallet(req.userId),
      walletRepo.getUsageStats(req.userId),
      walletRepo.getRate(),
    ])
    res.json({ ...wallet, stats, rate_per_min: rate })
  } catch (err) { next(err) }
})

// ── GET /wallet/transactions ─────────────────────────────────────
router.get('/transactions', auth, async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || 50), 200)
    const offset = parseInt(req.query.offset || 0)
    const txns = await walletRepo.getTransactions(req.userId, limit, offset)
    res.json(txns)
  } catch (err) { next(err) }
})

// ── GET /wallet/recharge-history ─────────────────────────────────
router.get('/recharge-history', auth, async (req, res, next) => {
  try {
    const history = await walletRepo.getRechargeHistory(req.userId)
    res.json(history)
  } catch (err) { next(err) }
})

// ── GET /wallet/daily-spend ─────────────────────────────────────
router.get('/daily-spend', auth, async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days || 30), 90)
    const data = await walletRepo.getDailySpend(req.userId, days)
    res.json(data)
  } catch (err) { next(err) }
})

// ── POST /wallet/recharge — initiate a top-up ──────────────────
// In production: integrate Razorpay here. For now → manual/demo mode.
router.post('/recharge', auth, async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount)
    if (!amount || isNaN(amount)) return res.status(400).json({ error: 'amount required' })
    if (amount < MIN_RECHARGE) {
      return res.status(400).json({ error: `Minimum recharge amount is ₹${MIN_RECHARGE}` })
    }

    const request = await walletRepo.createRechargeRequest(req.userId, amount)

    // ── DEMO / MANUAL MODE ──────────────────────────────────────
    // Remove this block and replace with Razorpay order creation in production.
    // For now we immediately complete the recharge so you can test the UI.
    const result = await walletRepo.completeRechargeRequest(request.id, `DEMO-${Date.now()}`)
    return res.json({
      success: true,
      message: `₹${amount} added to your wallet`,
      new_balance: result.newBalance,
      request_id: request.id,
    })
    // ── END DEMO MODE ───────────────────────────────────────────

    // Razorpay integration (uncomment when ready):
    // const order = await razorpay.orders.create({ amount: request.amount_with_gst * 100, currency: 'INR', receipt: request.id })
    // res.json({ request_id: request.id, order_id: order.id, amount: request.amount_with_gst, key: process.env.RAZORPAY_KEY_ID })
  } catch (err) { next(err) }
})

// ── POST /wallet/recharge/:id/complete — Razorpay webhook/callback ──
router.post('/recharge/:id/complete', auth, async (req, res, next) => {
  try {
    const { payment_ref } = req.body
    if (!payment_ref) return res.status(400).json({ error: 'payment_ref required' })
    const result = await walletRepo.completeRechargeRequest(req.params.id, payment_ref)
    res.json({ success: true, new_balance: result.newBalance })
  } catch (err) { next(err) }
})

// ── POST /wallet/deduct — called internally after calls ─────────
// (Internal use — from call engine / scheduler, NOT exposed to users)
router.post('/deduct', async (req, res, next) => {
  try {
    const { user_id, amount, description, reference_id, internal_key } = req.body
    if (internal_key !== process.env.INTERNAL_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const result = await walletRepo.deductWallet(user_id, amount, description, reference_id)
    if (!result.success) {
      return res.status(402).json({ error: result.error_msg, balance: result.new_balance })
    }
    res.json({ success: true, new_balance: result.new_balance })
  } catch (err) { next(err) }
})

module.exports = router
