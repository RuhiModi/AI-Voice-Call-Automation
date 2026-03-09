// src/call-engine/announcementFlow.js
//
// Handles "announcement" campaign type:
//   1. Speaks personalized message ({{variables}} filled from contact)
//   2. Waits for acknowledgement
//   3. Confusion counter: repeat → rephrase → LLM (after 2 failures)
//
// No PDF needed. Script template is set in campaign.script_content with {{vars}}.

const { injectVariables } = require('./variableEngine')

// ── Acknowledgement synonyms (multilingual) ──────────────────
const ACK_SYNONYMS = [
  // Gujarati — exact words (checked with word-boundary logic below)
  'હા', 'જી', 'ઠીક છે', 'ઓ.કે', 'બરાબર',
  // Hindi
  'हाँ', 'जी हाँ', 'ठीक है', 'हां',
  // English
  'yes', 'ok', 'okay', 'got it', 'understood', 'sure', 'correct',
  // Transliterated
  'haa', 'han', 'theek che', 'barabar', 'samajyo', 'samjya che', 'samajya',
]

// Negative patterns — if these appear, it's NOT an ack even if ack word present
const NOT_ACK_PATTERNS = [
  'નહિ', 'nathi', 'nahi', 'not', 'samjyo nathi', 'samajyo nathi', 'no',
  'સમજ્યો નહ', 'ન સમજ', 'na samajyo',
]

// ── Negative / confusion synonyms ───────────────────────────
const NEGATIVE_SYNONYMS = [
  'ના', 'na', 'naa', 'no', 'nahi', 'nai', 'समझा नहीं', 'samjyo nathi',
  'again', 'repeat', 'fari', 'pheri', 'shu', 'shun', 'what', 'kyan', 'kyare',
]

class AnnouncementFlowExecutor {
  /**
   * @param {object} campaign   — campaign record from DB
   * @param {object} contact    — contact record (has .variables with route/timing/etc)
   */
  constructor(campaign, contact) {
    this.campaign      = campaign
    this.contact       = contact
    this.confusionCount = 0
    this.maxConfusions  = 2    // after this → LLM
    this.done           = false
    this.acknowledged   = false

    // Resolve the personalized message once
    this.personalizedMsg = injectVariables(
      campaign.script_content || campaign.announcement_template || '',
      contact?.variables || {}
    )

    // Simple rephrase — shorter version for 2nd attempt
    this.rephraseMsg = this._buildRephrase()
  }

  /** Opening — speak personalized message, then wait */
  getOpening() {
    return this.personalizedMsg
  }

  /**
   * Process user response.
   * Returns: { useLLM, text, action, acknowledged }
   */
  process(userText) {
    if (this.done) return { useLLM: false, text: null, action: 'end' }

    const lower = userText.trim().toLowerCase()

    // ── Acknowledged ─────────────────────────────────────────
    const hasAck    = ACK_SYNONYMS.some(s => lower.includes(s.toLowerCase()))
    const hasNegation = NOT_ACK_PATTERNS.some(n => lower.includes(n.toLowerCase()))
    if (hasAck && !hasNegation) {
      this.acknowledged = true
      this.done = true
      console.log(`[AnnouncementFlow] ✅ Acknowledged`)
      return {
        useLLM:       false,
        text:         this._closingMessage(),
        action:       'end',
        acknowledged: true,
      }
    }

    // ── Confusion / negative / repeat request ────────────────
    this.confusionCount++
    console.log(`[AnnouncementFlow] ❓ Confusion #${this.confusionCount}`)

    if (this.confusionCount === 1) {
      // First confusion — repeat the full message
      return {
        useLLM:       false,
        text:         `માફ કરશો, ફરીથી કહું. ${this.personalizedMsg}`,
        action:       'continue',
        acknowledged: false,
      }
    }

    if (this.confusionCount === 2) {
      // Second confusion — rephrase shorter
      return {
        useLLM:       false,
        text:         this.rephraseMsg,
        action:       'continue',
        acknowledged: false,
      }
    }

    // Third confusion → hand off to LLM
    console.log(`[AnnouncementFlow] 🤖 Handing to LLM after ${this.confusionCount} confusions`)
    return {
      useLLM:       true,
      acknowledged: false,
    }
  }

  /** After LLM responds, check if user acknowledged and resume */
  resumeAfterLLM(userText) {
    const lower = userText.trim().toLowerCase()
    if (ACK_SYNONYMS.some(s => lower.includes(s.toLowerCase()))) {
      this.acknowledged = true
      this.done = true
      return { useLLM: false, text: this._closingMessage(), action: 'end', acknowledged: true }
    }
    // Still not acknowledged — end call gracefully
    this.done = true
    return {
      useLLM: false,
      text: 'ઠીક છે. અમારી ટીમ આપને ફરીથી સંપર્ક કરશે. આભાર.',
      action: 'end',
      acknowledged: false,
    }
  }

  getSummary() {
    return {
      acknowledged:   this.acknowledged,
      confusionCount: this.confusionCount,
      contact:        this.contact?.phone,
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  _closingMessage() {
    // Use campaign's closing message if set, else default
    return this.campaign.closing_message ||
      'ઠીક છે. સમજ્યા. આભાર. શુભ દિવસ.'
  }

  _buildRephrase() {
    // Extract key info from variables for a shorter repeat
    const vars = this.contact?.variables || {}
    const name    = vars.driver_name || vars.name || ''
    const route   = vars.route       || vars.route_no || ''
    const timing  = vars.timing      || vars.time || ''

    if (route && timing) {
      return `${name ? name + ' ભાઈ, ' : ''}રૂટ ${route}, સમય ${timing}. સમજ્યા?`
    }
    // Fallback — just repeat
    return `ફરીથી: ${this.personalizedMsg} — શું સમજ્યા?`
  }
}

module.exports = { AnnouncementFlowExecutor }
