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
        // Handle Excel scientific notation e.g. 7.874e9 → 7874000000
        let rawPhone = c.phone
        if (typeof rawPhone === 'number' || (typeof rawPhone === 'string' && rawPhone.includes('e'))) {
          rawPhone = Math.round(Number(rawPhone)).toString()
        }

        let raw   = String(rawPhone).replace(/[\s\-\.\(\)]/g, '')
        let phone = raw.replace(/\D/g, '')  // digits only

        console.log(`[Contacts] Processing phone: ${c.phone} → cleaned: ${phone}`)

        // Normalize to 10-digit Indian mobile
        if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2)
        else if (phone.startsWith('0')  && phone.length === 11) phone = phone.slice(1)

        // Validate: must be 10 digits starting with 6-9
        if (!/^[6-9]\d{9}$/.test(phone)) {
          console.warn(`[Contacts] ❌ Skipping invalid phone: "${c.phone}" → "${phone}" (must be 10 digits starting 6-9)`)
          continue
        }

        const e164 = '+91' + phone
        console.log(`[Contacts] ✅ Valid: ${e164}`)
        await client.query(
          'INSERT INTO contacts (campaign_id, phone, variables) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [campaignId, e164, JSON.stringify(c.variables || {})]
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

  async list(campaignId, page = 1, limit = 50) {
    const offset = (page - 1) * limit
    const { rows } = await pool.query(
      `SELECT id, phone, variables, status, last_outcome, call_count, do_not_call, next_call_at, created_at
       FROM contacts WHERE campaign_id = \$1
       ORDER BY created_at ASC LIMIT \$2 OFFSET \$3`,
      [campaignId, limit, offset]
    )
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) as total FROM contacts WHERE campaign_id = \$1',
      [campaignId]
    )
    return { contacts: rows, total: parseInt(countRows[0].total), page, limit }
  },

  async setCallingStatus(id) {
    await pool.query(
      "UPDATE contacts SET status='calling' WHERE id=$1",
      [id]
    )
  },

}

module.exports = contactRepo
