// src/call-engine/llm/openai.js
// OpenAI GPT-4o mini — paid provider.
// Automatically used when: LLM_PROVIDER=openai OR Groq fails.
const OpenAI = require('openai')
const config = require('../../config')

// Lazy init — client only created when first used, NOT at import time.
// This prevents a crash on startup when OPENAI_API_KEY is not set
// (e.g. when running in Groq-only mode with LLM_PROVIDER=groq).
let _client = null
function getClient() {
  if (!_client) {
    if (!config.openaiApiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. ' +
        'Add it in Render → Environment, ' +
        'or set LLM_PROVIDER=groq to skip OpenAI entirely.'
      )
    }
    _client = new OpenAI({ apiKey: config.openaiApiKey })
  }
  return _client
}

async function getOpenAIResponse(systemPrompt, history, userText) {
  const openai = getClient()
  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
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
    text:              parsed.text              || 'Sorry, please hold on.',
    action:            parsed.action            || 'continue',
    reschedule_time:   parsed.reschedule_time   || null,
    collected_data:    parsed.collected_data    || {},
    detected_language: parsed.detected_language || 'gu',
    provider:          'openai',
  }
}

async function parseRescheduleTimeOpenAI(naturalText) {
  if (!naturalText) return null
  const openai = getClient()
  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [{
      role: 'user',
      content: `Current time: ${new Date().toISOString()}\nParse "${naturalText}" into ISO datetime.\nReturn ONLY: { "datetime": "<ISO 8601 or null>" }`,
    }],
    response_format: { type: 'json_object' },
    max_tokens: 60,
    temperature: 0,
  })
  const parsed = JSON.parse(completion.choices[0].message.content)
  return parsed.datetime || null
}

module.exports = { getOpenAIResponse, parseRescheduleTimeOpenAI }
