// src/call-engine/scriptFlow.js
//
// STATE MACHINE — reads flow config parsed from PDF.
// Zero LLM for scripted paths. One call = one response = waits.
//
// flowConfig is produced by parsePdfScript.js at campaign creation time
// and stored as JSON in campaigns.flow_config column.

// ─────────────────────────────────────────────────────────────
// MATCH HELPER
// ─────────────────────────────────────────────────────────────

function matchesAny(userText, synonyms = []) {
  const u = userText.toLowerCase().trim()
  return synonyms.some(s => u.includes(s.toLowerCase()))
}

// ─────────────────────────────────────────────────────────────
// FALLBACK CONFIG — used if no PDF uploaded / parse failed
// Minimal Gujarati flow that always works
// ─────────────────────────────────────────────────────────────

const FALLBACK_CONFIG = {
  flow_order: ['intro', 'task_check', 'task_done', 'task_pending', 'problem_recorded', 'no_details', 'fallback'],
  states: {
    intro: {
      text: 'નમસ્તે, દરિયાપુરના ધારાસભ્ય કૌશિક જૈનના ઇ-કાર્યાલય તરફથી બોલી રહ્યા છીએ. યોજનાકીય કેમ્પ દરમ્યાન આપનું કામ પૂર્ણ થયું છે કે નહીં તેની પુષ્ટિ માટે આ કૉલ છે. શું આપ હાલ 1 મિનિટ આપી શકો?',
      transitions: { default: 'task_check', busy: 'reschedule', wrong: 'wrong_number', who: 'who_is_this' },
      options: [
        { type: 'condition', trigger: 'કોણ', trigger_synonyms: ['kon','kaun','who','bol kon'], response: 'આ કૉલ કેમ્પ દરમ્યાન નોંધાયેલ કામ અંગે પુષ્ટિ માટે છે. શું આપ 1 મિનિટ આપી શકો?', action: 'continue' },
        { type: 'condition', trigger: 'ખોટો', trigger_synonyms: ['wrong','khotho','galat number'], response: 'માફ કરશો. આ ખોટો નંબર છે. આભાર.', action: 'end' },
        { type: 'condition', trigger: 'busy', trigger_synonyms: ['busy','vyast','વ્યસ્ત','nahi','na ,','ना'], response: 'ઠીક છે. ક્યારે ફોન કરી શકીએ? 1 કલાક પછી, સાંજે, અથવા કાલે?', action: 'reschedule', next_state: 'reschedule' },
        { type: 'condition', trigger: 'પછી', trigger_synonyms: ['later','pachhi','baad','call back'], response: 'ઠીક છે. ક્યારે ફોન કરી શકીએ?', action: 'continue', next_state: 'reschedule' },
      ],
    },
    reschedule: {
      text: 'ઠીક છે. ક્યારે ફોન કરી શકીએ? 1 કલાક પછી, સાંજે, અથવા કાલે?',
      transitions: { default: 'reschedule_confirmed' },
      options: [],
    },
    reschedule_confirmed: {
      text: 'બરાબર. અમે આ સમયે ફરી સંપર્ક કરીશું. આભાર.',
      transitions: { default: 'end' },
      options: [],
    },
    who_is_this: {
      text: 'આ કૉલ કેમ્પ દરમ્યાન નોંધાયેલ કામ અંગે પુષ્ટિ માટે છે. શું આપ 1 મિનિટ આપી શકો?',
      transitions: { default: 'task_check' },
      options: [],
    },
    wrong_number: {
      text: 'માફ કરશો અસુવિધા માટે. આભાર.',
      transitions: { default: 'end' },
      options: [],
    },
    task_check: {
      text: 'કૃપા કરીને જણાવો કે યોજનાકીય કેમ્પ દરમ્યાન આપનું કામ પૂર્ણ થયું છે કે નહીં?',
      transitions: { default: 'task_pending', yes: 'task_done', never: 'never_applied', partial: 'partially_done' },
      options: [
        { type: 'condition', trigger: 'અરજી કરી નથી', trigger_synonyms: ['apply nathi','applied nahi','arji nathi','never applied'], response: null, next_state: 'never_applied', capture: 'task_status', captureValue: 'never_applied' },
        { type: 'condition', trigger: 'ભાગ્યે', trigger_synonyms: ['partial','partly','bhagye','half','thodun'], response: null, next_state: 'partially_done', capture: 'task_status', captureValue: 'partial' },
        { type: 'condition', trigger: 'પૂર્ણ', trigger_synonyms: ['પૂર્ણ','purn','puri','complete','done','thayu','thai','thai gayu','completed','ho gaya','thayi gayu','thayun'], response: null, next_state: 'task_done', capture: 'task_status', captureValue: 'completed' },
        { type: 'condition', trigger: 'બાકી', trigger_synonyms: ['બાકી','baki','pending','nathi','nahi hua','incomplete','nathi thayu','hun baki','abhi nahi'], response: null, next_state: 'task_pending', capture: 'task_status', captureValue: 'pending' },
        { type: 'condition', trigger: 'ખબર નથી', trigger_synonyms: ['dont know','pata nahi','khabar nathi'], response: null, next_state: 'task_pending', capture: 'task_status', captureValue: 'unknown' },
      ],
    },
    task_done: {
      text: 'ખૂબ આનંદ થયો કે આપનું કામ સફળતાપૂર્વક પૂર્ણ થયું છે. આભાર. દરિયાપુરના ધારાસભ્ય કૌશિક જૈનનું ઇ-કાર્યાલય આપની સેવા માટે હંમેશા તૈયાર છે. જો આપ ઇચ્છો તો 1 થી 5 સુધીમાં સેવા માટે રેટિંગ આપશો?',
      transitions: { default: 'rating_done' },
      options: [{ type: 'rating_capture', min: 1, max: 5, capture: 'rating' }],
    },
    rating_done: {
      text: 'આભાર. આપનો પ્રતિસાદ અમારા માટે મહત્વનો છે. ઇ-કાર્યાલય આપની સેવા માટે પ્રતિબદ્ધ છે. શુભ દિવસ.',
      transitions: { default: 'end' },
      options: [],
    },
    task_pending: {
      text: 'માફ કરશો કે આપનું કામ હજુ પૂર્ણ થયું નથી. કૃપા કરીને આપની મુખ્ય સમસ્યા જણાવો: દસ્તાવેજ અધૂરા, વિભાગ તરફથી પ્રતિસાદ નથી, ટેક્નિકલ વિલંબ, નાણાકીય મુદ્દો, અથવા અન્ય?',
      transitions: { default: 'urgency_check', no_details: 'no_details' },
      options: [
        { type: 'condition', trigger: 'દસ્તાવેજ', trigger_synonyms: ['document','dastavej','papers','kagad'], response: null, next_state: 'urgency_check', capture: 'problem_type', captureValue: 'documents' },
        { type: 'condition', trigger: 'પ્રતિસાદ', trigger_synonyms: ['no response','no reply','vibhag','department','reply nathi'], response: null, next_state: 'urgency_check', capture: 'problem_type', captureValue: 'no_dept_response' },
        { type: 'condition', trigger: 'ટેક્નિકલ', trigger_synonyms: ['technical','tech','system','online','vilamb'], response: null, next_state: 'urgency_check', capture: 'problem_type', captureValue: 'technical' },
        { type: 'condition', trigger: 'નાણા', trigger_synonyms: ['paisa','money','financial','fund','rupiya'], response: null, next_state: 'urgency_check', capture: 'problem_type', captureValue: 'financial' },
        { type: 'condition', trigger: 'અન્ય', trigger_synonyms: ['other','anya','biju','something else'], response: null, next_state: 'urgency_check', capture: 'problem_type', captureValue: 'other' },
        { type: 'condition', trigger: 'હાલ', trigger_synonyms: ['not now','later','pachhi','abhi nahi','cant say'], response: null, next_state: 'no_details', capture: 'problem_type', captureValue: 'declined' },
      ],
    },
    partially_done: {
      text: 'સમજ્યા. કયો ભાગ હજુ બાકી છે? દસ્તાવેજ, મંજૂરી, ચૂકવણી, ટેક્નિકલ, અથવા અન્ય?',
      transitions: { default: 'urgency_check' },
      options: [],
    },
    never_applied: {
      text: 'સમજ્યા. શું આ ગેરસમજ હતી, કે કોઈ અન્ય પરિવાર સભ્યે અરજી કરી હતી, અથવા ડેટા ભૂલ છે?',
      transitions: { default: 'problem_recorded' },
      options: [],
    },
    urgency_check: {
      text: 'આ મુદ્દો કેટલો તાત્કાલિક છે? તાત્કાલિક, સામાન્ય, અથવા રાહ જોઈ શકો?',
      transitions: { default: 'escalate_check' },
      options: [
        { type: 'condition', trigger: 'તાત્કાલિક', trigger_synonyms: ['urgent','tatkalik','jaldi','emergency','asap'], response: null, next_state: 'escalate_check', capture: 'urgency', captureValue: 'urgent' },
        { type: 'condition', trigger: 'સામાન્ય', trigger_synonyms: ['normal','average','theek','ok','samanya'], response: null, next_state: 'escalate_check', capture: 'urgency', captureValue: 'normal' },
        { type: 'condition', trigger: 'રાહ', trigger_synonyms: ['wait','can wait','no rush','shakun','raah'], response: null, next_state: 'escalate_check', capture: 'urgency', captureValue: 'can_wait' },
      ],
    },
    escalate_check: {
      text: 'શું આપ ઇચ્છો છો કે અમારી ટીમ આ મુદ્દો સંબંધિત વિભાગ સુધી પહોંચાડે?',
      transitions: { default: 'contact_time', no: 'problem_recorded' },
      options: [
        { type: 'condition', trigger: 'હા', trigger_synonyms: ['yes','ok','okay','please','jarur','han','haa'], response: null, next_state: 'contact_time', capture: 'escalate', captureValue: 'yes' },
        { type: 'condition', trigger: 'ના', trigger_synonyms: ['no','nahi','na','naa','nai'], response: null, next_state: 'problem_recorded', capture: 'escalate', captureValue: 'no' },
      ],
    },
    contact_time: {
      text: 'સંપર્ક માટે કયો સમય યોગ્ય છે? અને WhatsApp અથવા SMS અપડેટ મંજૂર છે?',
      transitions: { default: 'problem_recorded' },
      options: [
        { type: 'condition', trigger: 'whatsapp', trigger_synonyms: ['whatsapp','wa','wapp'], response: null, next_state: 'problem_recorded', capture: 'contact_method', captureValue: 'whatsapp' },
        { type: 'condition', trigger: 'sms', trigger_synonyms: ['sms','message','msg','text'], response: null, next_state: 'problem_recorded', capture: 'contact_method', captureValue: 'sms' },
      ],
    },
    problem_recorded: {
      text: 'આભાર. આપની માહિતી નોંધાઈ ગઈ છે. અમારી ટીમ 48 કલાકમાં સંપર્ક કરશે. ઇ-કાર્યાલય આપની સેવા માટે પ્રતિબદ્ધ છે. શુભ દિવસ.',
      transitions: { default: 'end' },
      options: [],
    },
    no_details: {
      text: 'બરાબર. હાલ આપ તરફથી વિગતો પ્રાપ્ત થઈ નથી. જરૂર પડે તો કૃપા કરીને ઇ-કાર્યાલય હેલ્પલાઇન પર સંપર્ક કરશો. આભાર.',
      transitions: { default: 'end' },
      options: [],
    },
    fallback: {
      text: 'માફ કરશો, હાલ સિસ્ટમમાં ટેક્નિકલ સમસ્યા આવી છે. અમારી ટીમ જલ્દી જ આપને ફરીથી સંપર્ક કરશે.',
      transitions: { default: 'end' },
      options: [],
    },
  }
}

// ─────────────────────────────────────────────────────────────
// REAL-LIFE HANDLERS (global — applied before any state logic)
// ─────────────────────────────────────────────────────────────

const GLOBAL_HANDLERS = [
  {
    synonyms: ['faltu','bekaar','waste','gussa','shikayat','complaint','naaraj','angry'],
    response: 'અમે આપની લાગણી સમજીએ છીએ. કૃપા કરીને સમસ્યા જણાવો, અમે મદદ કરવા ઇચ્છીએ છીએ.',
  },
  {
    synonyms: ['bjp','congress','aap','party','rajkiy','political','neta','vote'],
    response: 'આ કૉલ સેવા પુષ્ટિ માટે છે. રાજકીય ચર્ચા અહીં શક્ય નથી.',
  },
  {
    synonyms: ['avaz nathi','clear nahi','sunai nahi','avaj','avaaj','spasht nathi'],
    response: 'માફ કરશો, અવાજ સ્પષ્ટ નથી. શું ફરીથી કહેશો?',
  },
]

// ─────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────

class ScriptFlowExecutor {
  /**
   * @param {object|null} flowConfig — parsed from PDF via parsePdfScript.js
   *                                   If null, uses FALLBACK_CONFIG
   */
  /**
   * @param {object|null} pdfTexts — { texts: { state_id: 'Gujarati prompt...' } }
   *                                  from parsePdfToFlowConfig(). If null uses fallback.
   */
  constructor(pdfTexts = null) {
    // Always use FALLBACK_CONFIG for logic/transitions
    // Override only the text for each state from the PDF
    this.config = JSON.parse(JSON.stringify(FALLBACK_CONFIG))  // deep clone
    if (pdfTexts?.texts) {
      for (const [stateId, text] of Object.entries(pdfTexts.texts)) {
        if (this.config.states[stateId] && text) {
          this.config.states[stateId].text = text
          console.log(`[ScriptFlow] 📄 PDF text loaded for state: ${stateId}`)
        }
      }
    }
    this.state         = 'intro'
    this.done          = false
    this.collectedData = {}
  }

  /** Called once at call start — speaks intro, then waits */
  getOpening() {
    return this.config.states['intro']?.text || FALLBACK_CONFIG.states.intro.text
  }

  /**
   * Called once per user utterance. Returns:
   *   { useLLM: false, text, action, stateId, capture_field, capture_value }
   *   { useLLM: true }  — only for truly unknown input
   */
  process(userText) {
    if (this.done || this.state === 'end') {
      return { useLLM: false, text: null, action: 'end' }
    }

    const lower = userText.trim().toLowerCase()

    // ── 1. Global real-life handlers ──────────────────────────
    for (const handler of GLOBAL_HANDLERS) {
      if (matchesAny(lower, handler.synonyms)) {
        console.log(`[ScriptFlow] 🔥 Global handler triggered`)
        return { useLLM: false, text: handler.response, action: 'continue', stateId: this.state }
      }
    }

    // Also check per-state real_life_handlers from PDF
    const currentState = this.config.states[this.state]
    if (currentState?.real_life_handlers) {
      for (const h of currentState.real_life_handlers) {
        if (matchesAny(lower, h.synonyms || [h.trigger])) {
          return { useLLM: false, text: h.response, action: 'continue', stateId: this.state }
        }
      }
    }

    // ── 2. Check options/conditions in current state ──────────
    if (currentState?.options) {
      for (const opt of currentState.options) {

        // Rating capture — any digit 1-5
        if (opt.type === 'rating_capture') {
          const digit = lower.match(/[1-5]/)
          const wordMatch = matchesAny(lower, ['excellent','good','average','bad','poor','khub','saro','samanya'])
          if (digit || wordMatch) {
            const val = digit ? digit[0] : lower
            this.collectedData[opt.capture || 'rating'] = val
            console.log(`[ScriptFlow] ⭐ Rating captured: ${val}`)
            return this._goTo('rating_done', 'rating', val)
          }
        }

        // Condition match
        if (opt.type === 'condition' || opt.type === 'choice') {
          const synonyms = opt.trigger_synonyms || opt.synonyms || [opt.trigger || opt.text]
          if (matchesAny(lower, synonyms)) {
            console.log(`[ScriptFlow] ✅ Match: "${opt.trigger || opt.text}"`)

            // Capture
            if (opt.capture) {
              const val = opt.captureValue || userText
              this.collectedData[opt.capture] = val
            }

            // If condition has its own response text → speak it, stay or move
            if (opt.response) {
              const nextId = opt.next_state || this._defaultNext()
              if (nextId) this.state = nextId
              if (opt.action === 'end') this.done = true
              return {
                useLLM:        false,
                text:          opt.response,
                action:        opt.action || 'continue',
                stateId:       this.state,
                capture_field: opt.capture,
                capture_value: opt.capture ? this.collectedData[opt.capture] : null,
              }
            }

            // No inline response → go directly to next state and speak its text
            const nextId = opt.next_state || this._defaultNext()
            return this._goTo(nextId, opt.capture, opt.capture ? this.collectedData[opt.capture] : null, opt.action)
          }
        }
      }
    }

    // ── 3. Default transition (user said something, just advance) ─
    const nextId = this._defaultNext()
    if (nextId && nextId !== 'end') {
      console.log(`[ScriptFlow] ➡️ Default advance → ${nextId}`)
      return this._goTo(nextId)
    }

    // ── 4. Unknown — let LLM handle ───────────────────────────
    console.log(`[ScriptFlow] 🤖 Unknown input in state ${this.state}, using LLM`)
    return { useLLM: true }
  }

  _defaultNext() {
    const state = this.config.states[this.state]
    return state?.transitions?.default || null
  }

  _goTo(nextStateId, captureField = null, captureValue = null, action = 'continue') {
    if (!nextStateId || nextStateId === 'end') {
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    const nextState = this.config.states[nextStateId]
    if (!nextState) {
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    this.state = nextStateId
    if (action === 'end') this.done = true

    console.log(`[ScriptFlow] ➡️ ${nextStateId}: "${nextState.text?.substring(0, 50)}"`)
    return {
      useLLM:        false,
      text:          nextState.text,
      action:        action || 'continue',
      stateId:       nextStateId,
      capture_field: captureField,
      capture_value: captureValue,
    }
  }

  getSummary() {
    return { finalState: this.state, collectedData: this.collectedData }
  }
}

// parseScript kept for backward compat — returns empty (not used anymore)
function parseScript() { return [] }

module.exports = { ScriptFlowExecutor, parseScript, FALLBACK_CONFIG }
