// src/call-engine/scriptFlow.js
// Converts raw campaign script text into a structured conversation flow.
// Executes the flow step-by-step. LLM is only called for unknown responses.

// ── Parser ─────────────────────────────────────────────────────────────────
// Converts the user's raw script text (with emoji numbers, conditions, etc.)
// into a clean array of flow steps.

function parseScript(rawScript) {
  if (!rawScript) return []

  const steps = []

  // Split into numbered sections by emoji numbers or digit+️⃣ or plain numbers
  const sections = rawScript.split(/(?=(?:[0-9]️⃣|🔟|1️⃣1️⃣|\d+[.)]\s))/u).map(s => s.trim()).filter(Boolean)

  for (const section of sections) {
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    // First line is the section header (e.g. "3️⃣ If User Asks "Who is this?"")
    const header = lines[0]
    const body   = lines.slice(1).join(' ').trim()

    // ── Opening greeting (no number prefix, first clean speech line) ──
    if (!header.match(/^[0-9🔢1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟]/u) && header.length > 15) {
      const sentences = header.match(/[^.!?।]+[.!?।]?/g) || [header]
      steps.push({
        id:       'opening',
        type:     'speak',
        text:     sentences.slice(0, 2).join(' ').trim(),
        capture:  null,
      })
      continue
    }

    // ── Condition steps: "If User Says/Asks/Work ..." ──
    const ifMatch = header.match(/if (?:user )?(?:says?|asks?|mentions?|work|is)\s+["""]?(.+?)[""]?\s*(?:respond|ask|:)?$/i)
    if (ifMatch) {
      // Truncate trigger to key phrase only (max 4 words, stop at Gujarati or "respond")
      let trigger = ifMatch[1].trim().replace(/[""":]/g, '').trim()
      trigger = trigger.split(/\s+(?:respond|ask|priya)/i)[0].trim()
      const gujIdx = trigger.search(/[\u0A80-\u0AFF]/u)
      if (gujIdx > 0) trigger = trigger.substring(0, gujIdx).trim()
      trigger = trigger.split(/\s+/).slice(0, 4).join(' ').trim()
      const response = extractResponse(body || header)
      const capture  = extractCapture(body)
      if (response) {
        steps.push({
          id:       slugify(trigger),
          type:     'condition',
          trigger:  trigger,
          text:     response,
          capture:  capture,
          action:   detectAction(header + ' ' + body),
        })
        continue
      }
    }

    // ── Question/capture steps: "Ask ..." or "Main Question" ──
    const questionMatch = header.match(/(?:main question|ask|question|inquire)/i)
    if (questionMatch) {
      const question = extractResponse(body || header)
      const capture  = extractCapture(body)
      steps.push({
        id:      'question_' + steps.length,
        type:    'question',
        text:    question,
        capture: capture,
        options: extractOptions(body),
      })
      continue
    }

    // ── Closing steps ──
    if (header.match(/final closing|closing|close|thank|આભાર/i)) {
      const text = extractResponse(body || header)
      steps.push({
        id:   'closing_' + steps.length,
        type: 'closing',
        text: text || body,
      })
      continue
    }

    // ── Generic speak step ──
    const text = extractResponse(body || header)
    if (text && text.length > 5) {
      steps.push({
        id:     'step_' + steps.length,
        type:   'speak',
        text:   text,
        capture: extractCapture(body),
        action:  detectAction(header + ' ' + body),
      })
    }
  }

  return steps
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractResponse(text) {
  // Find Gujarati/Hindi sentence — look for content after "Respond:" or "Priya" or just Gujarati text
  const respondMatch = text.match(/(?:respond:|priya\s+)([\u0A80-\u0AFF\u0900-\u097F\s,.'!?।]+)/i)
  if (respondMatch) return respondMatch[1].trim()

  // Extract Gujarati/Hindi text directly
  const gujMatch = text.match(/([\u0A80-\u0AFF][\u0A80-\u0AFF\s,.'!?।]{10,})/u)
  if (gujMatch) return gujMatch[1].trim()

  return null
}

function extractCapture(text) {
  const match = text.match(/(?:store|capture|collect|save)\s+([a-z_\s]+)/i)
  if (match) return match[1].trim().replace(/\s+/g, '_').toLowerCase()
  if (text.includes('rating'))         return 'rating'
  if (text.includes('reschedule'))     return 'reschedule_time'
  if (text.includes('problem'))        return 'problem_type'
  if (text.includes('urgency'))        return 'urgency'
  if (text.includes('callback'))       return 'callback_time'
  if (text.includes('contact_method')) return 'contact_method'
  return null
}

function extractOptions(text) {
  // Extract options listed line by line or comma-separated
  const opts = []
  const lines = text.split(/[\n,]/).map(l => l.trim()).filter(l =>
    l.length > 1 &&
    !l.match(/^[0-9]/i) &&
    !l.toLowerCase().startsWith('if ') &&
    !l.toLowerCase().startsWith('respond')
  )
  // Only keep short option-like lines (< 40 chars)
  lines.forEach(l => { if (l.length < 40) opts.push(l) })
  return opts.length > 1 ? opts : []
}

function detectAction(text) {
  const lower = text.toLowerCase()
  if (lower.includes('reschedule') || lower.includes('busy') || lower.includes('call back')) return 'reschedule'
  if (lower.includes('transfer') || lower.includes('escalat')) return 'transfer'
  if (lower.includes('dnc') || lower.includes('not interested') || lower.includes('remove')) return 'dnc'
  if (lower.includes('close') || lower.includes('closing') || lower.includes('end')) return 'end'
  return 'continue'
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\u0A80-\u0AFF]/gu, '_').slice(0, 30)
}

// ── Flow Executor ──────────────────────────────────────────────────────────
// Given the parsed steps and current conversation state,
// returns the next response WITHOUT using LLM.

class ScriptFlowExecutor {
  constructor(steps) {
    this.steps       = steps
    this.currentStep = 0
    this.done        = false
  }

  /**
   * Process user input against the flow.
   * Returns { text, action, capture_field, capture_value, useLLM: false }
   * or { useLLM: true } if the flow can't handle it.
   */
  process(userText) {
    if (this.done || !userText) return { useLLM: true }

    const lower = userText.toLowerCase().trim()

    // 1. Check condition steps first (triggers from anywhere in flow)
    for (const step of this.steps) {
      if (step.type !== 'condition') continue
      if (this._matches(lower, step.trigger)) {
        this.done = (step.action === 'end' || step.action === 'dnc')
        return {
          useLLM:        false,
          text:          step.text,
          action:        step.action || 'continue',
          capture_field: step.capture,
          capture_value: step.capture ? userText : null,
          provider:      'script_flow',
        }
      }
    }

    // 2. Try current step
    const step = this.steps[this.currentStep]
    if (!step) return { useLLM: true }

    // For question steps — any response advances flow
    if (step.type === 'question' || step.type === 'speak') {
      const nextStep = this.steps[this.currentStep + 1]
      this.currentStep++
      if (!nextStep) {
        this.done = true
        return { useLLM: true }  // Let LLM handle graceful end
      }
      return {
        useLLM:        false,
        text:          nextStep.text,
        action:        nextStep.action || 'continue',
        capture_field: step.capture,
        capture_value: step.capture ? userText : null,
        provider:      'script_flow',
      }
    }

    // 3. Can't handle — let LLM take over
    return { useLLM: true }
  }

  _matches(userText, trigger) {
    if (!trigger) return false
    const t = trigger.toLowerCase()
    const u = userText.toLowerCase()

    // Direct partial match
    if (u.includes(t) || t.includes(u)) return true

    // Keyword synonym map — English trigger → Gujarati/Hindi user words
    const synonyms = {
      'who is this':      ['કોણ', 'kaun', 'who'],
      'busy':             ['વ્યસ્ત', 'busy', 'baad', 'later', 'pachi', 'pachhi', 'व्यस्त', 'baad me'],
      'yes':              ['હા', 'જી', 'ઠીક', 'ઓકે', 'ભલે', 'haa', 'ji', 'han', 'हां', 'हाँ'],
      'no':               ['ના', 'નહ', 'nahi', 'naa', 'नहीं', 'na'],
      'completed':        ['પૂર્ણ', 'complete', 'thayun', 'thayu', 'पूर्ण', 'हो गया'],
      'not completed':    ['બાકી', 'pending', 'baki', 'nathi', 'नहीं हुआ', 'baaki'],
      'never applied':    ['અરજી કરી નથી', 'apply nathi', 'applied nahi', 'mane nathi khabar'],
      'reschedule':       ['later', 'pachi', 'kal', 'baad', 'tomorrow', 'evening'],
      'angry':            ['gussa', 'problem', 'complaint', 'issue'],
    }

    for (const [key, variants] of Object.entries(synonyms)) {
      if (t.includes(key)) {
        if (variants.some(v => u.includes(v.toLowerCase()))) return true
      }
    }
    return false
  }

  getOpeningText() {
    const opening = this.steps.find(s => s.id === 'opening' || s.type === 'speak')
    return opening?.text || null
  }

  advance() {
    this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1)
  }
}

module.exports = { parseScript, ScriptFlowExecutor }
