// src/call-engine/llm/index.js
// 🔥 LLM ROUTER — This is the only file session.js imports.
// It reads LLM_PROVIDER from .env and routes to the right provider.
//
// To switch from Groq → OpenAI: change LLM_PROVIDER=openai in .env
// No code change needed anywhere else.
const config = require('../../config')
const { getGroqResponse,   parseRescheduleTimeGroq }   = require('./groq')
const { getOpenAIResponse, parseRescheduleTimeOpenAI } = require('./openai')
const { getFallbackResponse } = require('./fallback')

/**
 * Get AI response for a user utterance.
 * Automatically uses the configured provider (groq or openai).
 * Falls back to the other provider if primary fails.
 *
 * @param {string} systemPrompt
 * @param {Array}  history [{role, content}]
 * @param {string} userText
 * @returns {Object} { text, action, reschedule_time, collected_data, detected_language, provider }
 */
async function getAIResponse(systemPrompt, history, userText) {
  try {
    if (config.llmProvider === 'openai') {
      return await getOpenAIResponse(systemPrompt, history, userText)
    } else {
      // Default: Groq (free credits first)
      return await getGroqResponse(systemPrompt, history, userText)
    }
  } catch (primaryErr) {
    console.error(`[LLM] ${config.llmProvider} error: ${primaryErr.message}`)

    // Auto-fallback to the other provider
    try {
      return await getFallbackResponse(systemPrompt, history, userText)
    } catch (fallbackErr) {
      console.error(`[LLM] Fallback also failed: ${fallbackErr.message}`)
      // Last resort: return a safe static response so the call doesn't crash
      return {
        text:              'Sorry, there was a technical issue. Please hold on.',
        action:            'continue',
        collected_data:    {},
        detected_language: 'gu',
        provider:          'static_fallback',
      }
    }
  }
}

/**
 * Parse natural language reschedule time → ISO datetime string.
 * Uses the configured LLM provider.
 */
async function parseRescheduleTime(naturalText) {
  if (!naturalText) return null
  try {
    if (config.llmProvider === 'openai') {
      return await parseRescheduleTimeOpenAI(naturalText)
    }
    return await parseRescheduleTimeGroq(naturalText)
  } catch {
    // Try other provider
    try {
      if (config.llmProvider === 'groq') {
        return await parseRescheduleTimeOpenAI(naturalText)
      }
      return await parseRescheduleTimeGroq(naturalText)
    } catch {
      return null
    }
  }
}

module.exports = { getAIResponse, parseRescheduleTime }

