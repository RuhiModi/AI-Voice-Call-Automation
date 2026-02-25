// src/repositories/contact.repo.js
const pool = require('../db/supabaseClient')

const contactRepo = {

  async bulkInsert(campaignId, contacts) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        "DELETE FROM contacts WHERE campaign_id = $1 AND status = 'pending'",
        [campaignId]
      )
      for (const c of contacts) {
        let phone = String(c.phone).replace(/\D/g, '')
        if (phone.length === 10) phone = '91' + phone
        if (!phone.startsWith('+')) phone = '+' + phone
        await client.query(
          'INSERT INTO contacts (campaign_id, phone, variables) VALUES ($1, $2, $3)',
          [campaignId, phone, JSON.stringify(c.variables || {})]
        )
      }
      await client.query(
        `UPDATE campaigns SET total_contacts = (
           SELECT COUNT(*) FROM contacts WHERE campaign_id = $1
         ) WHERE id = $1`,
        [campaignId]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  },

  async getPending(campaignId, limit = 10) {
    const { rows } = await pool.query(
      `SELECT * FROM contacts
       WHERE campaign_id = $1 AND status = 'pending' AND do_not_call = FALSE
         AND (next_call_at IS NULL OR next_call_at <= NOW())
       ORDER BY created_at ASC LIMIT $2`,
      [campaignId, limit]
    )
    return rows
  },

  async updateStatus(id, status, outcome = null) {
    await pool.query(
      'UPDATE contacts SET status=$1, last_outcome=$2, call_count=call_count+1 WHERE id=$3',
      [status, outcome, id]
    )
  },

  async scheduleCallback(id, scheduledAt) {
    await pool.query(
      "UPDATE contacts SET status='scheduled', next_call_at=$1 WHERE id=$2",
      [scheduledAt, id]
    )
  },

  async markDNC(id) {
    await pool.query(
      "UPDATE contacts SET do_not_call=TRUE, status='dnc' WHERE id=$1",
      [id]
    )
  },

  async setCallingStatus(id) {
    await pool.query(
      "UPDATE contacts SET status='calling' WHERE id=$1",
      [id]
    )
  },

}

module.exports = contactRepo

