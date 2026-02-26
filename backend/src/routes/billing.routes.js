// src/routes/billing.routes.js
const express     = require('express')
const auth        = require('../middleware/auth')
const billingRepo = require('../repositories/billing.repo')

const router = express.Router()

// All billing routes require authentication
router.use(auth)

// ── GET /billing/summary?month=2026-02 ─────────────────────
// Usage + amount owed for a given month (defaults to current)
router.get('/summary', async (req, res, next) => {
  try {
    const { month } = req.query
    let start, end

    if (month) {
      // e.g. "2026-02"
      start = new Date(`${month}-01T00:00:00.000Z`)
      end   = new Date(start)
      end.setMonth(end.getMonth() + 1)
    } else {
      // Current month
      const now = new Date()
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    const [campaigns, totals, rate] = await Promise.all([
      billingRepo.getUsageSummary(req.userId, start, end),
      billingRepo.getTotals(req.userId, start, end),
      billingRepo.getUserRate(req.userId),
    ])

    // Calculate amounts using the user's rate
    const campaignsWithAmount = campaigns.map(c => ({
      ...c,
      total_calls:   parseInt(c.total_calls),
      total_minutes: parseFloat(c.total_minutes),
      amount:        Math.round(parseFloat(c.total_minutes) * rate * 100) / 100,
    }))

    const totalMinutes = parseFloat(totals?.total_minutes || 0)
    const totalAmount  = Math.round(totalMinutes * rate * 100) / 100

    res.json({
      period: {
        start: start.toISOString(),
        end:   end.toISOString(),
        label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      },
      totals: {
        calls:   parseInt(totals?.total_calls   || 0),
        minutes: totalMinutes,
        amount:  totalAmount,
        campaigns: parseInt(totals?.campaigns_count || 0),
      },
      campaigns: campaignsWithAmount,
      rate_per_min: rate,
    })
  } catch (err) { next(err) }
})

// ── GET /billing/monthly ────────────────────────────────────
// Last 6 months breakdown
router.get('/monthly', async (req, res, next) => {
  try {
    const [months, rate] = await Promise.all([
      billingRepo.getMonthlyBreakdown(req.userId),
      billingRepo.getUserRate(req.userId),
    ])

    const withAmount = months.map(m => ({
      month:        m.month,
      total_calls:  parseInt(m.total_calls),
      total_minutes: parseFloat(m.total_minutes),
      amount:       Math.round(parseFloat(m.total_minutes) * rate * 100) / 100,
    }))

    res.json({ months: withAmount, rate_per_min: rate })
  } catch (err) { next(err) }
})

// ── GET /billing/activity ───────────────────────────────────
// Last 30 days daily call activity
router.get('/activity', async (req, res, next) => {
  try {
    const days = await billingRepo.getDailyActivity(req.userId)
    res.json({ days })
  } catch (err) { next(err) }
})

// ── GET /billing/invoices ───────────────────────────────────
router.get('/invoices', async (req, res, next) => {
  try {
    const invoices = await billingRepo.getInvoices(req.userId)
    res.json({ invoices })
  } catch (err) { next(err) }
})

// ── GET /billing/invoices/:id ───────────────────────────────
router.get('/invoices/:id', async (req, res, next) => {
  try {
    const invoice = await billingRepo.getInvoice(req.params.id, req.userId)
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    res.json({ invoice })
  } catch (err) { next(err) }
})

module.exports = router
