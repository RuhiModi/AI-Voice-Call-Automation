// src/integrations/googleSheets.js
// Appends full call data to Google Sheets after every call
const { google } = require('googleapis')

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_SHEETS_CLIENT_ID,
    process.env.GOOGLE_SHEETS_CLIENT_SECRET,
    process.env.GOOGLE_SHEETS_REDIRECT_URI
  )
}

function getOAuthUrl(userId) {
  const oauth2Client = createOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       ['https://www.googleapis.com/auth/spreadsheets'],
    state:       userId,
  })
}

async function exchangeCodeForToken(code) {
  const oauth2Client = createOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

function getAuthFromToken(token) {
  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials(token)
  // Auto-refresh expired access tokens using stored refresh_token
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      console.log('[Sheets] Refresh token updated')
    }
  })
  return oauth2Client
}

/**
 * Setup header row — call once when user first connects their sheet.
 * Creates two sheets: "Call Results" (summary) + "Full Transcripts"
 */
async function setupSheetHeaders(token, spreadsheetId) {
  try {
    const auth   = getAuthFromToken(token)
    const sheets = google.sheets({ version: 'v4', auth })

    // ── Sheet 1: Call Results (summary) ──────────────────────
    const summaryHeaders = [[
      'Campaign',
      'Phone',
      'Contact Name',
      'Outcome',
      'Language',
      'Duration (s)',
      'Acknowledged',
      'Confusion Count',
      'Collected Data (JSON)',
      'Timestamp (IST)',
    ]]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:J1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: summaryHeaders },
    })

    // Try to rename Sheet1 to "Call Results"
    try {
      const meta = await sheets.spreadsheets.get({ spreadsheetId })
      const sheet1 = meta.data.sheets?.[0]
      if (sheet1) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: { sheetId: sheet1.properties.sheetId, title: 'Call Results' },
                  fields: 'title',
                },
              },
            ],
          },
        })
      }
    } catch (e) {
      console.warn('[Sheets] Could not rename sheet:', e.message)
    }

    // ── Sheet 2: Full Transcripts ─────────────────────────────
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Transcripts' } } }],
        },
      })

      const transcriptHeaders = [[
        'Campaign',
        'Phone',
        'Contact Name',
        'Outcome',
        'Duration (s)',
        'Full Transcript (JSON)',
        'Timestamp (IST)',
      ]]

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Transcripts!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: transcriptHeaders },
      })
    } catch (e) {
      console.warn('[Sheets] Could not create Transcripts sheet:', e.message)
    }

    console.log(`[Sheets] Headers setup for: ${spreadsheetId}`)
  } catch (err) {
    console.error('[Sheets] setupSheetHeaders error:', err.message)
  }
}

/**
 * Append full call result to Google Sheet.
 * Called automatically after every call ends (from session.js endCall()).
 *
 * Writes to TWO sheets:
 *   "Call Results" — summary row (fast to read)
 *   "Transcripts"  — full conversation JSON (for deep analysis)
 */
async function appendToGoogleSheet(
  token,
  spreadsheetId,
  contact,
  outcome,
  lang,
  durationSec,
  collectedData,
  transcript = [],
  campaignName = '',
  acknowledged = null,
  confusionCount = 0
) {
  try {
    const auth   = getAuthFromToken(token)
    const sheets = google.sheets({ version: 'v4', auth })

    const langNames = { gu:'Gujarati', hi:'Hindi', en:'English' }
    const nowIST    = new Date().toLocaleString('en-IN', { timeZone:'Asia/Kolkata' })

    // Resolve contact name
    const contactName = (typeof contact.variables === 'string'
      ? (() => { try { return JSON.parse(contact.variables) } catch { return {} } })()
      : (contact.variables || {})
    ).name || contact.variables?.driver_name || ''

    // ── Row 1: Summary sheet ──────────────────────────────────
    const summaryRow = [[
      campaignName,
      contact.phone,
      contactName,
      outcome,
      langNames[lang] || lang,
      durationSec || 0,
      acknowledged === true ? 'Yes' : acknowledged === false ? 'No' : '—',
      confusionCount || 0,
      JSON.stringify(collectedData || {}),
      nowIST,
    ]]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range:             'Call Results!A:J',
      valueInputOption:  'USER_ENTERED',
      insertDataOption:  'INSERT_ROWS',
      requestBody:       { values: summaryRow },
    })

    // ── Row 2: Full transcript sheet ─────────────────────────
    // Format transcript as readable text for the sheet
    const transcriptText = Array.isArray(transcript)
      ? transcript.map(t => `[${t.role === 'assistant' ? 'AI' : 'User'}]: ${t.content || t.text || ''}`).join('\n')
      : JSON.stringify(transcript)

    const transcriptRow = [[
      campaignName,
      contact.phone,
      contactName,
      outcome,
      durationSec || 0,
      transcriptText,
      nowIST,
    ]]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range:             'Transcripts!A:G',
      valueInputOption:  'USER_ENTERED',
      insertDataOption:  'INSERT_ROWS',
      requestBody:       { values: transcriptRow },
    })

    console.log(`[Sheets] ✅ Appended call for ${contact.phone} (${outcome}) to ${spreadsheetId}`)

  } catch (err) {
    // Never crash the call if Sheets fails — just log
    console.error('[Sheets] appendToGoogleSheet error:', err.message)
  }
}

module.exports = {
  getOAuthUrl,
  exchangeCodeForToken,
  getAuthFromToken,
  setupSheetHeaders,
  appendToGoogleSheet,
}
