// src/routes/billing.routes.js
const pool    = require('../db/supabaseClient')
const express     = require('express')
const auth        = require('../middleware/auth')
const billingRepo    = require('../repositories/billing.repo')
const invoiceService = require('../services/invoice.service')
const planService = require('../services/plan.service')

const router = express.Router()

// All billing routes require authentication
// ── GET /billing/invoices/:id/download — NO AUTH MIDDLEWARE ──
// Opens directly in browser tab so uses ?token= query param
router.get('/invoices/:id/download', async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken')
    const raw = req.query.token || (req.headers.authorization || '').replace('Bearer ', '')
    if (!raw) return res.status(401).send('<h3>Unauthorized — missing token</h3>')
    let userId
    try {
      const decoded = jwt.verify(raw, process.env.JWT_SECRET)
      userId = decoded.userId || decoded.id || decoded.sub
    } catch (e) {
      return res.status(401).send('<h3>Invalid or expired token</h3>')
    }
    const invoice = await invoiceService._getFullInvoice(req.params.id, userId)
    if (!invoice) return res.status(404).send('<h3>Invoice not found</h3>')
    const html = invoiceService.generateInvoiceHTML(invoice)
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.html"`)
    res.send(html)
  } catch (err) { next(err) }
})

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

    const [campaigns, totals, rate, planInfo] = await Promise.all([
      billingRepo.getUsageSummary(req.userId, start, end),
      billingRepo.getTotals(req.userId, start, end),
      billingRepo.getUserRate(req.userId),
      pool.query(
        `SELECT cost_calling, cost_ai, cost_infra, cost_service_fee
         FROM plans p JOIN users u ON u.plan = p.id
         WHERE u.id = $1`, [req.userId]
      ),
    ])
    const costs = planInfo.rows[0] || { cost_calling:0.90, cost_ai:1.00, cost_infra:0.60, cost_service_fee:1.50 }

    const GST_RATE     = 0.18
    const totalMinutes = parseFloat(totals?.total_minutes || 0)
    const subtotal     = Math.round(totalMinutes * rate * 100) / 100
    const gst          = Math.round(subtotal * GST_RATE * 100) / 100
    const totalAmount  = Math.round((subtotal + gst) * 100) / 100

    // Add GST to each campaign line too
    const campaignsWithAmount = campaigns.map(c => {
      const sub = Math.round(parseFloat(c.total_minutes) * rate * 100) / 100
      const cgst = Math.round(sub * GST_RATE * 100) / 100
      return {
        ...c,
        total_calls:   parseInt(c.total_calls),
        total_minutes: parseFloat(c.total_minutes),
        subtotal:      sub,
        gst:           cgst,
        amount:        Math.round((sub + cgst) * 100) / 100,
      }
    })

    const breakdown = {
      calling:     Math.round(totalMinutes * parseFloat(costs.cost_calling)     * 100) / 100,
      ai:          Math.round(totalMinutes * parseFloat(costs.cost_ai)          * 100) / 100,
      infra:       Math.round(totalMinutes * parseFloat(costs.cost_infra)       * 100) / 100,
      service_fee: Math.round(totalMinutes * parseFloat(costs.cost_service_fee) * 100) / 100,
    }
    const breakdownRates = {
      calling:     parseFloat(costs.cost_calling),
      ai:          parseFloat(costs.cost_ai),
      infra:       parseFloat(costs.cost_infra),
      service_fee: parseFloat(costs.cost_service_fee),
    }

    res.json({
      period: {
        start: start.toISOString(),
        end:   end.toISOString(),
        label: start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      },
      totals: {
        calls:     parseInt(totals?.total_calls    || 0),
        minutes:   totalMinutes,
        subtotal,
        gst,
        amount:    totalAmount,
        campaigns: parseInt(totals?.campaigns_count || 0),
      },
      campaigns: campaignsWithAmount,
      rate_per_min:    rate,
      gst_rate:        GST_RATE,
      breakdown,
      breakdown_rates: breakdownRates,
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

    const GST_RATE   = 0.18
    const withAmount = months.map(m => {
      const sub  = Math.round(parseFloat(m.total_minutes) * rate * 100) / 100
      const gst  = Math.round(sub * GST_RATE * 100) / 100
      return {
        month:         m.month,
        total_calls:   parseInt(m.total_calls),
        total_minutes: parseFloat(m.total_minutes),
        subtotal:      sub,
        gst,
        amount:        Math.round((sub + gst) * 100) / 100,
      }
    })

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

// ── GET /billing/usage-summary ─────────────────────────────
// Full plan + usage summary for dashboard/billing page
router.get('/usage-summary', async (req, res, next) => {
  try {
    const summary = await planService.getUsageSummary(req.userId)
    res.json(summary)
  } catch (err) { next(err) }
})

// ── GET /billing/plans ──────────────────────────────────────
// All available plans (for upgrade UI)
router.get('/plans', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM plans WHERE is_active = TRUE ORDER BY price_monthly ASC'
    )
    res.json({ plans: rows })
  } catch (err) { next(err) }
})

// ── POST /billing/upgrade ───────────────────────────────────
// Admin-only plan change (in production, hook this to payment gateway)
router.post('/upgrade', async (req, res, next) => {
  try {
    const { plan } = req.body
    if (!plan) return res.status(400).json({ error: 'plan is required' })
    const { rows } = await pool.query('SELECT id FROM plans WHERE id = $1 AND is_active = TRUE', [plan])
    if (!rows[0]) return res.status(400).json({ error: 'Invalid plan' })
    await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, req.userId])
    const summary = await planService.getUsageSummary(req.userId)
    res.json({ success: true, ...summary })
  } catch (err) { next(err) }
})

// ── POST /billing/invoices/generate ────────────────────────
// Generate invoice for a given month (format: 2026-03)
router.post('/invoices/generate', async (req, res, next) => {
  try {
    const { month } = req.body
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month is required in YYYY-MM format' })
    }
    const { invoice, alreadyExists } = await invoiceService.generateInvoice(req.userId, month)
    res.json({ invoice, already_exists: alreadyExists })
  } catch (err) { next(err) }
})



module.exports = router
