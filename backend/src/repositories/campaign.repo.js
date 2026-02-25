// src/repositories/campaign.repo.js
const pool = require('../db/supabaseClient')

const campaignRepo = {

  async create(userId, data) {
    const { rows } = await pool.query(
      `INSERT INTO campaigns
       (user_id, name, description, campaign_type, language_priority,
        script_type, script_content, system_prompt, persona_name, persona_tone,
        data_fields, handoff_keywords, caller_id, max_concurrent_calls,
        max_retries, retry_gap_minutes, calling_hours_start, calling_hours_end,
        google_sheet_id, google_sheet_url, schedule_start, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [
        userId, data.name, data.description || null,
        data.campaign_type || 'custom', data.language_priority || 'gu',
        data.script_type || 'manual', data.script_content || null,
        data.system_prompt || null, data.persona_name || 'Priya',
        data.persona_tone || 'friendly',
        JSON.stringify(data.data_fields || []),
        JSON.stringify(data.handoff_keywords || ['human','agent','manager','transfer']),
        data.caller_id || null, data.max_concurrent_calls || 5,
        data.max_retries || 2, data.retry_gap_minutes || 30,
        data.calling_hours_start || '09:00', data.calling_hours_end || '21:00',
        data.google_sheet_id || null, data.google_sheet_url || null,
        data.schedule_start || null, data.status || 'draft',
      ]
    )
    return rows[0]
  },

  async findByUser(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )
    return rows
  },

  async findById(id, userId = null) {
    const query = userId
      ? 'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM campaigns WHERE id = $1'
    const params = userId ? [id, userId] : [id]
    const { rows } = await pool.query(query, params)
    return rows[0] || null
  },

  async update(id, userId, data) {
    const ALLOWED = [
      'name','description','campaign_type','language_priority','script_type',
      'script_content','system_prompt','persona_name','persona_tone','data_fields',
      'caller_id','max_concurrent_calls','max_retries','retry_gap_minutes',
      'calling_hours_start','calling_hours_end','google_sheet_id','google_sheet_url',
      'schedule_start',
    ]
    const keys = Object.keys(data).filter(k => ALLOWED.includes(k))
    if (!keys.length) return null

    const fields = keys.map((k, i) => `${k} = $${i + 3}`).join(', ')
    const values = keys.map(k =>
      ['data_fields','handoff_keywords'].includes(k) ? JSON.stringify(data[k]) : data[k]
    )
    const { rows } = await pool.query(
      `UPDATE campaigns SET ${fields}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, ...values]
    )
    return rows[0] || null
  },

  async updateStatus(id, status) {
    await pool.query(
      'UPDATE campaigns SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    )
  },

  async incrementCompleted(id) {
    await pool.query(
      'UPDATE campaigns SET completed_calls = completed_calls + 1 WHERE id = $1',
      [id]
    )
  },

  async getStats(campaignId) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='completed')  AS completed,
         COUNT(*) FILTER (WHERE status='pending')    AS pending,
         COUNT(*) FILTER (WHERE status='failed')     AS failed,
         COUNT(*) FILTER (WHERE status='calling')    AS calling,
         COUNT(*) FILTER (WHERE status='scheduled')  AS scheduled,
         COUNT(*) FILTER (WHERE last_outcome='busy') AS busy,
         COUNT(*) FILTER (WHERE last_outcome='no_answer') AS no_answer,
         COUNT(*) FILTER (WHERE last_outcome='transferred') AS transferred,
         COUNT(*) FILTER (WHERE do_not_call=TRUE)    AS dnc
       FROM contacts WHERE campaign_id = $1`,
      [campaignId]
    )
    return rows[0]
  },

}

module.exports = campaignRepo

