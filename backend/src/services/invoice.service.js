// src/services/invoice.service.js
// Generates invoices from call_logs for a given period.
// Stores in DB + generates downloadable HTML invoice.

const pool = require('../db/supabaseClient')

const GST_RATE = 0.18

// ── Generate invoice for a user for a given month ─────────────
// month format: '2026-03' (YYYY-MM)
async function generateInvoice(userId, month) {
  const [year, mon] = month.split('-').map(Number)
  const periodStart = new Date(year, mon - 1, 1)
  const periodEnd   = new Date(year, mon, 1)

  // Check if invoice already exists for this period
  const { rows: existing } = await pool.query(
    `SELECT id FROM invoices
     WHERE user_id = $1
       AND period_start = $2
       AND period_end   = $3`,
    [userId, periodStart, periodEnd]
  )
  if (existing[0]) {
    return { invoice: await _getFullInvoice(existing[0].id, userId), alreadyExists: true }
  }

  // Get user info
  const { rows: userRows } = await pool.query(
    `SELECT email, company_name, u.plan,
            p.rate_per_min,
            p.cost_calling, p.cost_ai, p.cost_infra, p.cost_service_fee
     FROM users u LEFT JOIN plans p ON p.id = u.plan
     WHERE u.id = $1`,
    [userId]
  )
  const user = userRows[0]
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 })
  const rate        = parseFloat(user.rate_per_min     || 4.00)
  const costBreakdown = {
    calling:     parseFloat(user.cost_calling     || 0.90),
    ai:          parseFloat(user.cost_ai          || 1.00),
    infra:       parseFloat(user.cost_infra       || 0.60),
    service_fee: parseFloat(user.cost_service_fee || 1.50),
  }

  // Get usage per campaign for the period
  const { rows: campRows } = await pool.query(
    `SELECT
       camp.id          AS campaign_id,
       camp.name        AS campaign_name,
       COUNT(cl.id)     AS total_calls,
       ROUND(SUM(COALESCE(cl.billed_sec, cl.duration_sec))::NUMERIC / 60, 2) AS total_minutes
     FROM call_logs cl
     JOIN campaigns camp ON cl.campaign_id = camp.id
     WHERE camp.user_id  = $1
       AND COALESCE(cl.started_at, cl.ended_at) >= $2
       AND COALESCE(cl.started_at, cl.ended_at) < $3
       AND COALESCE(cl.billed_sec, cl.duration_sec) > 0
     GROUP BY camp.id, camp.name
     ORDER BY total_calls DESC`,
    [userId, periodStart, periodEnd]
  )

  if (campRows.length === 0) {
    throw Object.assign(new Error('No billed calls in this period — nothing to invoice'), { status: 400 })
  }

  // Calculate totals
  const lineItems = campRows.map(c => {
    const minutes   = parseFloat(c.total_minutes)
    const subtotal  = Math.round(minutes * rate * 100) / 100
    const gst       = Math.round(subtotal * GST_RATE * 100) / 100
    const lineTotal = Math.round((subtotal + gst) * 100) / 100
    return {
      campaign_id:   c.campaign_id,
      description:   c.campaign_name,
      calls:         parseInt(c.total_calls),
      minutes,
      rate,
      subtotal,
      gst,
      line_total:    lineTotal,
      // cost breakdown per campaign line
      cost_calling:     Math.round(minutes * costBreakdown.calling * 100) / 100,
      cost_ai:          Math.round(minutes * costBreakdown.ai * 100) / 100,
      cost_infra:       Math.round(minutes * costBreakdown.infra * 100) / 100,
      cost_service_fee: Math.round(minutes * costBreakdown.service_fee * 100) / 100,
    }
  })

  const totalCalls   = lineItems.reduce((s, l) => s + l.calls, 0)
  const totalMinutes = lineItems.reduce((s, l) => s + l.minutes, 0)
  const subtotal     = Math.round(lineItems.reduce((s, l) => s + l.subtotal, 0) * 100) / 100
  const totalGst     = Math.round(subtotal * GST_RATE * 100) / 100
  const totalAmount  = Math.round((subtotal + totalGst) * 100) / 100
  // Overall cost breakdown totals (for invoice display)
  const totalBreakdown = {
    calling:     Math.round(totalMinutes * costBreakdown.calling * 100) / 100,
    ai:          Math.round(totalMinutes * costBreakdown.ai * 100) / 100,
    infra:       Math.round(totalMinutes * costBreakdown.infra * 100) / 100,
    service_fee: Math.round(totalMinutes * costBreakdown.service_fee * 100) / 100,
  }

  // Generate invoice number: INV-YYYYMM-XXXX
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM invoices WHERE user_id = $1`, [userId]
  )
  const seq = String(parseInt(countRows[0].cnt) + 1).padStart(4, '0')
  const invoiceNumber = `INV-${year}${String(mon).padStart(2, '0')}-${seq}`

  // Insert invoice
  const { rows: invRows } = await pool.query(
    `INSERT INTO invoices
       (user_id, invoice_number, status, period_start, period_end,
        total_calls, total_minutes, total_amount)
     VALUES ($1,$2,'draft',$3,$4,$5,$6,$7) RETURNING *`,
    [userId, invoiceNumber, periodStart, periodEnd, totalCalls,
     Math.round(totalMinutes * 100) / 100, totalAmount]
  )
  const invoice = invRows[0]

  // Insert line items
  for (const item of lineItems) {
    await pool.query(
      `INSERT INTO invoice_line_items
         (invoice_id, campaign_id, campaign_name, description, calls_count, total_minutes, rate_per_min, line_total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [invoice.id, item.campaign_id, item.description,
       item.description, item.calls, item.minutes, item.rate, item.line_total]
    )
  }

  const full = await _getFullInvoice(invoice.id, userId)
  // Attach breakdown for HTML generation (not stored in DB, computed fresh)
  full.cost_breakdown  = totalBreakdown
  full.cost_rates      = costBreakdown
  full.total_minutes_all = Math.round(totalMinutes * 100) / 100
  return { invoice: full, alreadyExists: false }
}

// ── Get full invoice with line items + user info ──────────────
async function _getFullInvoice(invoiceId, userId) {
  const { rows: invRows } = await pool.query(
    `SELECT i.*, u.email, u.company_name
     FROM invoices i JOIN users u ON u.id = i.user_id
     WHERE i.id = $1 AND i.user_id = $2`,
    [invoiceId, userId]
  )
  if (!invRows[0]) return null
  const { rows: lines } = await pool.query(
    `SELECT ili.*, camp.name AS campaign_name
     FROM invoice_line_items ili
     LEFT JOIN campaigns camp ON camp.id = ili.campaign_id
     WHERE ili.invoice_id = $1 ORDER BY ili.line_total DESC`,
    [invoiceId]
  )
  const inv = invRows[0]
  const subtotal = parseFloat(inv.total_amount) / (1 + GST_RATE)
  return {
    ...inv,
    subtotal:  Math.round(subtotal * 100) / 100,
    gst:       Math.round(subtotal * GST_RATE * 100) / 100,
    gst_rate:  GST_RATE,
    line_items: lines,
  }
}

// ── Generate HTML for a downloadable invoice ─────────────────
function generateInvoiceHTML(invoice) {
  const fmt    = n => '₹' + Number(n || 0).toFixed(2)
  const fmtInt = n => Number(n || 0).toLocaleString('en-IN')
  const subtotal = invoice.subtotal || (parseFloat(invoice.total_amount) / 1.18)
  const gst      = invoice.gst      || (subtotal * 0.18)
  const minutes  = parseFloat(invoice.total_minutes_all || invoice.total_minutes || 0)

  // Cost breakdown (from plan config)
  const bd = invoice.cost_breakdown || {}
  const cr = invoice.cost_rates     || {}
  const hasBd = bd.calling != null

  // Campaign rows
  const campRows = (invoice.line_items || []).map(l => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea">${l.campaign_name || l.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:center">${fmtInt(l.calls_count)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:center">${Number(l.total_minutes).toFixed(1)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right;font-weight:600">${fmt(l.line_total)}</td>
    </tr>`).join('')

  // Breakdown rows
  const breakdownRows = hasBd ? `
    <tr style="background:#faf8f4">
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea">Calling &amp; Connectivity</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right;color:#6b6b6b">₹${Number(cr.calling||0).toFixed(2)}/min</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right">${fmt(bd.calling)}</td>
    </tr>
    <tr style="background:#faf8f4">
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea">AI Processing</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right;color:#6b6b6b">₹${Number(cr.ai||0).toFixed(2)}/min</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right">${fmt(bd.ai)}</td>
    </tr>
    <tr style="background:#faf8f4">
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea">Platform &amp; Infrastructure</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right;color:#6b6b6b">₹${Number(cr.infra||0).toFixed(2)}/min</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right">${fmt(bd.infra)}</td>
    </tr>
    <tr style="background:#faf8f4">
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;font-weight:600">Service Fee</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right;color:#6b6b6b">₹${Number(cr.service_fee||0).toFixed(2)}/min</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f5f1ea;text-align:right;font-weight:600">${fmt(bd.service_fee)}</td>
    </tr>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#1a1a1a; background:#fff; padding:40px; max-width:820px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; padding-bottom:24px; border-bottom:2px solid #1a1a1a; }
    .brand { font-size:24px; font-weight:800; letter-spacing:-0.5px; }
    .brand span { color:#f5a623; }
    .invoice-meta { text-align:right; }
    .invoice-number { font-size:20px; font-weight:700; margin-bottom:4px; }
    .status { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; background:#fef3d0; color:#b86f0e; }
    .status.paid { background:#dcf3e5; color:#228248; }
    .parties { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px; }
    .party h4 { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#a8a8a8; margin-bottom:8px; }
    .party p { font-size:13px; line-height:1.6; color:#3d3d3d; }
    .party .name { font-size:15px; font-weight:700; color:#1a1a1a; margin-bottom:2px; }
    .section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#a8a8a8; margin:28px 0 10px; }
    table { width:100%; border-collapse:collapse; margin-bottom:8px; }
    thead tr { background:#1a1a1a; }
    thead th { padding:10px 12px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#fff; }
    thead th:last-child, thead th.right { text-align:right; }
    .totals { margin-left:auto; width:300px; margin-top:24px; }
    .totals-row { display:flex; justify-content:space-between; padding:8px 0; font-size:13px; border-bottom:1px solid #f5f1ea; }
    .totals-row.total { font-size:17px; font-weight:800; padding-top:12px; border-bottom:none; color:#1a1a1a; }
    .totals-row.gst { color:#6b6b6b; }
    .divider { border:none; border-top:1px solid #f5f1ea; margin:20px 0; }
    .footer { margin-top:40px; padding-top:20px; border-top:1px solid #f5f1ea; font-size:11px; color:#a8a8a8; text-align:center; line-height:1.8; }
    .summary-box { background:#faf8f4; border-radius:12px; padding:16px 20px; margin-bottom:24px; display:flex; gap:32px; flex-wrap:wrap; }
    .summary-item { font-size:12px; color:#6b6b6b; }
    .summary-item strong { display:block; font-size:15px; font-weight:700; color:#1a1a1a; margin-bottom:2px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">VoiceAI <span>India</span></div>
      <p style="font-size:12px;color:#a8a8a8;margin-top:4px">AI Voice Campaign Platform</p>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${invoice.invoice_number}</div>
      <div style="font-size:12px;color:#6b6b6b;margin:4px 0">
        ${new Date(invoice.period_start).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
        &nbsp;–&nbsp;
        ${new Date(invoice.period_end).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
      </div>
      <span class="status ${invoice.status === 'paid' ? 'paid' : ''}">${invoice.status}</span>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <h4>From</h4>
      <p class="name">VoiceAI India</p>
      <p>AI Voice Campaign Platform</p>
      <p>billing@voiceai.in</p>
    </div>
    <div class="party">
      <h4>Bill To</h4>
      <p class="name">${invoice.company_name || invoice.email}</p>
      <p>${invoice.email}</p>
    </div>
  </div>

  <!-- Summary bar -->
  <div class="summary-box">
    <div class="summary-item"><strong>${fmtInt(invoice.total_calls)}</strong>Total Calls</div>
    <div class="summary-item"><strong>${Number(minutes).toFixed(1)} min</strong>Total Duration</div>
    <div class="summary-item"><strong>${fmt(subtotal)}</strong>Subtotal</div>
    <div class="summary-item"><strong>${fmt(gst)}</strong>GST (18%)</div>
    <div class="summary-item"><strong style="color:#f5a623">${fmt(invoice.total_amount)}</strong>Total Due</div>
  </div>

  <!-- Campaign breakdown -->
  <div class="section-label">Campaign Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Campaign</th>
        <th style="text-align:center">Calls</th>
        <th style="text-align:center">Minutes</th>
        <th class="right">Amount (incl. GST)</th>
      </tr>
    </thead>
    <tbody>${campRows}</tbody>
  </table>

  <!-- Charges breakdown -->
  ${hasBd ? `
  <div class="section-label" style="margin-top:24px">Charges Breakdown · ${Number(minutes).toFixed(1)} minutes</div>
  <table>
    <thead>
      <tr>
        <th>Component</th>
        <th class="right">Rate/min</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${breakdownRows}</tbody>
  </table>` : ''}

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="totals-row gst"><span>GST @ 18%</span><span>${fmt(gst)}</span></div>
    <div class="totals-row total"><span>Total Due</span><span>${fmt(invoice.total_amount)}</span></div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for using VoiceAI India &nbsp;·&nbsp; This is a computer-generated invoice</p>
    <p>Billing starts from call initiation (ringing) &nbsp;·&nbsp; GST @ 18% applied on all charges</p>
    <p>For billing queries: billing@voiceai.in</p>
  </div>
</body>
</html>`
}

// ── Auto-generate invoices for all users at month end ─────────
// Call this from a cron job on the 1st of each month
async function generateMonthlyInvoices() {
  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}` // previous month
  console.log(`[Invoice] Generating invoices for ${month}`)

  const { rows: users } = await pool.query('SELECT id FROM users')
  let generated = 0, skipped = 0

  for (const user of users) {
    try {
      const { alreadyExists } = await generateInvoice(user.id, month)
      if (!alreadyExists) generated++
      else skipped++
    } catch (err) {
      if (err.status === 400) skipped++ // no calls this month
      else console.error(`[Invoice] Failed for user ${user.id}:`, err.message)
    }
  }

  console.log(`[Invoice] Done — generated: ${generated}, skipped: ${skipped}`)
  return { generated, skipped }
}

module.exports = { generateInvoice, generateInvoiceHTML, generateMonthlyInvoices, _getFullInvoice }
