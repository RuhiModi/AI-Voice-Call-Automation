// src/call-engine/llm/openai.js
// OpenAI GPT-4o mini — paid provider.
// Automatically used when: LLM_PROVIDER=openai OR Groq fails.
const OpenAI = require('openai')
const config = require('../../config')

const openai = new OpenAI({ apiKey: config.openaiApiKey })

async function getOpenAIResponse(systemPrompt, history, userText) {
  const trimmedHistory = history.slice(-10)

  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
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
  const completion = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [{
      role: 'user',
      content: `Current time: ${new Date().toISOString()}
Parse "${naturalText}" into ISO datetime.
Return ONLY: { "datetime": "<ISO 8601 or null>" }`,
    }],
    response_format: { type: 'json_object' },
    max_tokens: 60,
    temperature: 0,
  })
  const parsed = JSON.parse(completion.choices[0].message.content)
  return parsed.datetime || null
}

module.exports = { getOpenAIResponse, parseRescheduleTimeOpenAI }

