// src/repositories/dnc.repo.js
const pool = require('../db/supabaseClient')

function _clean(phone) {
  return String(phone).replace(/\s+/g, '').replace(/^00/, '+')
}

const dncRepo = {

  // Check if a single phone is on DNC for this user
  async isBlocked(userId, phone) {
    const { rows } = await pool.query(
      `SELECT 1 FROM dnc_list WHERE user_id = $1 AND phone = $2 LIMIT 1`,
      [userId, _clean(phone)]
    )
    return rows.length > 0
  },

  // Bulk check — returns SET of blocked phones (used before each call batch)
  async getBlockedSet(userId, phones) {
    if (!phones.length) return new Set()
    const cleaned = phones.map(_clean)
    const { rows } = await pool.query(
      `SELECT phone FROM dnc_list WHERE user_id = $1 AND phone = ANY($2)`,
      [userId, cleaned]
    )
    return new Set(rows.map(r => r.phone))
  },

  // Add a single number
  async add(userId, phone, reason = 'manual', source = 'manual') {
    const { rows } = await pool.query(
      `INSERT INTO dnc_list (user_id, phone, reason, source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, phone) DO UPDATE
         SET reason = EXCLUDED.reason, added_at = NOW()
       RETURNING *`,
      [userId, _clean(phone), reason, source]
    )
    return rows[0]
  },

  // Bulk import from array of phones
  async bulkAdd(userId, phones, source = 'import') {
    let added = 0
    for (const phone of phones) {
      try {
        await pool.query(
          `INSERT INTO dnc_list (user_id, phone, source)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, phone) DO NOTHING`,
          [userId, _clean(phone), source]
        )
        added++
      } catch (_) {}
    }
    return added
  },

  // Remove a number from DNC
  async remove(userId, phone) {
    const { rowCount } = await pool.query(
      `DELETE FROM dnc_list WHERE user_id = $1 AND phone = $2`,
      [userId, _clean(phone)]
    )
    return rowCount > 0
  },

  // List all DNC numbers for a user (paginated)
  async list(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit
    const { rows } = await pool.query(
      `SELECT phone, reason, source, added_at
       FROM dnc_list
       WHERE user_id = $1
       ORDER BY added_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM dnc_list WHERE user_id = $1`,
      [userId]
    )
    return { entries: rows, total: parseInt(countRows[0].total), page, limit }
  },
}

module.exports = dncRepo
