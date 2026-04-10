// src/services/scheduler.service.js
// Campaign call scheduler — MVP version using node-cron (no Redis required).
// BullMQ is in jobs/queue.js ready for when you scale to 1000+ calls/day.
//
// node-cron approach: track active campaigns in memory, pull pending
// contacts every 30 seconds and make calls up to concurrency limit.
const cron        = require('node-cron')
const { v4: uuidv4 } = require('uuid')
const config      = require('../config')
const campaignRepo  = require('../repositories/campaign.repo')
const planService    = require('./plan.service')
const invoiceService = require('./invoice.service')
const contactRepo  = require('../repositories/contact.repo')
const dncRepo      = require('../repositories/dnc.repo')
const callRepo     = require('../repositories/call.repo')
const { makeOutboundCall } = require('../telephony')
const { CallSession, activeSessions } = require('../call-engine/session')

// Track which campaigns the scheduler is actively working on
const activeCampaigns = new Set()

const schedulerService = {

  /**
   * Launch a campaign — start scheduling its calls.
   * Non-blocking: registers the campaign ID, scheduler loop picks it up.
   */
  launch(campaign) {
    activeCampaigns.add(campaign.id)
    console.log(`[Scheduler] 🚀 Campaign registered: ${campaign.name}`)
    // Trigger immediately without waiting for next cron tick
    _processCampaign(campaign.id).catch(err =>
      console.error(`[Scheduler] Launch error for ${campaign.name}:`, err.message)
    )
  },

  /**
   * Pause a campaign — stop scheduling new calls.
   * Calls already in-progress will finish normally.
   */
  pause(campaignId) {
    activeCampaigns.delete(campaignId)
    console.log(`[Scheduler] ⏸️ Campaign paused: ${campaignId}`)
  },

}

// ── Core scheduling loop ───────────────────────────────────────
// Runs every 30 seconds — picks up pending contacts for all active campaigns
cron.schedule('*/30 * * * * *', async () => {
  for (const campaignId of activeCampaigns) {
    await _processCampaign(campaignId).catch(err =>
      console.error(`[Scheduler] Process error for ${campaignId}:`, err.message)
    )
  }
})

// ── Scheduled campaigns check ──────────────────────────────────
// Every minute — check for campaigns scheduled to start now
cron.schedule('* * * * *', async () => {
  try {
    const pool = require('../db/supabaseClient')
    const campaignRepo = require('../repositories/campaign.repo')
    const { rows } = await pool.query(
      `SELECT * FROM campaigns
       WHERE status = 'scheduled'
       AND (
         schedule_start <= NOW()
         OR schedule_start <= NOW() + INTERVAL '30 minutes'
       )`
    )
    for (const campaign of rows) {
      const schedTime = new Date(campaign.schedule_start)
      const now       = new Date()
      // Launch if within 5 minutes of scheduled time (handles timezone offset)
      const diffMs = schedTime - now
      if (diffMs > 5 * 60 * 1000) {
        console.log(`[Scheduler] ⏳ Campaign "${campaign.name}" scheduled in ${Math.round(diffMs/60000)}min`)
        continue
      }
      console.log(`[Scheduler] ⏰ Launching scheduled campaign: ${campaign.name}`)
      await campaignRepo.updateStatus(campaign.id, 'active')
      activeCampaigns.add(campaign.id)
      await _processCampaign(campaign.id).catch(err =>
        console.error(`[Scheduler] Scheduled launch error:`, err.message)
      )
    }
  } catch (err) {
    console.error('[Scheduler] Scheduled campaigns check error:', err.message)
  }
})

// ── Callback check ─────────────────────────────────────────────
// Every 5 minutes — check for rescheduled callbacks that are now due
cron.schedule('*/5 * * * *', async () => {
  try {
    const callbacks = await callRepo.getPendingCallbacks()
    if (!callbacks?.length) return
    for (const cb of callbacks) {
      const campaign = await campaignRepo.findById(cb.campaign_id)
      if (!campaign || campaign.status !== 'active') continue
      await _makeCall(cb.contact_id, cb.campaign_id)
      await callRepo.markCallbackQueued(cb.id)
      console.log(`[Scheduler] 📅 Callback triggered for contact ${cb.contact_id}`)
    }
  } catch (err) {
    // Suppress frequent timeout noise — only log non-timeout errors
    if (!err.message.includes('timeout')) {
      console.error('[Scheduler] Callback check error:', err.message)
    }
  }
})

// ── Process one campaign batch ─────────────────────────────────
async function _processCampaign(campaignId) {
  // Stop if campaign was paused/removed
  if (!activeCampaigns.has(campaignId)) return

  const campaign = await campaignRepo.findById(campaignId)
  if (!campaign || campaign.status !== 'active') {
    activeCampaigns.delete(campaignId)
    return
  }

  // Load user's Vobiz credentials — fall back to env if not set
  if (!campaign._vobizCreds) {
    const pool = require('../db/supabaseClient')
    const { rows } = await pool.query(
      'SELECT vobiz_auth_id, vobiz_auth_token, vobiz_from_number FROM users WHERE id = $1',
      [campaign.user_id]
    )
    const u = rows[0] || {}
    campaign._vobizCreds = {
      authId:     u.vobiz_auth_id     || process.env.VOBIZ_AUTH_ID,
      authToken:  u.vobiz_auth_token  || process.env.VOBIZ_AUTH_TOKEN,
      fromNumber: u.vobiz_from_number || process.env.VOBIZ_FROM_NUMBER,
    }
  }

  // TRAI compliance: only call during allowed hours (IST)
  if (!_isWithinCallingHours(campaign)) {
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    console.log(`[Scheduler] ⏰ Outside calling hours for: ${campaign.name} | IST: ${nowIST.getHours()}:${nowIST.getMinutes()} | Allowed: ${campaign.calling_hours_start} - ${campaign.calling_hours_end}`)
    return
  }

  // Respect concurrency limit — don't exceed max_concurrent_calls
  const currentActive = [...activeSessions.values()]
    .filter(s => s.campaign.id === campaignId).length

  const slots = (campaign.max_concurrent_calls || config.maxConcurrentCalls) - currentActive
  if (slots <= 0) return

  // Get next batch of pending contacts
  const contacts = await contactRepo.getPending(campaignId, slots)
  if (!contacts.length) {
    // Check if campaign is fully done
    const stats = await campaignRepo.getStats(campaignId)
    const remaining = parseInt(stats.pending) + parseInt(stats.calling) + parseInt(stats.scheduled)
    if (remaining === 0) {
      await campaignRepo.updateStatus(campaignId, 'completed')
      activeCampaigns.delete(campaignId)
      console.log(`✅ Campaign completed: ${campaign.name}`)
      // Fire campaign completion webhook
      if (campaign.webhook_url) {
        const { deliverCampaignWebhook } = require('../services/webhookDelivery')
        deliverCampaignWebhook(campaign)
          .catch(err => console.error('[Webhook] Campaign summary error:', err.message))
      }
    }
    return
  }

  // Check call limit before starting this batch
  const limitCheck = await planService.checkCallLimit(campaign.user_id)
  if (!limitCheck.allowed) {
    console.warn(`[Scheduler] ⛔ Call limit reached for user ${campaign.user_id} — pausing campaign ${campaignId}`)
    await campaignRepo.updateStatus(campaignId, 'paused')
    activeCampaigns.delete(campaignId)
    return
  }
  if (limitCheck.warning) {
    console.warn(`[Scheduler] ⚠️  ${limitCheck.warningMsg}`)
  }

  // DNC check — filter out blocked numbers before dialing
  const phones     = contacts.map(c => c.phone)
  const blockedSet = await dncRepo.getBlockedSet(campaign.user_id, phones)
  const allowed    = contacts.filter(c => !blockedSet.has(c.phone))
  const skipped    = contacts.length - allowed.length
  if (skipped > 0) {
    console.log(`[Scheduler] 🚫 Skipped ${skipped} DNC-blocked number(s) in campaign ${campaignId}`)
    // Mark skipped contacts as skipped so campaign can complete
    const blocked = contacts.filter(c => blockedSet.has(c.phone))
    for (const c of blocked) {
      await contactRepo.updateStatus(c.id, 'skipped', 'dnc_blocked')
    }
  }
  if (!allowed.length) return

  // Make calls — stagger by 2s each to avoid spam detection
  for (let i = 0; i < allowed.length; i++) {
    setTimeout(() => _makeCall(allowed[i].id, campaignId, campaign)
      .catch(err => console.error('[Scheduler] Call error:', err.message)),
      i * 2000
    )
  }
}

// ── Make a single outbound call ────────────────────────────────
async function _makeCall(contactId, campaignId, campaignData = null) {
  const campaign = campaignData || await campaignRepo.findById(campaignId)
  if (!campaign) return

  const pool    = require('../db/supabaseClient')
  const { rows } = await pool.query('SELECT * FROM contacts WHERE id = $1', [contactId])
  const contact   = rows[0]
  if (!contact) return

  await contactRepo.setCallingStatus(contactId)

  const sessionId  = `${campaignId.split('-')[0]}-${contactId.split('-')[0]}-${Date.now()}`
  const serverUrl  = config.serverUrl

  try {
    // Pre-create session so it's ready when WebSocket connects
    const session     = new CallSession(contact, campaign, null)
    session.sessionId = sessionId
    activeSessions.set(sessionId, session)

    // Use campaign caller_id → user's from_number → env fallback
    const creds      = campaign._vobizCreds || {}
    const fromNumber = campaign.caller_id || creds.fromNumber || config.vobizFromNumber
    if (!fromNumber) {
      console.error('[Scheduler] ❌ No from number — set it in Settings or on the campaign.')
      await contactRepo.updateStatus(contactId, 'failed', 'no_caller_id')
      return
    }
    if (!creds.authId || !creds.authToken) {
      console.error('[Scheduler] ❌ No Vobiz credentials — user must add them in Settings.')
      await contactRepo.updateStatus(contactId, 'failed', 'no_vobiz_creds')
      return
    }
    const callResult = await makeOutboundCall(fromNumber, contact.phone, sessionId, {
      authId:    creds.authId,
      authToken: creds.authToken,
    })
    // Store Vobiz callUuid on session so endCall() can proactively hang up
    const session = activeSessions.get(sessionId)
    if (session && callResult) {
      session.vobizCallUuid = callResult.call_uuid
        || callResult.objects?.[0]?.call_uuid
        || null
      session.vobizCreds = { authId: creds.authId, authToken: creds.authToken }
    }
    const uuid = session?.vobizCallUuid || 'pending'
    console.log(`[Scheduler] 📞 Calling ${contact.phone} | session: ${sessionId} | uuid: ${uuid}`)
  } catch (err) {
    console.error(`[Scheduler] Failed to call ${contact.phone}:`, err.message)
    activeSessions.delete(sessionId)
    await contactRepo.updateStatus(contactId, 'failed', 'call_failed')
  }
}

// ── Calling hours check ────────────────────────────────────────
function _isWithinCallingHours(campaign) {
  const nowIST     = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const hour       = nowIST.getHours()
  const startHour  = parseInt((campaign.calling_hours_start || config.defaultCallingStart).split(':')[0])
  const endHour    = parseInt((campaign.calling_hours_end   || config.defaultCallingEnd).split(':')[0])
  return hour >= startHour && hour < endHour
}

// ── Auto-generate invoices on 1st of each month ─────────────
function startInvoiceCron() {
  function scheduleNext() {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    next.setDate(1)
    next.setHours(0, 5, 0, 0)
    const delay = next.getTime() - Date.now()
    console.log(`[InvoiceCron] Next run scheduled for ${next.toISOString()}`)
    setTimeout(async () => {
      await invoiceService.generateMonthlyInvoices().catch(console.error)
      scheduleNext()
    }, delay)
  }
  const now = new Date()
  if (now.getDate() === 1 && now.getHours() < 6) {
    invoiceService.generateMonthlyInvoices().catch(console.error)
  }
  scheduleNext()
}

schedulerService.startInvoiceCron = startInvoiceCron
module.exports = schedulerService

// ── Startup recovery ───────────────────────────────────────────
// When server restarts, re-register all campaigns that are still 'active' in DB
// This prevents campaigns from stalling after a Render restart
async function recoverActiveCampaigns() {
  try {
    const pool = require('../db/supabaseClient')
    const { rows } = await pool.query(
      "SELECT * FROM campaigns WHERE status = 'active'"
    )
    if (rows.length === 0) return
    console.log(`[Scheduler] 🔄 Recovering ${rows.length} active campaign(s) after restart...`)
    for (const campaign of rows) {
      activeCampaigns.add(campaign.id)
      console.log(`[Scheduler] ✅ Re-registered: ${campaign.name}`)
    }
  } catch (err) {
    console.error('[Scheduler] Recovery error:', err.message)
  }
}

// Run recovery after 5s (give DB time to connect)
setTimeout(recoverActiveCampaigns, 5000)
