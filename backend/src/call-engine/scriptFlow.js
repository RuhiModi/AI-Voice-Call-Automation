// src/call-engine/scriptFlow.js
//
// RETELL-STYLE NODE EXECUTOR
// Each node has: prompt (what agent says) + edges (what user might say → where to go)
//
// Flow:
//   1. Agent speaks current node's prompt
//   2. Waits for user input
//   3. Matches user input against node's options/edges
//   4. Moves to matched next_state
//   5. If no match after 2 tries → re-asks same question
//   6. Global handlers (busy/DNC/wrong number) always checked first
//
// Script format (from PDF/DOCX/JSON):
// { flow: [
//   { id: "intro",      prompt: "...", options: ["હા", "ના"] },
//   { id: "task_check", prompt: "...", options: ["પૂર્ણ થયું", "બાકી છે"] },
//   { id: "task_done",  prompt: "...", options: [] },   ← terminal
// ]}

'use strict'

// ─────────────────────────────────────────────────────────────
// LANGUAGE KEYWORDS
// ─────────────────────────────────────────────────────────────

const YES_WORDS  = ['ha','haa','han','haan','yes','ok','okay','sure','bilkul','sahi','theek','kem nahi','zarur','हा','हां','हाँ','ہاں','હા','જી','ji','haji','ji ha','haa ji','han ji']
const NO_WORDS   = ['na','naa','nahi','nai','no','nope','nathi','baki','bakii','pending','nai thayu','nathi thayu','ના','ना','نہیں','બાકી','નથી','હજી']
const BUSY_WORDS = ['busy','vyast','baad mein','call back','pachhi','later','kal','saanje','time nathi','samay nahi','hu vyast','abhi nahi','thodi der','व्यस्त','बाद में']
const DNC_WORDS  = ['band karo','mat karo','remove','do not call','stop calling','nahi chahiye','naraj','faltu','bekaar']
const WRONG_WORDS= ['wrong number','galat number','khotho','wrong','galat','koi nahi','yahan nahi']
const REPEAT_WORDS = ['repeat','again','fari','pheri','samjhyu nahi','sunta nahi','clear nahi','avaz nathi','pardon','what','shun']

// ─────────────────────────────────────────────────────────────
// NORMALIZE — lowercase, strip punctuation
// ─────────────────────────────────────────────────────────────

function norm(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[।,.!?;:""'']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includes(haystack, needle) {
  return norm(haystack).includes(norm(needle))
}

function matchesAny(text, words) {
  return words.some(w => includes(text, w))
}

// ─────────────────────────────────────────────────────────────
// OPTION MATCHING
// How well does user's response match a scripted option?
// Returns score 0.0–1.0
// ─────────────────────────────────────────────────────────────

function scoreMatch(userText, optionText) {
  const u = norm(userText)
  const o = norm(optionText)
  if (!u || !o) return 0

  if (u === o)          return 1.0   // exact
  if (u.includes(o))    return 0.9   // option inside user text
  if (o.includes(u))    return 0.85  // user text inside option

  // Word overlap
  const uWords = u.split(' ').filter(w => w.length > 1)
  const oWords = o.split(' ').filter(w => w.length > 1)
  if (!uWords.length || !oWords.length) return 0
  const hits = uWords.filter(uw => oWords.some(ow => ow.includes(uw) || uw.includes(ow)))
  return hits.length / Math.max(uWords.length, oWords.length)
}

const MATCH_THRESHOLD = 0.3

// ─────────────────────────────────────────────────────────────
// BUILD STATE MAP
// Converts flat flow array → map of states with explicit routing
// Each option gets a next_state — if not specified, guessed from
// option text keywords vs state IDs in flow
// ─────────────────────────────────────────────────────────────

function buildStateMap(flowArray) {
  const stateIds = flowArray.map(n => n.id)
  const states   = {}

  flowArray.forEach((node, idx) => {
    const nextId = flowArray[idx + 1]?.id || 'end'

    const edges = (node.options || []).map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        // Object format: { text, next_state } — explicit routing from parser
        const next = opt.next_state || nextId
        return { text: String(opt.text || opt.label || '').trim(), next_state: next }
      }
      // String option — infer routing
      const next = inferNextState(opt, stateIds, idx, flowArray)
      return { text: String(opt).trim(), next_state: next }
    }).filter(e => e.text.length >= 1)

    states[node.id] = {
      prompt:       node.prompt || '',
      edges,
      default_next: nextId,
      terminal:     edges.length === 0,  // no options = terminal, ends call
    }
  })

  return states
}

// Infer which state an option leads to
// Logic: look for a state whose ID contains keywords matching the option
function inferNextState(optText, stateIds, currentIdx, flowArray) {
  const lower = norm(optText)

  // Yes/positive → next state in sequence
  if (matchesAny(lower, YES_WORDS) || lower.includes('હા') || lower.includes('पूर्ण') || lower.includes('complete') || lower.includes('done') || lower.includes('thayu')) {
    return flowArray[currentIdx + 1]?.id || 'end'
  }

  // No/negative → look for pending/problem/no state
  if (matchesAny(lower, NO_WORDS) || lower.includes('baki') || lower.includes('pending') || lower.includes('nathi') || lower.includes('nahi')) {
    const neg = flowArray.find((n, i) => i > currentIdx &&
      (n.id.includes('pending') || n.id.includes('problem') || n.id.includes('no_') || n.id.includes('_no') || n.id.includes('baki'))
    )
    return neg?.id || flowArray[currentIdx + 1]?.id || 'end'
  }

  // Can't give details → no_details state
  if (lower.includes('nahi aap') || lower.includes('vishay') || lower.includes('no detail') || lower.includes('shakto nathi')) {
    const nd = flowArray.find(n => n.id.includes('no_detail') || n.id.includes('no_info'))
    return nd?.id || flowArray[currentIdx + 1]?.id || 'end'
  }

  // Default: next in sequence
  return flowArray[currentIdx + 1]?.id || 'end'
}

// ─────────────────────────────────────────────────────────────
// GLOBAL REAL-LIFE HANDLERS
// Checked before any state logic — handle universal situations
// ─────────────────────────────────────────────────────────────

const GLOBAL_HANDLERS = [
  {
    id: 'wrong_number', words: WRONG_WORDS, action: 'end',
    say: { gu: 'માફ કરશો, ખોટો નંબર. અસુવિધા માટે ક્ષમા. આભાર.', hi: 'माफ़ करें, गलत नंबर। धन्यवाद।', en: 'Sorry, wrong number. Thank you.' },
  },
  {
    id: 'busy', words: BUSY_WORDS, action: 'reschedule',
    say: { gu: 'ઠીક છે. ક્યારે ફોન કરી શકીએ?', hi: 'ठीक है। कब कॉल करें?', en: 'No problem. When should we call back?' },
  },
  {
    id: 'dnc', words: DNC_WORDS, action: 'dnc',
    say: { gu: 'સમજ્યા. આ નંબર પર હવે કૉલ નહીં આવે.', hi: 'समझ गए। अब कॉल नहीं करेंगे।', en: 'Understood. We will not call again.' },
  },
  {
    id: 'repeat', words: REPEAT_WORDS, action: 'repeat',
    say: null,  // handled specially — re-speaks current prompt
  },
]

// ─────────────────────────────────────────────────────────────
// SCRIPT FLOW EXECUTOR
// ─────────────────────────────────────────────────────────────

class ScriptFlowExecutor {
  constructor(flowConfig = null) {
    this.collectedData     = {}
    this.confusionCount    = 0
    this.consecutiveMisses = 0
    this.done              = false
    this.language          = 'gu'
    this.contactName       = null
    this.personaName       = 'Priya'

    // Build state machine from flow config
    if (flowConfig?.flow && Array.isArray(flowConfig.flow) && flowConfig.flow.length > 0) {
      this.flowArray   = flowConfig.flow
      this.states      = buildStateMap(flowConfig.flow)
      this.stateOrder  = flowConfig.flow.map(n => n.id)
      console.log(`[ScriptFlow] ✅ Loaded ${this.flowArray.length} states: ${this.stateOrder.join(' → ')}`)
    } else {
      // Minimal fallback
      this.flowArray  = MINIMAL_FALLBACK
      this.states     = buildStateMap(MINIMAL_FALLBACK)
      this.stateOrder = MINIMAL_FALLBACK.map(n => n.id)
      console.log(`[ScriptFlow] ⚠️ No flow config — using minimal fallback`)
    }

    // Start at name verification state (always injected)
    this._injectNameVerify()
    this.currentStateId = '__name_verify'
  }

  // ── Set contact info (called by session.js) ───────────────
  setContact(contact, personaName, language) {
    this.contactName = contact?.variables?.name
      || contact?.variables?.Name
      || contact?.variables?.driver_name
      || null
    this.personaName = personaName || 'Priya'
    this.language    = language    || 'gu'
  }

  // ── Opening line — name verification ─────────────────────
  getNameVerifyOpening() {
    const n = this.contactName
    const p = this.personaName
    const l = this.language
    if (l === 'hi') return n ? `नमस्ते! मैं ${p} बोल रही हूं। क्या मैं ${n} जी से बात कर रही हूं?` : `नमस्ते! मैं ${p} बोल रही हूं।`
    if (l === 'en') return n ? `Hello! This is ${p} calling. Am I speaking with ${n}?` : `Hello! This is ${p} calling.`
    return n ? `નમસ્તે! હું ${p} બોલું છું. શું હું ${n} સાથે વાત કરી રહી છું?` : `નમસ્તે! હું ${p} બોલું છું.`
  }

  // Fallback for non-name-verify flows
  getOpening() {
    const first = this.states[this.stateOrder[0]]
    return first?.prompt || 'નમસ્તે!'
  }

  // ── MAIN PROCESS — called for every user utterance ────────
  process(userText, language = null) {
    if (language) this.language = language
    if (this.done) return { useLLM: false, text: null, action: 'end' }

    const lower = norm(userText)

    // ── 1. Global handlers (busy/wrong/DNC/repeat) ────────────
    for (const handler of GLOBAL_HANDLERS) {
      if (!matchesAny(lower, handler.words)) continue

      // Repeat → re-speak current prompt
      if (handler.id === 'repeat') {
        const current = this.states[this.currentStateId]
        const prompt  = current?.prompt || this.getOpening()
        console.log(`[ScriptFlow] 🔁 Repeat requested`)
        return { useLLM: false, text: prompt, action: 'continue', stateId: this.currentStateId }
      }

      console.log(`[ScriptFlow] 🔥 Global: ${handler.id}`)
      const say = handler.say[this.language] || handler.say.en
      if (handler.action === 'end' || handler.action === 'dnc') this.done = true
      return { useLLM: false, text: say, action: handler.action, stateId: this.currentStateId }
    }

    // ── 2. Name verify state ──────────────────────────────────
    if (this.currentStateId === '__name_verify') {
      return this._handleNameVerify(lower, userText)
    }

    // ── 3. Match against current state's edges ────────────────
    const state = this.states[this.currentStateId]
    if (!state) {
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    // Terminal state (no edges) — end after user acknowledges
    if (!state.edges || state.edges.length === 0) {
      console.log(`[ScriptFlow] 🏁 Terminal state ${this.currentStateId} — ending`)
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    // Find best matching edge
    let bestEdge  = null
    let bestScore = 0

    for (const edge of state.edges) {
      const score = scoreMatch(lower, edge.text)
      if (score > bestScore) {
        bestScore = score
        bestEdge  = edge
      }
    }

    // Also try yes/no detection against first/second edge
    if ((!bestEdge || bestScore < MATCH_THRESHOLD) && state.edges.length >= 1) {
      const isYes = matchesAny(lower, YES_WORDS) || lower.includes('હા') || lower.includes('हा')
      const isNo  = matchesAny(lower, NO_WORDS)  || lower.includes('ના') || lower.includes('ना')

      if (isNo) {
        // Find edge whose text contains no-words, else pick last edge
        const noEdge = state.edges.find(e =>
          matchesAny(e.text, NO_WORDS) ||
          norm(e.text).includes('ના') || norm(e.text).includes('na') ||
          norm(e.text).includes('baki') || norm(e.text).includes('nathi') ||
          norm(e.text).includes('બાકી') || norm(e.text).includes('નથી')
        )
        bestEdge  = noEdge || state.edges[state.edges.length - 1]
        bestScore = 0.7
      } else if (isYes) {
        // Find edge whose text contains yes-words, else pick first edge
        const yesEdge = state.edges.find(e =>
          matchesAny(e.text, YES_WORDS) ||
          norm(e.text).includes('હા') || norm(e.text).includes('ha') ||
          norm(e.text).includes('thayu') || norm(e.text).includes('થયું')
        )
        bestEdge  = yesEdge || state.edges[0]
        bestScore = 0.7
      }
    }

    if (bestEdge && bestScore >= MATCH_THRESHOLD) {
      console.log(`[ScriptFlow] ✅ "${this.currentStateId}" matched edge "${bestEdge.text}" (${bestScore.toFixed(2)}) → ${bestEdge.next_state}`)
      this.consecutiveMisses = 0
      return this._goTo(bestEdge.next_state)
    }

    // ── 4. No match — smart default or re-ask ───────────────────
    // If state has exactly 2 edges (yes/no style) and user gave substantial input
    // AND input is not a refusal → default to first positive edge
    const isRefusal = matchesAny(lower, ['nahi','na','naa','nathi','no','no details',
      'nahi aapi shaktu','haalo nahi','hal nahi','vishay nathi','vaat nahi',
      'હાલ નહીં','નહીં','ના','નથી'])

    if (state.edges.length === 2 && lower.length > 3 && !isRefusal) {
      // User said something substantial but not a refusal → take positive branch
      const posEdge = state.edges.find(e =>
        !matchesAny(norm(e.text), ['nahi','na','nathi','no','nai','hal nahi','ná','ná,']) &&
        !norm(e.text).includes('નહીં') && !norm(e.text).includes('નથી')
      ) || state.edges[0]
      console.log(`[ScriptFlow] ➡️ Defaulting to positive edge: "${posEdge.text}" → ${posEdge.next_state}`)
      this.consecutiveMisses = 0
      return this._goTo(posEdge.next_state)
    }

    this.consecutiveMisses++
    this.confusionCount++

    if (this.consecutiveMisses >= 3) {
      this.consecutiveMisses = 0
      console.log(`[ScriptFlow] ❓ 3 misses — re-asking without LLM`)
    }

    // Re-ask the current question politely
    const reask = { gu: 'માફ કરશો, હું સમજ્યો નહીં. ', hi: 'माफ़ करें, मैं समझ नहीं पाया। ', en: 'Sorry, I did not understand. ' }
    console.log(`[ScriptFlow] ❓ Miss #${this.consecutiveMisses} — re-asking`)
    return {
      useLLM:  false,
      text:    (reask[this.language] || reask.en) + state.prompt,
      action:  'continue',
      stateId: this.currentStateId,
    }
  }

  // ── Handle name verification ──────────────────────────────
  _handleNameVerify(lower, userText) {
    // Wrong number
    if (matchesAny(lower, WRONG_WORDS)) {
      this.done = true
      const say = { gu: 'માફ કરશો, ખોટો નંબર. આભાર.', hi: 'माफ़ करें, गलत नंबर।', en: 'Sorry, wrong number. Thank you.' }
      return { useLLM: false, text: say[this.language] || say.en, action: 'end' }
    }

    // Who is calling?
    if (norm(lower).includes('kon') || norm(lower).includes('kaun') || norm(lower).includes('who') || norm(lower).includes('કોણ')) {
      const say = {
        gu: `આ ${this.personaName} છે, સ્ક્રિપ્ટ પ્રમાણે સ્ક્રિપ્ટ. શું ${this.contactName || 'આપ'} ઉપલબ્ધ છો?`,
        hi: `मैं ${this.personaName} हूं। क्या ${this.contactName || 'आप'} उपलब्ध हैं?`,
        en: `This is ${this.personaName}. Is ${this.contactName || 'this the right person'} available?`,
      }
      return { useLLM: false, text: say[this.language] || say.en, action: 'continue', stateId: '__name_verify' }
    }

    // Confirmed — move to first real state
    const firstState = this.stateOrder[0]
    console.log(`[ScriptFlow] ✅ Name confirmed — starting flow at ${firstState}`)
    this.consecutiveMisses = 0
    return this._goTo(firstState)
  }

  // ── Move to a state and speak its prompt ──────────────────
  _goTo(nextStateId) {
    if (!nextStateId || nextStateId === 'end') {
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    const state = this.states[nextStateId]
    if (!state) {
      console.warn(`[ScriptFlow] ⚠️ State "${nextStateId}" not found`)
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    this.currentStateId = nextStateId

    // Terminal: no edges → end after speaking
    const isTerminal = !state.edges || state.edges.length === 0
    const action     = isTerminal ? 'end' : 'continue'
    if (isTerminal) this.done = true

    console.log(`[ScriptFlow] ▶ ${nextStateId}: "${state.prompt?.substring(0, 60)}"`)
    return { useLLM: false, text: state.prompt, action, stateId: nextStateId }
  }

  // ── Inject name verify as first step ─────────────────────
  _injectNameVerify() {
    this.states['__name_verify'] = {
      prompt:       null,  // built dynamically in getNameVerifyOpening()
      edges:        [],    // handled manually in _handleNameVerify()
      default_next: this.stateOrder[0] || 'end',
      terminal:     false,
    }
    this.states['__wrong_number'] = {
      prompt:    null,
      edges:     [],
      terminal:  true,
      default_next: 'end',
    }
  }

  getSummary() {
    return { finalState: this.currentStateId, collectedData: this.collectedData, confusionCount: this.confusionCount }
  }
}

// ─────────────────────────────────────────────────────────────
// MINIMAL FALLBACK FLOW
// ─────────────────────────────────────────────────────────────

const MINIMAL_FALLBACK = [
  { id: 'intro', prompt: 'નમસ્તે! શું હું આપનો 1 મિનિટ સમય લઈ શકું?', options: ['હા', 'ના, વ્યસ્ત છું'] },
  { id: 'main',  prompt: 'આ કૉલ આપની સેવા અંગે છે. શું આપ સ્થિતિ જણાવી શકો?', options: ['સારું છે', 'સમસ્યા છે'] },
  { id: 'end',   prompt: 'આભાર. આપનો સમય આપવા બદલ ધન્યવાદ. શુભ દિવસ.', options: [] },
]

// ─────────────────────────────────────────────────────────────
// CONFUSION PROMPT — for LLM fallback (minimal, focused)
// ─────────────────────────────────────────────────────────────

function buildConfusionPrompt(currentStateText, userText, language) {
  const langName = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }[language] || 'Gujarati'
  return `You are a voice assistant on a phone call in ${langName}.
The caller said something unexpected: "${userText}"
You were asking: "${currentStateText}"
Reply ONLY in JSON: { "text": "<1 short sentence to redirect back>", "action": "continue" }
Keep under 15 words. Stay on topic.`
}

// parseScript kept for backward compat
function parseScript() { return [] }

module.exports = { ScriptFlowExecutor, parseScript, buildConfusionPrompt, MINIMAL_FALLBACK }
