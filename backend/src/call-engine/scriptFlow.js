// src/call-engine/scriptFlow.js
//
// HARDCODED STATE MACHINE from voice_flow-08__updated020326.pdf
//
// States: intro → task_check → task_done / task_pending / no_details → problem_recorded → end
// LLM is NEVER called for scripted states. Only for genuinely unknown input (fallback).
//
// Each state has:
//   text     — what AI speaks
//   options  — list of { match[], next, capture?, action? }
//   default  — fallback if nothing matches (either next state or useLLM)

// ─────────────────────────────────────────────────────────────
// MATCH HELPER
// ─────────────────────────────────────────────────────────────
// Returns true if userText contains any of the match terms (multilingual)

function matches(userText, terms) {
  const u = userText.toLowerCase().trim()
  return terms.some(t => u.includes(t.toLowerCase()))
}

// ─────────────────────────────────────────────────────────────
// THE FLOW — hardcoded from PDF
// ─────────────────────────────────────────────────────────────

const FLOW = {

  // ── INTRO ──────────────────────────────────────────────────
  intro: {
    text: 'નમસ્તે, દરિયાપુરના ધારાસભ્ય કૌશિક જૈનના ઇ-કાર્યાલય તરફથી બોલી રહ્યા છીએ. યોજનાકીય કેમ્પ દરમ્યાન આપનું કામ પૂર્ણ થયું છે કે નહીં તેની પુષ્ટિ માટે આ કૉલ છે. શું આપ હાલ 1 મિનિટ આપી શકો?',
    options: [
      {
        // Who is this — check FIRST so "bol kon" doesn't match 'bol' in yes
        match: ['કોણ', 'kon bole', 'bol kon', 'kaun hai', 'who are you', 'tame kon'],
        next:  'who_is_this',
      },
      {
        // Wrong number — check before no
        match: ['ખોટો નંબર', 'wrong number', 'khotho number', 'galat number'],
        next:  'wrong_number',
      },
      {
        // Busy / No — check before yes to avoid substring conflict
        match: ['ના, ', 'ના,', 'busy', 'વ્યસ્ત', 'સમય નથી', 'ઉપલબ્ધ નથી',
                'haal nahi', 'nahi', 'not now', 'later call'],
        next:  'reschedule',
        capture: 'availability',
        captureValue: 'not_available',
      },
      {
        // Call back later (standalone)
        match: ['પછી ફોન', 'call back', 'baad me call', 'pheri call'],
        next:  'reschedule',
      },
      {
        // Yes — available
        match: ['હા', 'ji', 'જી', 'bol', 'બોલ', 'haa', 'han', 'yes', 'okay', 'ok',
                'ટૂંક', 'sure', 'bolo', 'bolav'],
        next:  'task_check',
      },
    ],
    default: { next: 'task_check' }, // positive-sounding → proceed
  },

  // ── WHO IS THIS (clarification, then re-ask intro question) ──
  who_is_this: {
    text: 'આ કૉલ કેમ્પ દરમ્યાન નોંધાયેલ કામ અંગે પુષ્ટિ માટે છે. શું આપ હાલ 1 મિનિટ આપી શકશો?',
    options: [
      {
        match: ['હા', 'ji', 'જી', 'ok', 'okay', 'haa', 'han', 'yes', 'bol', 'બોલ', 'sure', 'bolav'],
        next: 'task_check',
      },
      {
        match: ['busy', 'વ્યસ્ત', 'nahi', 'later', 'ną'],
        next: 'reschedule',
      },
      {
        match: ['ના', 'na', 'naa', 'no'],
        next: 'reschedule',
      },
    ],
    default: { next: 'task_check' },
  },

  // ── RESCHEDULE ──────────────────────────────────────────────
  reschedule: {
    text: 'ઠીક છે. ક્યારે ફોન કરી શકીએ? 1 કલાક પછી, સાંજે, અથવા કાલે?',
    options: [
      {
        match: ['1 કલાક', '1 hour', 'ek kalak', 'one hour', 'klaak', 'kalak'],
        next: 'reschedule_confirmed',
        capture: 'reschedule_time', captureValue: '1_hour',
      },
      {
        match: ['સાંજ', 'evening', 'saanje', 'saanj', 'sanje'],
        next: 'reschedule_confirmed',
        capture: 'reschedule_time', captureValue: 'evening',
      },
      {
        match: ['કાલ', 'tomorrow', 'kal', 'kaale'],
        next: 'reschedule_confirmed',
        capture: 'reschedule_time', captureValue: 'tomorrow',
      },
      {
        match: ['નથી', 'nahi', 'no', 'nt', 'want', 'ichhta nathi', 'ઇચ્છતા નથી'],
        next: 'reschedule_confirmed',
        capture: 'reschedule_time', captureValue: 'declined',
      },
    ],
    // If they say a time like "5 vage" just capture it
    default: { next: 'reschedule_confirmed', capture: 'reschedule_time' },
  },

  // ── RESCHEDULE CONFIRMED ────────────────────────────────────
  reschedule_confirmed: {
    text: 'બરાબર. અમે આ સમયે ફરી સંપર્ક કરીશું. આભાર.',
    options: [],
    default: { next: 'end' },
  },

  // ── WRONG NUMBER ───────────────────────────────────────────
  wrong_number: {
    text: 'માફ કરશો અસુવિધા માટે. નંબર સુધારો ઉપલબ્ધ ન હોય તો આ કૉલ અહીં સમાપ્ત કરીએ. આભાર.',
    options: [],
    default: { next: 'end' },
  },

  // ── TASK CHECK ─────────────────────────────────────────────
  task_check: {
    text: 'કૃપા કરીને જણાવો કે યોજનાકીય કેમ્પ દરમ્યાન આપનું કામ પૂર્ણ થયું છે કે નહીં?',
    options: [
      {
        // Yes — task done
        match: ['હા', 'han', 'haa', 'yes', 'purn', 'પૂર્ણ', 'thayu', 'thai', 'thayun',
                'complete', 'done', 'ho gaya', 'thai gayu', 'tha', 'maru kam purn'],
        next: 'task_done',
        capture: 'task_status', captureValue: 'completed',
      },
      {
        // Never applied
        match: ['અરજી કરી નથી', 'arji nathi', 'apply nathi', 'mane arji nathi',
                'applied nahi', 'didnt apply', 'no application', 'arji j nathi'],
        next: 'never_applied',
        capture: 'task_status', captureValue: 'never_applied',
      },
      {
        // Partially done
        match: ['ભાગ્યે', 'bhagye', 'partly', 'partial', 'thodun', 'thodi', 'half'],
        next: 'partially_done',
        capture: 'task_status', captureValue: 'partial',
      },
      {
        // No — pending
        match: ['ના', 'na', 'naa', 'no', 'baki', 'બાકી', 'pending', 'nathi thayu',
                'nathi', 'nahi hua', 'nahi', 'hun baki', 'abhi nahi'],
        next: 'task_pending',
        capture: 'task_status', captureValue: 'pending',
      },
      {
        // Don't know
        match: ['ખબર નથી', 'khabar nathi', 'dont know', 'pata nahi', 'nai khabar'],
        next: 'task_pending',
        capture: 'task_status', captureValue: 'unknown',
      },
    ],
    default: { useLLM: true }, // unexpected answer — ask LLM to interpret
  },

  // ── TASK DONE ───────────────────────────────────────────────
  task_done: {
    text: 'ખૂબ આનંદ થયો કે આપનું કામ સફળતાપૂર્વક પૂર્ણ થયું છે. આભાર. દરિયાપુરના ધારાસભ્ય કૌશિક જૈનનું ઇ-કાર્યાલય આપની સેવા માટે હંમેશા તૈયાર છે. જો આપ ઇચ્છો તો 1 થી 5 સુધીમાં સેવા માટે રેટિંગ આપશો?',
    options: [
      { match: ['1'], next: 'rating_done', capture: 'rating', captureValue: '1' },
      { match: ['2'], next: 'rating_done', capture: 'rating', captureValue: '2' },
      { match: ['3'], next: 'rating_done', capture: 'rating', captureValue: '3' },
      { match: ['4'], next: 'rating_done', capture: 'rating', captureValue: '4' },
      { match: ['5'], next: 'rating_done', capture: 'rating', captureValue: '5' },
      { match: ['ખૂબ સંતોષ', 'khub santosh', 'very happy', 'excellent', 'best', 'sara'], next: 'rating_done', capture: 'rating', captureValue: '5' },
      { match: ['સામાન્ય', 'normal', 'average', 'ok', 'okay', 'theek'], next: 'rating_done', capture: 'rating', captureValue: '3' },
      { match: ['અસંતોષ', 'asantosh', 'bad', 'poor', 'nahi gamyu', 'not good'], next: 'rating_done', capture: 'rating', captureValue: '1' },
      { match: ['અભિપ્રાય નથી', 'abhipray nathi', 'no opinion', 'skip', 'nahi'], next: 'rating_done', capture: 'rating', captureValue: 'none' },
    ],
    default: { next: 'rating_done', capture: 'rating' }, // capture whatever they say
  },

  // ── RATING DONE ─────────────────────────────────────────────
  rating_done: {
    text: 'આભાર. આપનો પ્રતિસાદ અમારા માટે મહત્વનો છે. ઇ-કાર્યાલય આપની સેવા માટે પ્રતિબદ્ધ છે. શુભ દિવસ.',
    options: [],
    default: { next: 'end' },
  },

  // ── TASK PENDING ────────────────────────────────────────────
  task_pending: {
    text: 'માફ કરશો કે આપનું કામ હજુ પૂર્ણ થયું નથી. કૃપા કરીને આપની મુખ્ય સમસ્યા જણાવો: દસ્તાવેજ અધૂરા, વિભાગ તરફથી પ્રતિસાદ નથી, ટેક્નિકલ વિલંબ, નાણાકીય મુદ્દો, અથવા અન્ય?',
    options: [
      {
        match: ['દસ્તાવેજ', 'dastavej', 'document', 'papers', 'kagad', 'kagaz', 'adhura'],
        next: 'urgency_check',
        capture: 'problem_type', captureValue: 'documents',
      },
      {
        match: ['પ્રતિસાદ નથી', 'pratisad nathi', 'vibhag', 'department', 'reply nathi',
                'koi jawab nahi', 'no response', 'no reply'],
        next: 'urgency_check',
        capture: 'problem_type', captureValue: 'no_dept_response',
      },
      {
        match: ['ટેક્નિકલ', 'technical', 'system', 'online', 'tech', 'vilamb', 'delay'],
        next: 'urgency_check',
        capture: 'problem_type', captureValue: 'technical',
      },
      {
        match: ['નાણા', 'naana', 'paisa', 'money', 'financial', 'fund', 'rupiya'],
        next: 'urgency_check',
        capture: 'problem_type', captureValue: 'financial',
      },
      {
        match: ['અન્ય', 'anya', 'other', 'ble', 'something else', 'biju'],
        next: 'urgency_check',
        capture: 'problem_type', captureValue: 'other',
      },
      {
        match: ['હાલ', 'haal', 'abhi nahi', 'later', 'pachhi', 'not now', 'cant say'],
        next: 'no_details',
        capture: 'problem_type', captureValue: 'declined_to_share',
      },
    ],
    default: { next: 'urgency_check', capture: 'problem_type' },
  },

  // ── PARTIALLY DONE ──────────────────────────────────────────
  partially_done: {
    text: 'સમજ્યા. કયો ભાગ હજુ બાકી છે? દસ્તાવેજ, મંજૂરી, ચૂકવણી, ટેક્નિકલ કામ, અથવા અન્ય?',
    options: [
      { match: ['દસ્તાવેજ', 'document', 'dastavej', 'papers'], next: 'days_pending', capture: 'pending_part', captureValue: 'documents' },
      { match: ['મંજૂરી', 'manjuri', 'approval', 'permission'], next: 'days_pending', capture: 'pending_part', captureValue: 'approval' },
      { match: ['ચૂકવણી', 'chukavni', 'payment', 'paisa'], next: 'days_pending', capture: 'pending_part', captureValue: 'payment' },
      { match: ['ટેક્નિકલ', 'technical', 'tech'], next: 'days_pending', capture: 'pending_part', captureValue: 'technical' },
      { match: ['અન્ય', 'other', 'anya'], next: 'days_pending', capture: 'pending_part', captureValue: 'other' },
    ],
    default: { next: 'days_pending', capture: 'pending_part' },
  },

  // ── DAYS PENDING ────────────────────────────────────────────
  days_pending: {
    text: 'કેટલા દિવસથી આ ભાગ બાકી છે?',
    options: [],
    default: { next: 'urgency_check', capture: 'days_pending' },
  },

  // ── NEVER APPLIED ───────────────────────────────────────────
  never_applied: {
    text: 'સમજ્યા. શું આ ગેરસમજ હતી, કે કોઈ અન્ય પરિવાર સભ્યે અરજી કરી હતી, અથવા ડેટા ભૂલ છે?',
    options: [
      { match: ['ગેરસમજ', 'gersamaj', 'misunderstanding', 'mistake'], next: 'problem_recorded', capture: 'never_applied_reason', captureValue: 'misunderstanding' },
      { match: ['પરિવાર', 'parivar', 'family', 'member', 'anya', 'relative'], next: 'problem_recorded', capture: 'never_applied_reason', captureValue: 'family_member' },
      { match: ['ડેટા', 'data', 'bhool', 'error', 'mistake', 'galti'], next: 'problem_recorded', capture: 'never_applied_reason', captureValue: 'data_error' },
    ],
    default: { next: 'problem_recorded', capture: 'never_applied_reason' },
  },

  // ── URGENCY CHECK ───────────────────────────────────────────
  urgency_check: {
    text: 'આ મુદ્દો કેટલો તાત્કાલિક છે? તાત્કાલિક, સામાન્ય, અથવા રાહ જોઈ શકો?',
    options: [
      { match: ['તાત્કાલિક', 'tatkalik', 'urgent', 'jaldi', 'turant', 'emergency', 'asap'], next: 'escalate_check', capture: 'urgency', captureValue: 'urgent' },
      { match: ['સામાન્ય', 'samanya', 'normal', 'theek', 'ok'], next: 'escalate_check', capture: 'urgency', captureValue: 'normal' },
      { match: ['રાહ', 'raah', 'wait', 'can wait', 'shakun', 'no rush'], next: 'escalate_check', capture: 'urgency', captureValue: 'can_wait' },
    ],
    default: { next: 'escalate_check', capture: 'urgency' },
  },

  // ── ESCALATE CHECK ──────────────────────────────────────────
  escalate_check: {
    text: 'શું આપ ઇચ્છો છો કે અમારી ટીમ આ મુદ્દો સંબંધિત વિભાગ સુધી પહોંચાડે?',
    options: [
      {
        match: ['હા', 'han', 'haa', 'yes', 'please', 'jarur', 'pahonchado', 'pahonchad'],
        next: 'contact_time',
        capture: 'escalate', captureValue: 'yes',
      },
      {
        match: ['ના', 'na', 'no', 'nahi', 'naa', 'nai'],
        next: 'problem_recorded',
        capture: 'escalate', captureValue: 'no',
      },
      {
        match: ['પહેલા', 'pahela', 'more info', 'vdhu', 'vahu', 'info', 'tell me more'],
        next: 'more_info',
        capture: 'escalate', captureValue: 'wants_more_info',
      },
    ],
    default: { next: 'contact_time' },
  },

  // ── MORE INFO ───────────────────────────────────────────────
  more_info: {
    text: 'ઠીક છે. અમારી ટીમ 48 કલાકમાં સમીક્ષા કરીને સંપર્ક કરશે. શું આ ઠીક છે?',
    options: [
      { match: ['હા', 'yes', 'ok', 'okay', 'bol', 'han'], next: 'contact_time', capture: 'escalate', captureValue: 'yes' },
      { match: ['ના', 'no', 'nahi', 'na'], next: 'problem_recorded', capture: 'escalate', captureValue: 'no' },
    ],
    default: { next: 'contact_time' },
  },

  // ── CONTACT TIME ────────────────────────────────────────────
  contact_time: {
    text: 'સંપર્ક માટે કયો સમય યોગ્ય છે? અને WhatsApp અથવા SMS અપડેટ મંજૂર છે?',
    options: [
      { match: ['whatsapp', 'wa', 'wapp'], next: 'problem_recorded', capture: 'contact_method', captureValue: 'whatsapp' },
      { match: ['sms', 'message', 'msg'], next: 'problem_recorded', capture: 'contact_method', captureValue: 'sms' },
      { match: ['ફોન', 'phone', 'call', 'fon'], next: 'problem_recorded', capture: 'contact_method', captureValue: 'call' },
      { match: ['હા', 'yes', 'ok', 'han', 'both', 'bnne'], next: 'problem_recorded', capture: 'contact_method', captureValue: 'any' },
    ],
    default: { next: 'problem_recorded', capture: 'contact_time' },
  },

  // ── PROBLEM RECORDED ────────────────────────────────────────
  problem_recorded: {
    text: 'આભાર. આપની માહિતી નોંધાઈ ગઈ છે. અમારી ટીમ 48 કલાકમાં સંપર્ક કરશે. ઇ-કાર્યાલય આપની સેવા માટે પ્રતિબદ્ધ છે. શુભ દિવસ.',
    options: [],
    default: { next: 'end' },
  },

  // ── NO DETAILS ──────────────────────────────────────────────
  no_details: {
    text: 'બરાબર. હાલ આપ તરફથી વિગતો પ્રાપ્ત થઈ નથી. જરૂર પડે તો કૃપા કરીને ઇ-કાર્યાલય હેલ્પલાઇન પર સંપર્ક કરશો. આભાર.',
    options: [],
    default: { next: 'end' },
  },

  // ── FALLBACK ────────────────────────────────────────────────
  fallback: {
    text: 'માફ કરશો, હાલ સિસ્ટમમાં ટેક્નિકલ સમસ્યા આવી છે. અમારી ટીમ જલ્દી જ આપને ફરીથી સંપર્ક કરશે.',
    options: [],
    default: { next: 'end' },
  },

  end: { text: null, options: [], default: { next: 'end' } },
}

// ─────────────────────────────────────────────────────────────
// REAL-LIFE RESPONSE HANDLERS (PDF Section: Additional Handling)
// These are checked BEFORE state transitions
// ─────────────────────────────────────────────────────────────

const REAL_LIFE_HANDLERS = [
  {
    // Angry / frustrated
    match: ['gussa', 'problem chhe', 'shikayat', 'naaraj', 'krodh', 'angry', 'frustrated',
            'tamne shun', 'bekaar', 'faltu', 'waste'],
    response: 'અમે આપની લાગણી સમજીએ છીએ. કૃપા કરીને સમસ્યા જણાવો, અમે મદદ કરવા ઇચ્છીએ છીએ.',
    continueFlow: true,  // after speaking, stay in same state
  },
  {
    // Political comment
    match: ['bjp', 'congress', 'aap', 'party', 'rajkaran', 'rajkiy', 'political', 'neta'],
    response: 'આ કૉલ સેવા પુષ્ટિ માટે છે. રાજકીય ચર્ચા અહીં શક્ય નથી.',
    continueFlow: true,
  },
  {
    // Voice unclear
    match: ['avaj', 'awaz', 'sunai', 'clear nahi', 'spaShT nathi', 'avaaj nathi'],
    response: 'માફ કરશો, અવાજ સ્પષ્ટ નથી. શું ફરીથી કહેશો?',
    continueFlow: true,
  },
]

// ─────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────

class ScriptFlowExecutor {
  constructor() {
    this.state       = 'intro'
    this.done        = false
    this.collectedData = {}
  }

  /**
   * Get the opening text (called once at call start, before any user input)
   */
  getOpening() {
    const state = FLOW[this.state]
    return state?.text || null
  }

  /**
   * Called once per user utterance.
   * Returns:
   *   { useLLM: false, text, action?, capture_field?, capture_value?, stateId }
   *   { useLLM: true }   — only for genuinely ambiguous input
   */
  process(userText) {
    if (this.done || this.state === 'end') {
      return { useLLM: false, text: null, action: 'end' }
    }

    const lower = userText.trim().toLowerCase()

    // ── 1. Real-life handlers (anger, politics, unclear audio) ──
    for (const handler of REAL_LIFE_HANDLERS) {
      if (handler.match.some(m => lower.includes(m.toLowerCase()))) {
        console.log(`[ScriptFlow] 🔥 Real-life handler: "${handler.response.substring(0, 40)}"`)
        return {
          useLLM:        false,
          text:          handler.response,
          action:        'continue',
          stayInState:   true,  // don't advance state
          stateId:       this.state,
        }
      }
    }

    // ── 2. Match options in current state ───────────────────────
    const currentState = FLOW[this.state]
    if (!currentState) {
      console.warn(`[ScriptFlow] Unknown state: ${this.state}`)
      return { useLLM: true }
    }

    for (const option of currentState.options) {
      if (matches(lower, option.match)) {
        // Capture data
        if (option.capture) {
          const val = option.captureValue || userText
          this.collectedData[option.capture] = val
          console.log(`[ScriptFlow] 📝 Captured ${option.capture} = "${val}"`)
        }

        // Advance state
        const nextStateId = option.next
        const nextState   = FLOW[nextStateId]
        this.state = nextStateId

        if (nextStateId === 'end' || !nextState?.text) {
          this.done = true
          return { useLLM: false, text: null, action: 'end' }
        }

        console.log(`[ScriptFlow] ➡️ ${nextStateId}: "${nextState.text.substring(0, 50)}"`)
        return {
          useLLM:        false,
          text:          nextState.text,
          action:        option.action || 'continue',
          capture_field: option.capture,
          capture_value: this.collectedData[option.capture],
          stateId:       nextStateId,
        }
      }
    }

    // ── 3. Default transition ───────────────────────────────────
    const def = currentState.default
    if (!def) return { useLLM: true }

    if (def.useLLM) {
      console.log(`[ScriptFlow] 🤖 Default → LLM for state: ${this.state}`)
      return { useLLM: true }
    }

    // Capture raw userText if default has capture
    if (def.capture) {
      this.collectedData[def.capture] = userText
      console.log(`[ScriptFlow] 📝 Default captured ${def.capture} = "${userText}"`)
    }

    const nextStateId = def.next
    const nextState   = FLOW[nextStateId]
    this.state = nextStateId

    if (nextStateId === 'end' || !nextState?.text) {
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    console.log(`[ScriptFlow] ➡️ Default → ${nextStateId}: "${nextState.text.substring(0, 50)}"`)
    return {
      useLLM:        false,
      text:          nextState.text,
      action:        def.action || 'continue',
      capture_field: def.capture,
      capture_value: def.capture ? userText : null,
      stateId:       nextStateId,
    }
  }

  getSummary() {
    return {
      finalState:    this.state,
      collectedData: this.collectedData,
    }
  }
}

// Parse not needed anymore — we export executor directly
function parseScript(_rawScript) { return [] }

module.exports = { ScriptFlowExecutor, parseScript, FLOW }
