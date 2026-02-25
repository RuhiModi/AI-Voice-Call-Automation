// src/services/scheduler.service.js
// Campaign call scheduler — MVP version using node-cron (no Redis required).
// BullMQ is in jobs/queue.js ready for when you scale to 1000+ calls/day.
//
// node-cron approach: track active campaigns in memory, pull pending
// contacts every 30 seconds and make calls up to concurrency limit.
const cron        = require('node-cron')
const { v4: uuidv4 } = require('uuid')
const config      = require('../config')
const campaignRepo = require('../repositories/campaign.repo')
const contactRepo  = require('../repositories/contact.repo')
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

// ── Callback check ─────────────────────────────────────────────
// Every minute — check for rescheduled callbacks that are now due
cron.schedule('* * * * *', async () => {
  try {
    const callbacks = await callRepo.getPendingCallbacks()
    for (const cb of callbacks) {
      const campaign = await campaignRepo.findById(cb.campaign_id)
      if (!campaign || campaign.status !== 'active') continue
      await _makeCall(cb.contact_id, cb.campaign_id)
      await callRepo.markCallbackQueued(cb.id)
      console.log(`[Scheduler] 📅 Callback triggered for contact ${cb.contact_id}`)
    }
  } catch (err) {
    console.error('[Scheduler] Callback check error:', err.message)
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

  // TRAI compliance: only call during allowed hours (IST)
  if (!_isWithinCallingHours(campaign)) {
    console.log(`[Scheduler] Outside calling hours for: ${campaign.name}`)
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
    }
    return
  }

  // Make calls — stagger by 2s each to avoid spam detection
  for (let i = 0; i < contacts.length; i++) {
    setTimeout(() => _makeCall(contacts[i].id, campaignId, campaign)
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

    await makeOutboundCall(campaign.caller_id, contact.phone, sessionId, serverUrl)
    console.log(`[Scheduler] 📞 Calling ${contact.phone} — session: ${sessionId}`)
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

module.exports = schedulerService

