// src/call-engine/llm/groq.js
// Groq — runs Llama 3.1 70B with ultra-low latency (~100ms).
// Use this with your FREE Groq credits for all trial calls.
// Sign up at: console.groq.com
const Groq   = require('groq-sdk')
const config = require('../../config')

// Lazy init — prevents crash at startup when GROQ_API_KEY is not set
// (e.g. when running OpenAI-only mode with LLM_PROVIDER=openai).
let _client = null
function getClient() {
  if (!_client) {
    if (!config.groqApiKey) {
      throw new Error(
        'GROQ_API_KEY is not set. ' +
        'Add it in Render → Environment, ' +
        'or set LLM_PROVIDER=openai to use OpenAI instead.'
      )
    }
    _client = new Groq({ apiKey: config.groqApiKey })
  }
  return _client
}

async function getGroqResponse(systemPrompt, history, userText) {
  const groq = getClient()
  const completion = await groq.chat.completions.create({
    model:       config.groqModel,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: userText },
    ],
    response_format: { type: 'json_object' },
    max_tokens:  300,
    temperature: 0.7,
  })

  const parsed = JSON.parse(completion.choices[0].message.content)
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
