// src/jobs/cron.js
// ══════════════════════════════════════════════════════════════
// Lightweight cron scheduler using node-cron.
// No Redis required for MVP — runs in-process on Render.
//
// Jobs:
//   • Every 60s  → Process pending callbacks (rescheduled calls)
//   • Every 10m  → Check if any active campaign is now complete
//   • Every 1hr  → Log system health stats
// ══════════════════════════════════════════════════════════════
const cron           = require('node-cron')
const callRepo       = require('../repositories/call.repo')
const campaignRepo   = require('../repositories/campaign.repo')
const contactRepo    = require('../repositories/contact.repo')
const schedulerSvc   = require('../services/scheduler.service')

let isStarted = false

function startCronJobs() {
  if (isStarted) return
  isStarted = true

  console.log('⏰ Cron jobs started')

  // ── Every 60 seconds: Process pending callbacks ────────────
  // Picks up rescheduled calls whose scheduled_at time has passed
  cron.schedule('* * * * *', async () => {
    try {
      const callbacks = await callRepo.getPendingCallbacks()
      if (!callbacks.length) return

      console.log(`[Cron] Processing ${callbacks.length} pending callback(s)`)

      for (const cb of callbacks) {
        const campaign = await campaignRepo.findById(cb.campaign_id)
        if (!campaign || campaign.status !== 'active') continue

        // Re-queue this contact for calling
        await schedulerSvc.queueSingleContact(cb.contact_id, cb.campaign_id)
        await callRepo.markCallbackQueued(cb.id)

        console.log(`[Cron] Callback queued: contact ${cb.contact_id}`)
      }
    } catch (err) {
      console.error('[Cron] Callback processing error:', err.message)
    }
  })

  // ── Every 10 minutes: Check campaign completion ────────────
  // Marks campaigns as 'completed' when all contacts are done
  cron.schedule('*/10 * * * *', async () => {
    try {
      // Find all active campaigns
      const pool   = require('../db/supabaseClient')
      const { rows: activeCampaigns } = await pool.query(
        "SELECT id, name FROM campaigns WHERE status = 'active'"
      )

      for (const campaign of activeCampaigns) {
        const stats   = await campaignRepo.getStats(campaign.id)
        const pending = parseInt(stats.pending) + parseInt(stats.calling) + parseInt(stats.scheduled)

        if (pending === 0) {
          await campaignRepo.updateStatus(campaign.id, 'completed')
          console.log(`[Cron] Campaign completed: ${campaign.name}`)
        }
      }
    } catch (err) {
      console.error('[Cron] Campaign completion check error:', err.message)
    }
  })

  // ── Every hour: Log health stats ──────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const { activeSessions } = require('../call-engine/session')
      console.log(`[Cron] Health: ${activeSessions.size} active calls`)
    } catch (err) {
      console.error('[Cron] Health check error:', err.message)
    }
  })
}

module.exports = { startCronJobs }

