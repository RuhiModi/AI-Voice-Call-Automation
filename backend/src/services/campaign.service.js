// src/services/campaign.service.js
const fs           = require('fs')
const csv          = require('csv-parser')
const pdfParse     = require('pdf-parse')
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

  async importContacts(campaignId, userId, filePath) {
    const campaign = await campaignRepo.findById(campaignId, userId)
    if (!campaign) {
      const err = new Error('Campaign not found'); err.status = 404; throw err
    }
    const contacts = []
    const errors   = []

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const phone = row.phone || row.Phone || row.mobile || row.Mobile || row.number
          if (!phone) { errors.push(`Row missing phone: ${JSON.stringify(row)}`); return }
          const { phone: _p, Phone: _P, mobile: _m, Mobile: _M, number: _n, ...variables } = row
          contacts.push({ phone: String(phone).trim(), variables })
        })
        .on('end', resolve)
        .on('error', reject)
    })

    fs.unlinkSync(filePath)

    if (!contacts.length) {
      const err = new Error('No valid contacts found. Ensure CSV has a "phone" column.'); err.status = 400; throw err
    }

    await contactRepo.bulkInsert(campaignId, contacts)
    return { count: contacts.length, errors: errors.slice(0, 5) }
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

module.exports = campaignService

