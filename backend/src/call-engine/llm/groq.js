// src/call-engine/llm/groq.js
// Groq — runs Llama 3.1 70B with ultra-low latency (~100ms).
// Use this with your FREE Groq credits for all trial calls.
// Sign up at: console.groq.com
const Groq   = require('groq-sdk')
const config = require('../../config')

let _client = null
function getClient() {
  if (!_client) {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY is not set. Add it in Render → Environment.')
    }
    try {
      _client = new Groq({ apiKey: config.groqApiKey })
    } catch (err) {
      throw new Error('Failed to init Groq client: ' + err.message)
    }
  }
  return _client
}

async function getGroqResponse(systemPrompt, history, userText) {
  const groq = getClient()
  const completion = await groq.chat.completions.create({
    model:       'llama-3.1-8b-instant',  // Fast model — 3x faster than 70b
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4),  // Only last 4 turns to save tokens
      { role: 'user', content: userText },
    ],
    response_format: { type: 'json_object' },
    max_tokens:  500,  // Must be enough for full JSON object
    temperature: 0.7,
  })

  let parsed = {}
  try {
    parsed = JSON.parse(completion.choices[0].message.content)
  } catch (e) {
    // If JSON parse fails, extract text directly
    const raw = completion.choices[0].message.content
    parsed = { text: raw, action: 'continue' }
  }
  return {
    text:               parsed.text               || 'માફ કરો, ફરી પ્રયાસ કરો.',
    action:             parsed.action             || 'continue',
    reschedule_time:    parsed.reschedule_time    || null,
    collected_data:     parsed.collected_data     || {},
    detected_language:  parsed.detected_language  || 'gu',
    provider:           'groq',
  }
}

async function parseRescheduleTimeGroq(naturalText) {
  if (!naturalText) return null
  const groq = getClient()
  const completion = await groq.chat.completions.create({
    model: config.groqModel,
    messages: [{
      role: 'user',
      content: `Parse this reschedule request into ISO datetime.\nCurrent time: ${new Date().toISOString()}\nUser said: "${naturalText}"\nReturn ONLY valid JSON: { "datetime": "<ISO 8601 string or null>" }`,
    }],
    response_format: { type: 'json_object' },
    max_tokens:  60,
    temperature: 0,
  })
  const parsed = JSON.parse(completion.choices[0].message.content)
  return parsed.datetime || null
}

module.exports = { getGroqResponse, parseRescheduleTimeGroq }
