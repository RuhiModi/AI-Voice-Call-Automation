// src/call-engine/quickReply.js
// When user says simple filler words (yes, ok, hello, hmm),
// skip the LLM entirely and continue the script directly.
// This saves ~800ms per turn and avoids token limits.

// Simple acknowledgement words — no real info, just "keep going"
const ACK_PATTERNS = [
  // Gujarati
  /^(હા|જી|જી હા|ઠીક|ઠીક છે|અચ્છા|સારું|હં|ઓ|ઓહ|ઓકે|ચાલો|બોલો|હેલો|હેલ્લો|હા બોલો|જી બોલો|હં બોલો|ભલે|ચાલ)$/i,
  // Hindi
  /^(हाँ|हां|जी|ठीक|ठीक है|अच्छा|ओके|ओह|हम्म|बोलो|हेलो|भले|चलो|जी हाँ)$/i,
  // English
  /^(yes|ok|okay|hi|hello|sure|go on|go ahead|hmm|uh|yeah|yep|alright|fine|right|continue|please)$/i,
]

// Script flow: extract next lines from campaign script to say
// Returns the next unspoken sentence from the script
function getNextScriptLine(scriptContent, spokenLines = []) {
  if (!scriptContent) return null

  const lines = scriptContent
    .split(/\n/)
    .map(l => l.trim())
    .filter(l =>
      l.length > 15 &&
      !l.match(/^[0-9🔢1️⃣2️⃣3️⃣4️⃣5️⃣]/u) &&   // skip numbered instructions
      !l.toLowerCase().startsWith('if ') &&
      !l.toLowerCase().startsWith('when ') &&
      !l.toLowerCase().startsWith('note:') &&
      !l.match(/^priya\s/i)                         // skip "Priya:" speaker labels
    )

  // Find first line not yet spoken
  for (const line of lines) {
    const alreadySpoken = spokenLines.some(spoken =>
      spoken.includes(line.substring(0, 30))
    )
    if (!alreadySpoken) {
      // Take first 2 sentences from this line
      const sentences = line.match(/[^.!?।]+[.!?।]?/g) || [line]
      return sentences.slice(0, 2).join(' ').trim()
    }
  }
  return null
}

/**
 * Check if user's response is a simple acknowledgement.
 * If yes, returns the next script line to speak — no LLM needed.
 * If no, returns null (LLM should handle it).
 *
 * @param {string} userText
 * @param {string} scriptContent
 * @param {Array}  transcript  [{role, content}]
 * @returns {{ text, action, provider } | null}
 */
function tryQuickReply(userText, scriptContent, transcript = []) {
  if (!userText) return null

  const cleaned = userText.trim()

  // Check if it's a simple ack
  const isAck = ACK_PATTERNS.some(p => p.test(cleaned))
  if (!isAck) return null

  // Get already-spoken assistant lines
  const spokenLines = transcript
    .filter(t => t.role === 'assistant')
    .map(t => t.content || t.text || '')

  // Try to get next script line
  const nextLine = getNextScriptLine(scriptContent, spokenLines)

  if (!nextLine) return null  // No script left — let LLM handle graceful end

  console.log(`[QuickReply] ⚡ Skipping LLM — ack detected: "${cleaned}" → script continuation`)
  return {
    text:              nextLine,
    action:            'continue',
    collected_data:    {},
    detected_language: null,   // keep current language
    provider:          'script',
  }
}

module.exports = { tryQuickReply }
