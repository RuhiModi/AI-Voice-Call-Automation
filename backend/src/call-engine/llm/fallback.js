// src/call-engine/llm/fallback.js
// If primary LLM fails (rate limit, downtime, credits exhausted),
// this automatically retries with the OTHER provider.
// Call never drops because one provider is having issues.
const { getGroqResponse }   = require('./groq')
const { getOpenAIResponse } = require('./openai')
const config = require('../../config')

async function getFallbackResponse(systemPrompt, history, userText) {
  // If primary is Groq → fallback is OpenAI, and vice versa
  const fallbackProvider = config.llmProvider === 'groq' ? 'openai' : 'groq'
  console.log(`[LLM] Primary (${config.llmProvider}) failed — trying fallback (${fallbackProvider})`)

  if (fallbackProvider === 'openai') {
    return getOpenAIResponse(systemPrompt, history, userText)
  } else {
    return getGroqResponse(systemPrompt, history, userText)
  }
}

module.exports = { getFallbackResponse }

