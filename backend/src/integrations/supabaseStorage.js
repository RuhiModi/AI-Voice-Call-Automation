// src/integrations/supabaseStorage.js
// Upload call recordings to Supabase Storage.
// Called from session.js after a call ends if recording_url is available.
const axios  = require('axios')
const config = require('../config')

/**
 * Upload a recording (from telephony provider URL) to Supabase Storage.
 * Returns the public URL in Supabase.
 *
 * @param {string} externalUrl  - Recording URL from Vobiz/Exotel
 * @param {string} sessionId    - Used as filename
 * @returns {string}             - Supabase public URL
 */
async function uploadRecording(externalUrl, sessionId) {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.warn('[Storage] Supabase not configured — skipping recording upload')
    return externalUrl  // Return original URL as fallback
  }

  try {
    // Download from telephony provider
    const download = await axios.get(externalUrl, { responseType: 'arraybuffer', timeout: 30000 })
    const buffer   = Buffer.from(download.data)

    // Upload to Supabase Storage
    const filename  = `recordings/${sessionId}.mp3`
    const uploadUrl = `${config.supabaseUrl}/storage/v1/object/recordings/${filename}`

    await axios.post(uploadUrl, buffer, {
      headers: {
        Authorization:  `Bearer ${config.supabaseServiceKey}`,
        'Content-Type': 'audio/mpeg',
      },
      timeout: 30000,
    })

    const publicUrl = `${config.supabaseUrl}/storage/v1/object/public/recordings/${filename}`
    console.log(`[Storage] Recording uploaded: ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error('[Storage] Upload failed:', err.message)
    return externalUrl  // Fallback to original URL
  }
}

module.exports = { uploadRecording }

