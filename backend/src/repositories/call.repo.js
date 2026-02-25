// src/repositories/call.repo.js
const pool = require('../db/supabaseClient')

const callRepo = {

  async create(contactId, campaignId, sessionId) {
    const { rows } = await pool.query(
      `INSERT INTO call_logs (contact_id, campaign_id, session_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id) DO NOTHING RETURNING *`,
      [contactId, campaignId, sessionId]
    )
    return rows[0]
  },

  async update(sessionId, data) {
    const ALLOWED = [
      'outcome','duration_sec','language_detected',
      'transcript','collected_data','recording_url','ended_at',
    ]
    const keys = Object.keys(data).filter(k => ALLOWED.includes(k))
    if (!keys.length) return

    const fields = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    const values = keys.map(k =>
      ['transcript','collected_data'].includes(k)
        ? (typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]))
        : data[k]
    )
    await pool.query(
      `UPDATE call_logs SET ${fields} WHERE session_id = $1`,
      [sessionId, ...values]
    )
  },

  async findByCampaign(campaignId, limit = 50, offset = 0) {
    const { rows } = await pool.query(
      `SELECT cl.*, c.phone, c.variables
       FROM call_logs cl
       JOIN contacts c ON cl.contact_id = c.id
       WHERE cl.campaign_id = $1
       ORDER BY cl.started_at DESC
       LIMIT $2 OFFSET $3`,
      [campaignId, limit, offset]
    )
    return rows
  },

  async findBySession(sessionId) {
    const { rows } = await pool.query(
      `SELECT cl.*, con.phone, con.variables, con.campaign_id,
              camp.name, camp.language_priority, camp.script_content,
              camp.system_prompt, camp.persona_name, camp.persona_tone,
              camp.data_fields, camp.handoff_keywords, camp.caller_id,
              camp.user_id, camp.google_sheet_id, camp.campaign_type
       FROM call_logs cl
       JOIN contacts con  ON cl.contact_id  = con.id
       JOIN campaigns camp ON cl.campaign_id = camp.id
       WHERE cl.session_id = $1`,
      [sessionId]
    )
    return rows[0] || null
  },

  // Callbacks (rescheduled calls)
  async getPendingCallbacks() {
    const { rows } = await pool.query(
      `SELECT cb.*, c.campaign_id
       FROM callbacks cb
       JOIN contacts c ON cb.contact_id = c.id
       WHERE cb.status = 'pending' AND cb.scheduled_at <= NOW()
       LIMIT 20`
    )
    return rows
  },

  async insertCallback(contactId, campaignId, scheduledAt, reason) {
    await pool.query(
      'INSERT INTO callbacks (contact_id, campaign_id, scheduled_at, reason) VALUES ($1,$2,$3,$4)',
      [contactId, campaignId, scheduledAt, reason]
    )
  },

  async markCallbackQueued(id) {
    await pool.query(
      "UPDATE callbacks SET status='queued' WHERE id=$1",
      [id]
    )
  },

}

module.exports = callRepo

