// src/services/campaign.service.js
const fs           = require('fs')
const csv          = require('csv-parser')
const pdfParse     = require('pdf-parse')
const XLSX         = require('xlsx')
const axios        = require('axios')
const cheerio      = require('cheerio')
const campaignRepo = require('../repositories/campaign.repo')
const contactRepo  = require('../repositories/contact.repo')
const { buildSystemPrompt } = require('../call-engine/prompts')

const campaignService = {

  async list(userId) {
    return campaignRepo.findByUser(userId)
  },

  async get(id, userId) {
    const campaign = await campaignRepo.findById(id, userId)
    if (!campaign) {
      const err = new Error('Campaign not found'); err.status = 404; throw err
    }
    const stats = await campaignRepo.getStats(id)
    return { campaign, stats }
  },

  async create(userId, data) {
    if (!data.name) {
      const err = new Error('Campaign name is required'); err.status = 400; throw err
    }
    if (!data.system_prompt && data.script_content) {
      data.system_prompt = buildSystemPrompt(data)
    }
    return campaignRepo.create(userId, data)
  },

  async update(id, userId, data) {
    const campaign = await campaignRepo.update(id, userId, data)
    if (!campaign) {
      const err = new Error('Campaign not found'); err.status = 404; throw err
    }
    return campaign
  },

  async importContacts(campaignId, userId, filePath, originalName) {
    const campaign = await campaignRepo.findById(campaignId, userId)
    if (!campaign) {
      const err = new Error('Campaign not found'); err.status = 404; throw err
    }

    const ext      = (originalName || filePath).split('.').pop().toLowerCase()
    const contacts = []
    const errors   = []

    // ── CSV ───────────────────────────────────────────────────
    if (ext === 'csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            const phone = row.phone || row.Phone || row.mobile || row.Mobile
                        || row.number || row.Number || row['Phone Number']
                        || row['phone_number'] || row['contact']
            if (!phone) { errors.push(`Row missing phone: ${JSON.stringify(row)}`); return }
            const { phone:_a, Phone:_b, mobile:_c, Mobile:_d,
                    number:_e, Number:_f, ...variables } = row
            contacts.push({ phone: _cleanPhone(phone), variables })
          })
          .on('end', resolve)
          .on('error', reject)
      })
    }

    // ── EXCEL (.xlsx / .xls) ──────────────────────────────────
    else if (ext === 'xlsx' || ext === 'xls') {
      const workbook  = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]       // Use first sheet
      const sheet     = workbook.Sheets[sheetName]
      const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      for (const row of rows) {
        const phone = row.phone || row.Phone || row.mobile || row.Mobile
                    || row.number || row.Number || row['Phone Number']
                    || row['phone_number'] || row['Contact'] || row['contact']
                    || row['Mobile Number'] || row['PHONE'] || row['MOBILE']
        if (!phone) { errors.push(`Row missing phone: ${JSON.stringify(row)}`); continue }
        const { phone:_a, Phone:_b, mobile:_c, Mobile:_d,
                number:_e, Number:_f, ...variables } = row
        contacts.push({ phone: _cleanPhone(String(phone)), variables })
      }
    }

    // ── PDF ───────────────────────────────────────────────────
    else if (ext === 'pdf') {
      const buffer  = fs.readFileSync(filePath)
      const data    = await pdfParse(buffer)
      const text    = data.text

      // Extract phone numbers from PDF text using regex
      // Matches: 10-digit Indian numbers, +91 format, 07xx format
      const phoneRegex = /(?:\+91[\s\-]?)?[6-9]\d{9}|(?:0\d{10})/g
      const matches    = text.match(phoneRegex) || []

      for (const match of matches) {
        const phone = _cleanPhone(match)
        if (phone) contacts.push({ phone, variables: {} })
      }

      if (!contacts.length) {
        const err = new Error('No phone numbers found in PDF. Ensure PDF contains 10-digit Indian mobile numbers.')
        err.status = 400
        fs.unlinkSync(filePath)
        throw err
      }
    }

    // ── Unsupported format ────────────────────────────────────
    else {
      fs.unlinkSync(filePath)
      const err = new Error(`Unsupported file format: .${ext}. Please upload CSV, Excel (.xlsx/.xls), or PDF.`)
      err.status = 400
      throw err
    }

    // Cleanup temp file
    try { fs.unlinkSync(filePath) } catch {}

    if (!contacts.length) {
      const err = new Error('No valid contacts found. Ensure file has a "phone" or "mobile" column.')
      err.status = 400
      throw err
    }

    // Remove duplicates
    const unique = [...new Map(contacts.map(c => [c.phone, c])).values()]

    await contactRepo.bulkInsert(campaignId, unique)
    return { count: unique.length, duplicates: contacts.length - unique.length, errors: errors.slice(0, 5) }
  },

  async extractFromPdf(filePath) {
    const buffer = fs.readFileSync(filePath)
    const data   = await pdfParse(buffer)
    fs.unlinkSync(filePath)
    return data.text.replace(/\s+/g, ' ').trim().substring(0, 8000)
  },

  async extractFromUrl(url) {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoiceAI/1.0)' },
    })
    const $ = cheerio.load(response.data)
    $('script, style, nav, footer, header, iframe').remove()
    return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000)
  },

}


// ── Helper: clean and normalize phone numbers ─────────────────
function _cleanPhone(raw) {
  if (!raw) return null

  // Handle Excel scientific notation: 7.874e9 → '7874000000'
  let cleaned = raw
  if (typeof raw === 'number' || (typeof raw === 'string' && String(raw).includes('e'))) {
    cleaned = Math.round(Number(raw)).toString()
  }

  let phone = String(cleaned).replace(/[\s\-\.\(\)]/g, '')
  // Remove +91 or 91 prefix
  if (phone.startsWith('+91')) phone = phone.slice(3)
  else if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2)
  // Remove leading 0
  if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1)
  // Must be 10 digits starting with 6-9
  if (!/^[6-9]\d{9}$/.test(phone)) return null
  return '+91' + phone
}

module.exports = campaignService
