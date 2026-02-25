const { google } = require('googleapis')

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_SHEETS_CLIENT_ID,
    process.env.GOOGLE_SHEETS_CLIENT_SECRET,
    process.env.GOOGLE_SHEETS_REDIRECT_URI
  )
}

/**
 * Generate Google OAuth URL for user to connect their Sheets.
 */
function getOAuthUrl(userId) {
  const oauth2Client = createOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',   // Get refresh token
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
    state: userId,             // Pass userId through OAuth flow
  })
}

/**
 * Exchange OAuth code for access + refresh tokens.
 */
async function exchangeCodeForToken(code) {
  const oauth2Client = createOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Create auth client from stored user token.
 * Handles token refresh automatically.
 */
function getAuthFromToken(token) {
  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials(token)
  return oauth2Client
}

/**
 * Setup header row in a new sheet.
 * Call this once when user first connects their sheet.
 */
async function setupSheetHeaders(token, spreadsheetId) {
  try {
    const auth = getAuthFromToken(token)
    const sheets = google.sheets({ version: 'v4', auth })

    const headers = [[
      'Phone', 'Name', 'Outcome', 'Language', 'Duration (s)',
      'Collected Data', 'Timestamp (IST)'
    ]]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:G1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: headers },
    })

    console.log(`[Sheets] Headers setup for sheet: ${spreadsheetId}`)
  } catch (err) {
    console.error('[Sheets] Setup headers error:', err.message)
  }
}

/**
 * Append a call result row to Google Sheet.
 * Called automatically after every call ends.
 */
async function appendToGoogleSheet(token, spreadsheetId, contact, outcome, lang, durationSec, collectedData) {
  try {
    const auth = getAuthFromToken(token)
    const sheets = google.sheets({ version: 'v4', auth })

    const langNames = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }

    const row = [[
      contact.phone,
      contact.variables?.name || '',
      outcome,
      langNames[lang] || lang,
      durationSec,
      JSON.stringify(collectedData || {}),
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ]]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:G',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: row },
    })

    console.log(`[Sheets] Row appended for ${contact.phone}: ${outcome}`)
  } catch (err) {
    // Don't crash the call if Sheets fails
    console.error('[Sheets] Append error:', err.message)
  }
}

module.exports = {
  getOAuthUrl,
  exchangeCodeForToken,
  setupSheetHeaders,
  appendToGoogleSheet,
}

