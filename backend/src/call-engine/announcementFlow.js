// src/call-engine/announcementFlow.js
//
// Two-phase flow for announcement/reminder campaigns:
//
// PHASE 1 — Name Validation
//   AI: "Am I speaking with {{driver_name}}?"
//   ✅ Confirmed → proceed to Phase 2
//   ❌ Wrong person → politely end
//   ❓ Confused → retry once, then end
//
// PHASE 2 — Deliver Message + Confirm Understanding
//   AI: speaks {{announcement_template}} with variables filled
//   ✅ Understood → closing message → END
//   ❓ Confused x1 → repeat full message
//   ❓ Confused x2 → shorter rephrase
//   ❓ Confused x3 → LLM takes over
//
// Zero LLM for all expected paths.

const { injectVariables } = require('./variableEngine')

// ── Positive synonyms (confirmed / understood) ────────────────
const YES_SYNONYMS = [
  // Gujarati
  'હા', 'જી', 'ઠીક છે', 'બરાબર', 'ઓ.કે',
  // Hindi
  'हाँ', 'जी', 'ठीक है', 'हां',
  // English / transliterated
  'yes', 'ok', 'okay', 'correct', 'right', 'sure', 'got it', 'understood',
  'haa', 'han', 'theek', 'barabar', 'bol', 'bolav',
  // Understanding confirmations
  'samajyo', 'samajya', 'samjyo', 'samjya che', 'samjya', 'समझा',
  'સમજ્યો', 'સમજ્યા', 'સમજ્ય',
]

// ── Negative synonyms (wrong person / not understood) ─────────
const NO_SYNONYMS = [
  'ના', 'na', 'naa', 'no', 'nahi', 'nai',
  'wrong', 'khotho', 'galat', 'nathi',
  'wrong number', 'khotho number',
]

// ── Patterns that negate a yes (e.g. "સમજ્યો નહિ") ───────────
const NEGATION_PATTERNS = [
  'nathi', 'nahi', 'not', 'no ', 'samjyo nathi', 'samajyo nathi',
  'ન સમજ', 'na samajyo', 'समझा नहीं',
  'નહ', 'નથ',   // Gujarati script negation substrings
]

function isYes(text) {
  const lower = text.toLowerCase().trim()
  const hasNeg = NEGATION_PATTERNS.some(n => lower.includes(n))
  if (hasNeg) return false
  return YES_SYNONYMS.some(s => lower.includes(s.toLowerCase()))
}

function isNo(text) {
  const lower = text.toLowerCase().trim()
  return NO_SYNONYMS.some(s => lower.includes(s.toLowerCase()))
}

// ── States ────────────────────────────────────────────────────
const STATE = {
  NAME_CHECK:    'name_check',   // "Am I speaking with X?"
  DELIVER:       'deliver',      // Speak the message
  DONE:          'done',
}

class AnnouncementFlowExecutor {
  /**
   * @param {object} campaign  — DB campaign record
   * @param {object} contact   — DB contact record with .variables
   */
  constructor(campaign, contact) {
    this.campaign  = campaign
    this.contact   = contact
    this.vars      = contact?.variables || {}
    this.state     = STATE.NAME_CHECK
    this.done      = false
    this.acknowledged   = false
    this.nameConfirmed  = false
    this.confusionCount = 0   // confusion count in DELIVER phase

    // Resolve personalized message once
    const template = campaign.announcement_template || campaign.script_content || ''
    this.personalizedMsg = injectVariables(template, this.vars)

    // Extract contact name for validation
    this.contactName = this._resolveContactName()
  }

  // ── Opening — name check first ──────────────────────────────
  getOpening() {
    if (this.contactName) {
      return this._nameCheckQ()
    }
    // No name in contact data — skip name check, go straight to message
    this.state = STATE.DELIVER
    return this.personalizedMsg
  }

  // ── Main process ────────────────────────────────────────────
  process(userText) {
    if (this.done) return { useLLM: false, text: null, action: 'end' }

    switch (this.state) {
      case STATE.NAME_CHECK: return this._handleNameCheck(userText)
      case STATE.DELIVER:    return this._handleDeliver(userText)
      default:               return { useLLM: false, text: null, action: 'end' }
    }
  }

  // ── After LLM handled one turn — resume deliver phase ───────
  resumeAfterLLM(userText) {
    if (isYes(userText)) {
      this.acknowledged = true
      this.done = true
      return { useLLM: false, text: this._closing(), action: 'end', acknowledged: true }
    }
    this.done = true
    return {
      useLLM: false,
      text: 'ઠીક છે. અમારી ટીમ ફરીથી સંપર્ક કરશે. આભાર.',
      action: 'end',
      acknowledged: false,
    }
  }

  getSummary() {
    return {
      finalState:     this.state,
      nameConfirmed:  this.nameConfirmed,
      acknowledged:   this.acknowledged,
      confusionCount: this.confusionCount,
      collectedData: {
        name_confirmed:  this.nameConfirmed,
        acknowledged:    this.acknowledged,
        confusion_count: this.confusionCount,
      },
    }
  }

  // ── PHASE 1: Name validation ─────────────────────────────────
  _handleNameCheck(userText) {
    if (isYes(userText)) {
      // ✅ Confirmed — proceed to message
      this.nameConfirmed = true
      this.state = STATE.DELIVER
      console.log('[AnnouncementFlow] ✅ Name confirmed → delivering message')
      return {
        useLLM:  false,
        text:    this.personalizedMsg,
        action:  'continue',
        stateId: STATE.DELIVER,
      }
    }

    if (isNo(userText)) {
      // ❌ Wrong person
      this.done = true
      console.log('[AnnouncementFlow] ❌ Wrong person — ending call')
      return {
        useLLM:  false,
        text:    `માફ કરશો, ખોટો સંપર્ક થયો. ${this.contactName}ને કૃપા કરીને ફોન આપો અથવા અમે ફરી ફોન કરીશું. આભાર.`,
        action:  'end',
        stateId: 'wrong_person',
      }
    }

    // Confused — repeat name check once, then end
    console.log('[AnnouncementFlow] ❓ Name check unclear — repeating')
    this.done = true  // end after one retry to avoid loops
    return {
      useLLM:  false,
      text:    `માફ કરશો. શું ${this.contactName} ઉપલબ્ધ છે? જો ના, તો અમે બાદમાં ફોન કરીશું.`,
      action:  'end',
      stateId: 'name_unclear',
    }
  }

  // ── PHASE 2: Deliver message + confirm understanding ─────────
  _handleDeliver(userText) {
    if (isYes(userText)) {
      // ✅ Understood
      this.acknowledged = true
      this.done = true
      console.log('[AnnouncementFlow] ✅ Message acknowledged')
      return {
        useLLM:       false,
        text:         this._closing(),
        action:       'end',
        acknowledged: true,
        stateId:      STATE.DONE,
      }
    }

    // Not understood — increment confusion
    this.confusionCount++
    console.log(`[AnnouncementFlow] ❓ Confusion #${this.confusionCount}`)

    if (this.confusionCount === 1) {
      // Repeat full message
      return {
        useLLM:  false,
        text:    `માફ કરશો, ફરીથી કહું. ${this.personalizedMsg}`,
        action:  'continue',
        stateId: STATE.DELIVER,
      }
    }

    if (this.confusionCount === 2) {
      // Shorter rephrase with just key details
      return {
        useLLM:  false,
        text:    this._rephrase(),
        action:  'continue',
        stateId: STATE.DELIVER,
      }
    }

    // 3rd confusion → LLM
    console.log('[AnnouncementFlow] 🤖 Handing to LLM')
    return { useLLM: true }
  }

  // ── Helpers ──────────────────────────────────────────────────

  _nameCheckQ() {
    // Language-aware name check
    const lang = this.campaign?.language_priority || 'gu'
    if (lang === 'en') {
      return `Hello, am I speaking with ${this.contactName}?`
    }
    if (lang === 'hi') {
      return `नमस्ते, क्या मैं ${this.contactName} जी से बात कर रहा हूँ?`
    }
    // Default Gujarati
    return `નમસ્તે, શું હું ${this.contactName} સાથે વાત કરી રહ્યો છું?`
  }

  _closing() {
    return this.campaign.closing_message || 'ઠીક છે. સમજ્યા. ધ્યાન રાખજો. આભાર.'
  }

  _rephrase() {
    // Pull key variables for a minimal rephrase
    const v = this.vars
    const route  = v.route   || v.Route   || v.route_no || ''
    const timing = v.timing  || v.Timing  || v.time     || ''
    const name   = this.contactName

    if (route && timing) {
      return `${name ? name + ' ભાઈ, ' : ''}ટૂંકમાં: રૂટ ${route}, સમય ${timing}. સમજ્યા?`
    }
    // Generic short repeat
    return `ફરીથી સાંભળો: ${this.personalizedMsg} — શું સમજ્યા?`
  }

  _resolveContactName() {
    const v = this.vars
    // Check common name column variations
    return v.driver_name || v['Driver Name'] || v.name || v.Name ||
           v.employee_name || v['Employee Name'] || v.customer_name ||
           v['Customer Name'] || v.contact_name || null
  }
}

module.exports = { AnnouncementFlowExecutor }
