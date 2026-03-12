// src/call-engine/scriptFlow.js
//
// SCRIPT-FIRST STATE MACHINE
// Builds flow dynamically from user's script (JSON or PDF-parsed).
// LLM is NEVER used for normal conversation — only for true off-script situations.
//
// Flow JSON format:
// { "flow": [ { "id": "intro", "prompt": "...", "options": ["Yes", "No"] }, ... ] }
//
// Matching priority:
//   1. Exact / fuzzy match against options → advance to next state
//   2. Global real-life handlers (busy, angry, DNC, wrong number) → handle inline
//   3. Truly unknown → useLLM: true (rare — only for unexpected conversation)

'use strict'

// ─────────────────────────────────────────────────────────────
// FUZZY MATCH HELPER
// ─────────────────────────────────────────────────────────────

// Core yes/no/busy synonyms in Gujarati, Hindi, English
const YES_SYNONYMS  = ['ha','haa','han','yes','okay','ok','haan','sure','bilkul','jarur','sari','saro','thayu','thayi','che','done','complete','purn','ho gaya','kem nahi','chhe','aapo','aapi','shakay']
const NO_SYNONYMS   = ['na','naa','nai','nahi','no','not','nathi','nai thayu','abhi nahi','hu nahi','no nahi']
const BUSY_SYNONYMS = ['busy','vyast','vyas','later','pachhi','baad','call back','abhi nahi','kal','kaal','saanje','sanje','time nathi','samay nathi','hu vyast']
const DNC_SYNONYMS  = ['remove','nahi bolvu','band karo','mat karo','naraj','faltu','bekaar','stop calling','don\'t call','do not call']
const TRANSFER_SYNONYMS = ['human','agent','real person','asli','sachcho','manager','supervisor','koi manush','manushya']
const WRONG_SYNONYMS    = ['wrong number','khotho','galat number','this is wrong','no one here','koi nathi','wrong']

function normalize(text) {
  return (text || '').toLowerCase()
    .replace(/[।,\.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesAny(userText, synonyms) {
  const u = normalize(userText)
  return synonyms.some(s => u.includes(normalize(s)))
}

// Score how well userText matches an option label (0-1)
function matchScore(userText, optionText) {
  const u = normalize(userText)
  const o = normalize(optionText)
  if (!u || !o) return 0
  // Exact match
  if (u === o) return 1.0
  // Option fully contained in user text
  if (u.includes(o)) return 0.9
  // User text fully contained in option
  if (o.includes(u)) return 0.8
  // Word overlap score
  const uWords = u.split(' ').filter(w => w.length > 1)
  const oWords = o.split(' ').filter(w => w.length > 1)
  if (!uWords.length || !oWords.length) return 0
  const matches = uWords.filter(w => oWords.some(ow => ow.includes(w) || w.includes(ow)))
  return matches.length / Math.max(uWords.length, oWords.length)
}

const MATCH_THRESHOLD = 0.35  // Minimum score to consider a match

// ─────────────────────────────────────────────────────────────
// GLOBAL REAL-LIFE HANDLERS
// These fire regardless of current state — for common real-world situations
// All responses are generic enough to work for any campaign script
// ─────────────────────────────────────────────────────────────

const GLOBAL_HANDLERS = [
  {
    id:       'wrong_number',
    synonyms: WRONG_SYNONYMS,
    action:   'end',
    responses: {
      gu: 'માફ કરશો, ખોટો નંબર છે. અસુવિધા માટે ક્ષમા. આભાર.',
      hi: 'माफ़ करें, गलत नंबर लगा। असुविधा के लिए क्षमा। धन्यवाद।',
      en: 'Sorry for the inconvenience, wrong number. Thank you.',
    },
  },
  {
    id:       'busy',
    synonyms: BUSY_SYNONYMS,
    action:   'reschedule',
    responses: {
      gu: 'ઠીક છે. ક્યારે ફોન કરી શકીએ? 1 કલાક પછી, સાંજે, અથવા કાલે?',
      hi: 'ठीक है। कब फोन करें? 1 घंटे बाद, शाम को, या कल?',
      en: 'No problem. When should we call back? In 1 hour, evening, or tomorrow?',
    },
  },
  {
    id:       'dnc',
    synonyms: DNC_SYNONYMS,
    action:   'dnc',
    responses: {
      gu: 'સમજ્યા. આ નંબર પરથી હવે કૉલ નહીં આવે. આભાર.',
      hi: 'समझ गए। इस नंबर पर अब कॉल नहीं आएगा। धन्यवाद।',
      en: 'Understood. We will not call this number again. Thank you.',
    },
  },
  {
    id:       'transfer',
    synonyms: TRANSFER_SYNONYMS,
    action:   'transfer',
    responses: {
      gu: 'ઠીક છે, હું આપને અમારા ટીમ સભ્ય સાથે જોડું છું.',
      hi: 'ठीक है, मैं आपको हमारे टीम सदस्य से जोड़ता हूं।',
      en: 'Sure, let me connect you to a team member.',
    },
  },
  {
    id:       'unclear',
    synonyms: ['avaz nathi','avaj nathi','sunai nahi','clear nahi','spasht nathi','samjhayu nahi','pardon','repeat','again','pheri','fari'],
    action:   'continue',
    responses: {
      gu: 'માફ કરશો, સ્પષ્ટ સંભળાયું નહીં. શું ફરી કહેશો?',
      hi: 'माफ़ करें, स्पष्ट नहीं सुना। क्या दोबारा कहेंगे?',
      en: 'Sorry, I did not catch that. Could you please repeat?',
    },
  },
]

// ─────────────────────────────────────────────────────────────
// SCRIPT BUILDER — converts flat flow array → state map
// ─────────────────────────────────────────────────────────────

function buildStateMap(flowArray) {
  // flowArray: [{ id, prompt, options: [] }, ...]
  const states = {}

  flowArray.forEach((node, index) => {
    const nextNode = flowArray[index + 1]  // next state in sequence

    states[node.id] = {
      text:        node.prompt,
      options:     (node.options || []).map(opt => ({
        text:       opt,
        next_state: _resolveNextState(opt, flowArray, index),
      })),
      default_next: nextNode?.id || 'end',
      terminal:    !nextNode && (!node.options || node.options.length === 0),
    }
  })

  return states
}

// Determine which state an option leads to based on keywords
function _resolveNextState(optionText, flowArray, currentIndex) {
  const lower = normalize(optionText)

  // Positive → next state in sequence
  if (matchesAny(lower, YES_SYNONYMS) || lower.includes('હા') || lower.includes('yes') || lower.includes('complete') || lower.includes('done') || lower.includes('purn')) {
    // Find the "positive" branch — typically the state after current
    const positiveNode = flowArray[currentIndex + 1]
    return positiveNode?.id || 'end'
  }

  // Negative → find a "pending" or "no" state downstream
  if (matchesAny(lower, NO_SYNONYMS) || lower.includes('ના') || lower.includes('nahi') || lower.includes('pending') || lower.includes('baki')) {
    // Look for a state with "pending", "no", "problem" in its id
    const negNode = flowArray.find((n, i) => i > currentIndex && (n.id.includes('pending') || n.id.includes('problem') || n.id.includes('no_') || n.id.includes('_no')))
    return negNode?.id || flowArray[currentIndex + 1]?.id || 'end'
  }

  // Can't provide details → look for no_details state
  if (lower.includes('nathi') || lower.includes('nahi') || lower.includes('cannot') || lower.includes('no details')) {
    const noDetailsNode = flowArray.find(n => n.id.includes('no_detail') || n.id.includes('no_info'))
    return noDetailsNode?.id || flowArray[currentIndex + 1]?.id || 'end'
  }

  // Default: next in sequence
  return flowArray[currentIndex + 1]?.id || 'end'
}

// ─────────────────────────────────────────────────────────────
// CONFUSION TRACKER — triggers LLM only after N misses
// ─────────────────────────────────────────────────────────────

const MAX_CONFUSION_BEFORE_LLM = 2  // After 2 unknown inputs in a row → LLM

// ─────────────────────────────────────────────────────────────
// EXECUTOR CLASS
// ─────────────────────────────────────────────────────────────

class ScriptFlowExecutor {
  /**
   * @param {object|null} flowConfig — { flow: [...] } parsed from user's script
   *                                    OR { texts: {...} } from old PDF format (backward compat)
   */
  constructor(flowConfig = null) {
    this.confusionCount    = 0
    this.consecutiveMisses = 0
    this.collectedData     = {}
    this.done              = false
    this.language          = 'gu'  // updated by session.js on each turn

    // ── Build state map from script ───────────────────────────
    if (flowConfig?.flow && Array.isArray(flowConfig.flow)) {
      // New format: { flow: [{ id, prompt, options }] }
      this.flowArray = flowConfig.flow
      this.states    = buildStateMap(flowConfig.flow)
      this.stateOrder = flowConfig.flow.map(n => n.id)
      console.log(`[ScriptFlow] ✅ Loaded ${this.flowArray.length} states from script`)

    } else if (flowConfig?.texts) {
      // Old PDF format backward compat — build minimal states from texts
      this.states     = {}
      this.stateOrder = Object.keys(flowConfig.texts)
      this.flowArray  = this.stateOrder.map((id, i) => ({
        id,
        prompt:  flowConfig.texts[id],
        options: [],
      }))
      this.states = buildStateMap(this.flowArray)
      console.log(`[ScriptFlow] ⚠️ Legacy PDF texts format — built ${this.stateOrder.length} states`)

    } else {
      // No script — use minimal fallback
      this.flowArray  = MINIMAL_FALLBACK
      this.states     = buildStateMap(MINIMAL_FALLBACK)
      this.stateOrder = MINIMAL_FALLBACK.map(n => n.id)
      console.log(`[ScriptFlow] ⚠️ No script provided — using minimal fallback`)
    }

    // Start at first state
    this.currentStateId = this.stateOrder[0] || 'intro'
  }

  // ── Called once at start — returns opening line ───────────
  getOpening() {
    const first = this.states[this.stateOrder[0]]
    return first?.text || 'નમસ્તે!'
  }

  // ── Main process — called for every user utterance ────────
  // Returns: { useLLM: false, text, action, stateId }
  //       OR { useLLM: true }
  process(userText, language = null) {
    if (language) this.language = language
    if (this.done) return { useLLM: false, text: null, action: 'end' }

    const lower = normalize(userText)

    // ── 1. Global real-life handlers (busy/DNC/transfer/wrong) ─
    for (const handler of GLOBAL_HANDLERS) {
      if (matchesAny(lower, handler.synonyms)) {
        console.log(`[ScriptFlow] 🔥 Global handler: ${handler.id}`)
        const response = handler.responses[this.language] || handler.responses.en
        if (handler.action === 'end' || handler.action === 'dnc' || handler.action === 'transfer') {
          this.done = true
        }
        return {
          useLLM:  false,
          text:    response,
          action:  handler.action,
          stateId: this.currentStateId,
        }
      }
    }

    // ── 2. Try to match against current state's options ───────
    const currentState = this.states[this.currentStateId]

    if (currentState?.options?.length > 0) {
      let bestMatch = null
      let bestScore = 0

      for (const opt of currentState.options) {
        const score = matchScore(lower, opt.text)
        if (score > bestScore) {
          bestScore = score
          bestMatch = opt
        }
      }

      // Also check simple yes/no against options
      if (!bestMatch || bestScore < MATCH_THRESHOLD) {
        const isYes = matchesAny(lower, YES_SYNONYMS) || lower.includes('હા')
        const isNo  = matchesAny(lower, NO_SYNONYMS)  || lower.includes('ના')

        if (isYes && currentState.options[0]) {
          bestMatch = currentState.options[0]
          bestScore = 0.7
        } else if (isNo && currentState.options[1]) {
          bestMatch = currentState.options[1]
          bestScore = 0.7
        }
      }

      if (bestMatch && bestScore >= MATCH_THRESHOLD) {
        console.log(`[ScriptFlow] ✅ Matched option "${bestMatch.text}" (score: ${bestScore.toFixed(2)}) → ${bestMatch.next_state}`)
        this.consecutiveMisses = 0
        return this._goTo(bestMatch.next_state)
      }
    }

    // ── 3. No options or no match — default advance ───────────
    // If state has no options it's a statement — just advance on any response
    if (!currentState?.options?.length) {
      console.log(`[ScriptFlow] ➡️ No options in state ${this.currentStateId} — advancing`)
      this.consecutiveMisses = 0
      return this._goTo(currentState?.default_next || 'end')
    }

    // ── 4. Repeated confusion — use LLM as fallback ───────────
    this.consecutiveMisses++
    this.confusionCount++
    console.log(`[ScriptFlow] ❓ No match (miss #${this.consecutiveMisses}) in state: ${this.currentStateId}`)

    if (this.consecutiveMisses >= MAX_CONFUSION_BEFORE_LLM) {
      console.log(`[ScriptFlow] 🤖 Confusion threshold reached — handing to LLM`)
      this.consecutiveMisses = 0
      return { useLLM: true }
    }

    // First miss — re-ask the current question politely
    const reaskPrefix = {
      gu: 'માફ કરશો, હું સમજ્યો નહીં. ',
      hi: 'माफ़ करें, मैं समझ नहीं पाया। ',
      en: 'Sorry, I did not understand. ',
    }
    const prefix = reaskPrefix[this.language] || reaskPrefix.en
    return {
      useLLM:  false,
      text:    prefix + (currentState?.text || ''),
      action:  'continue',
      stateId: this.currentStateId,
    }
  }

  // ── Move to a new state ───────────────────────────────────
  _goTo(nextStateId) {
    if (!nextStateId || nextStateId === 'end') {
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    const nextState = this.states[nextStateId]
    if (!nextState) {
      console.warn(`[ScriptFlow] ⚠️ State "${nextStateId}" not found — ending`)
      this.done = true
      return { useLLM: false, text: null, action: 'end' }
    }

    this.currentStateId = nextStateId

    // Terminal state (no options, last in flow) → end after speaking
    const action = nextState.terminal ? 'end' : 'continue'
    if (action === 'end') this.done = true

    console.log(`[ScriptFlow] ➡️ → ${nextStateId}: "${nextState.text?.substring(0, 60)}"`)
    return {
      useLLM:  false,
      text:    nextState.text,
      action,
      stateId: nextStateId,
    }
  }

  getSummary() {
    return {
      finalState:    this.currentStateId,
      collectedData: this.collectedData,
      confusionCount: this.confusionCount,
    }
  }
}

// ─────────────────────────────────────────────────────────────
// MINIMAL FALLBACK — used only if no script provided at all
// ─────────────────────────────────────────────────────────────

const MINIMAL_FALLBACK = [
  {
    id:      'intro',
    prompt:  'નમસ્તે! શું હું આપનો 1 મિનિટ સમય લઈ શકું?',
    options: ['હા', 'ના, વ્યસ્ત છું'],
  },
  {
    id:      'main',
    prompt:  'આભાર. આ કૉલ આપની સેવા અંગે છે. શું આપ સ્થિતિ જણાવી શકો?',
    options: ['સારું છે', 'સમસ્યા છે'],
  },
  {
    id:      'thanks',
    prompt:  'આભાર. આપનો સમય આપવા બદલ ધન્યવાદ. શુભ દિવસ.',
    options: [],
  },
]

// ─────────────────────────────────────────────────────────────
// LLM PROMPT BUILDER — used only when confusion threshold hit
// Returns a minimal focused prompt (NOT the full script)
// ─────────────────────────────────────────────────────────────

function buildConfusionPrompt(currentStateText, userText, language) {
  const langName = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }[language] || 'Gujarati'
  return `You are a voice assistant on a phone call. 
The caller said something unexpected: "${userText}"
You were expecting a response to: "${currentStateText}"
Language: ${langName}

Reply ONLY in JSON: { "text": "<1 short sentence to get back on track>", "action": "continue" }
Keep it under 15 words. Do NOT introduce new topics. Just gently redirect.`
}

// parseScript kept for backward compat
function parseScript() { return [] }

module.exports = { ScriptFlowExecutor, parseScript, buildConfusionPrompt, MINIMAL_FALLBACK }
