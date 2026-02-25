// src/call-engine/llm/groq.js
// Groq — runs Llama 3.1 70B with ultra-low latency (~100ms).
// Use this with your FREE Groq credits for all trial calls.
// Sign up at: console.groq.com
const Groq   = require('groq-sdk')
const config = require('../../config')

const groq = new Groq({ apiKey: config.groqApiKey })

/**
 * Get AI response via Groq (Llama 3.1).
 * Groq's latency is 100–200ms — ideal for live phone calls.
 *
 * @param {string} systemPrompt
 * @param {Array}  history  - [{role, content}]
 * @param {string} userText
 * @returns {Object} { text, action, reschedule_time, collected_data, detected_language }
 */
async function getGroqResponse(systemPrompt, history, userText) {
  const trimmedHistory = history.slice(-10)

  const completion = await groq.chat.completions.create({
    model:       config.groqModel,
    messages: [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: userText },
    ],
    response_format: { type: 'json_object' },
    max_tokens:  300,
    temperature: 0.7,
  })

  const raw    = completion.choices[0].message.content
  const parsed = JSON.parse(raw)

  return {
    text:               parsed.text               || 'માફ કરો, ફરી પ્રયાસ કરો.',
    action:             parsed.action             || 'continue',
    reschedule_time:    parsed.reschedule_time    || null,
    collected_data:     parsed.collected_data     || {},
    detected_language:  parsed.detected_language  || 'gu',
    provider:           'groq',
  }
}

/**
 * Parse natural language reschedule time → ISO datetime via Groq.
 * e.g. "tomorrow 3pm" → "2025-01-16T09:30:00.000Z"
 */
async function parseRescheduleTimeGroq(naturalText) {
  if (!naturalText) return null
  const completion = await groq.chat.completions.create({
    model: config.groqModel,
    messages: [{
      role: 'user',
      content: `Parse this reschedule request into ISO datetime.
Current time: ${new Date().toISOString()}
User said: "${naturalText}"
Return ONLY valid JSON: { "datetime": "<ISO 8601 string or null>" }`,
    }],
    response_format: { type: 'json_object' },
    max_tokens:  60,
    temperature: 0,
  })
  const parsed = JSON.parse(completion.choices[0].message.content)
  return parsed.datetime || null
}

module.exports = { getGroqResponse, parseRescheduleTimeGroq }

