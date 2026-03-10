// src/services/webhookDelivery.js
// Sends call results to user's external webhook URL after each call ends.
// Signed with HMAC-SHA256 so the receiver can verify it's from us.

const axios  = require('axios')
const crypto = require('crypto')
const pool   = require('../db/supabaseClient')

/**
 * Deliver call result to campaign's webhook_url (if set).
 * Non-blocking — errors are logged but never crash the call flow.
 */
async function deliverWebhook(campaign, contact, callLog) {
  if (!campaign.webhook_url) return

  const payload = _buildPayload(campaign, contact, callLog)
  const headers = _buildHeaders(campaign.webhook_secret, payload)

  try {
    const res = await axios.post(campaign.webhook_url, payload, {
      headers,
      timeout: 10000,
    })

    await _updateDeliveryStatus(callLog.session_id, {
      webhook_sent:    true,
      webhook_status:  res.status,
      webhook_error:   null,
      webhook_sent_at: new Date().toISOString(),
    })

    console.log(`[Webhook] ✅ Delivered to ${campaign.webhook_url} — status: ${res.status}`)

  } catch (err) {
    const status = err.response?.status || null
    const errMsg = err.response?.data
      ? JSON.stringify(err.response.data).slice(0, 200)
      : err.message

    await _updateDeliveryStatus(callLog.session_id, {
      webhook_sent:    false,
      webhook_status:  status,
      webhook_error:   errMsg,
      webhook_sent_at: new Date().toISOString(),
    })

    console.error(`[Webhook] ❌ Failed for ${campaign.webhook_url}: ${errMsg}`)
  }
}

/**
 * Build the payload sent to the external server.
 * Consistent structure — receiver can always rely on these fields.
 */
function _buildPayload(campaign, contact, callLog) {
  const variables = typeof contact.variables === 'object'
    ? contact.variables
    : (() => { try { return JSON.parse(contact.variables || '{}') } catch { return {} } })()

  return {
    event:       'call.completed',
    timestamp:   new Date().toISOString(),
    campaign: {
      id:   campaign.id,
      name: campaign.name,
      type: campaign.campaign_type,
    },
    contact: {
      id:        contact.id,
      phone:     contact.phone,
      variables,             // all Excel columns e.g. { driver_name, route, timing }
    },
    call: {
      session_id:      callLog.session_id,
      outcome:         callLog.outcome,          // completed | failed | no_answer | dnc
      duration_sec:    callLog.duration_sec,
      language:        callLog.language_detected,
      acknowledged:    callLog.acknowledged,     // true | false | null
      confusion_count: callLog.confusion_count,
      llm_used:        callLog.llm_used,
      collected_data:  (() => {
        try { return JSON.parse(callLog.collected_data || '{}') } catch { return {} }
      })(),
      ended_at:        callLog.ended_at,
    },
  }
}

/**
 * Build request headers including HMAC signature if secret is set.
 * Receiver verifies: HMAC-SHA256(secret, JSON.stringify(payload)) === X-Webhook-Signature
 */
function _buildHeaders(secret, payload) {
  const headers = {
    'Content-Type':   'application/json',
    'X-Webhook-Source': 'vobiz-ai',
  }

  if (secret) {
    const sig = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex')
    headers['X-Webhook-Signature'] = `sha256=${sig}`
  }

  return headers
}

async function _updateDeliveryStatus(sessionId, data) {
  try {
    await pool.query(
      `UPDATE call_logs SET
        webhook_sent    = $1,
        webhook_status  = $2,
        webhook_error   = $3,
        webhook_sent_at = $4
       WHERE session_id = $5`,
      [data.webhook_sent, data.webhook_status, data.webhook_error, data.webhook_sent_at, sessionId]
    )
  } catch (err) {
    console.error('[Webhook] DB update error:', err.message)
  }
}

/**
 * Test a webhook URL — sends a sample payload so the user can verify their endpoint.
 */
async function testWebhook(webhookUrl, secret) {
  const samplePayload = {
    event:     'webhook.test',
    timestamp: new Date().toISOString(),
    campaign:  { id: 'test-123', name: 'Test Campaign', type: 'announcement' },
    contact:   { id: 'contact-456', phone: '+919876543210', variables: { name: 'Test User' } },
    call: {
      session_id:      'test-session',
      outcome:         'completed',
      duration_sec:    45,
      language:        'gu',
      acknowledged:    true,
      confusion_count: 0,
      llm_used:        false,
      collected_data:  {},
      ended_at:        new Date().toISOString(),
    },
  }

  const headers = _buildHeaders(secret, samplePayload)
  const res = await axios.post(webhookUrl, samplePayload, { headers, timeout: 8000 })
  return { success: true, status: res.status }
}

/**
 * Deliver campaign completion summary to webhook_url.
 * Called once when the entire campaign finishes.
 */
async function deliverCampaignWebhook(campaign) {
  if (!campaign.webhook_url) return

  try {
    // Load full stats
    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='completed')       AS completed,
         COUNT(*) FILTER (WHERE status='failed')          AS failed,
         COUNT(*) FILTER (WHERE status='pending')         AS pending,
         COUNT(*) FILTER (WHERE last_outcome='no_answer') AS no_answer,
         COUNT(*) FILTER (WHERE do_not_call=TRUE)         AS dnc,
         COUNT(*)                                         AS total
       FROM contacts WHERE campaign_id = $1`,
      [campaign.id]
    )

    // Load acknowledged count for announcement campaigns
    const { rows: ackRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE acknowledged=TRUE)  AS acknowledged,
         COUNT(*) FILTER (WHERE acknowledged=FALSE) AS not_acknowledged,
         ROUND(AVG(confusion_count),1)              AS avg_confusion,
         COUNT(*) FILTER (WHERE llm_used=TRUE)      AS llm_activations
       FROM call_logs WHERE campaign_id = $1`,
      [campaign.id]
    )

    const stats = statsRows[0]
    const ack   = ackRows[0]

    const payload = {
      event:     'campaign.completed',
      timestamp: new Date().toISOString(),
      campaign: {
        id:         campaign.id,
        name:       campaign.name,
        type:       campaign.campaign_type,
        started_at: campaign.created_at,
        ended_at:   new Date().toISOString(),
      },
      summary: {
        total:            parseInt(stats.total),
        completed:        parseInt(stats.completed),
        failed:           parseInt(stats.failed),
        no_answer:        parseInt(stats.no_answer),
        dnc:              parseInt(stats.dnc),
        acknowledged:     parseInt(ack.acknowledged),
        not_acknowledged: parseInt(ack.not_acknowledged),
        avg_confusion:    parseFloat(ack.avg_confusion) || 0,
        llm_activations:  parseInt(ack.llm_activations),
      },
    }

    const headers = _buildHeaders(campaign.webhook_secret, payload)
    const res = await axios.post(campaign.webhook_url, payload, { headers, timeout: 10000 })
    console.log(`[Webhook] ✅ Campaign summary delivered → ${campaign.webhook_url} (${res.status})`)

  } catch (err) {
    console.error(`[Webhook] ❌ Campaign summary failed: ${err.message}`)
  }
}

module.exports = { deliverWebhook, deliverCampaignWebhook, testWebhook }
