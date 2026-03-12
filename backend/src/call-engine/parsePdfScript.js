// src/call-engine/parsePdfScript.js
//
// PDF → Full Conversation Script Generator
//
// Pipeline:
//   1. Extract text from PDF (pdf-parse)
//   2. Send to LLM ONCE with a script-generation prompt
//   3. LLM outputs { flow: [{id, prompt, options}] }
//   4. Stored in campaigns.flow_config
//   5. During calls → ScriptFlowExecutor runs it — ZERO LLM per call

'use strict'

const fs      = require('fs')
const path    = require('path')
const os      = require('os')
const pdfParse = require('pdf-parse')
const { getAIResponse } = require('./llm/index')

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY
// Accepts: PDF Buffer | plain text string | JSON string
// Returns: { flow: [{id, prompt, options}], source, parsed_at }
// ─────────────────────────────────────────────────────────────

async function parsePdfToFlowConfig(input, options = {}) {
  const { language = 'gu', campaignType = 'survey', personaName = 'Priya' } = options

  let rawText = ''

  if (Buffer.isBuffer(input)) {
    // PDF buffer → extract text
    rawText = await extractPdfText(input)
    console.log(`[ParseScript] 📄 PDF text extracted: ${rawText.length} chars`)
  } else if (typeof input === 'string') {
    rawText = input.trim()
  } else {
    throw new Error('Input must be a Buffer (PDF) or string (text/JSON)')
  }

  if (!rawText) throw new Error('No content found in input')

  // If already valid flow JSON → use directly, skip LLM
  const direct = tryParseFlowJson(rawText)
  if (direct) {
    console.log(`[ParseScript] ✅ Direct JSON flow — ${direct.flow.length} states, skipping LLM`)
    return { ...direct, source: 'json', parsed_at: new Date().toISOString() }
  }

  // Plain text / PDF content → send to LLM to generate full conversation script
  console.log(`[ParseScript] 🤖 Sending to LLM for script generation...`)
  const flow = await generateFlowWithLLM(rawText, language, campaignType, personaName)

  console.log(`[ParseScript] ✅ LLM generated ${flow.length} states`)
  return {
    flow,
    source:    'llm_generated',
    parsed_at: new Date().toISOString(),
  }
}

// ─────────────────────────────────────────────────────────────
// LLM SCRIPT GENERATOR
// Sends document text to LLM once — gets back full flow JSON
// ─────────────────────────────────────────────────────────────

async function generateFlowWithLLM(documentText, language, campaignType, personaName) {
  const langName = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }[language] || 'Gujarati'

  const systemPrompt = `You are an expert voice call script writer for Indian outbound calling campaigns.
Your job is to convert a document into a structured voice call conversation script.

RULES:
1. Write ALL prompts in ${langName} — this is a voice call, words must sound natural when spoken aloud
2. Keep each prompt SHORT — max 2-3 sentences (this is a phone call, not a chat)
3. Create a logical conversation flow — greeting → main questions → closing
4. Each state must have 0-4 options (what the user might say in response)
5. Options should be short phrases the user would actually speak
6. Last state must have empty options [] (it ends the call)
7. Use simple, conversational ${langName} — avoid formal/written language
8. The AI agent's name is ${personaName}

CAMPAIGN TYPE: ${campaignType}
${campaignType === 'survey' ? '→ Goal: Ask questions, collect answers, record data' : ''}
${campaignType === 'announcement' ? '→ Goal: Inform the person, confirm they understood' : ''}
${campaignType === 'reminder' ? '→ Goal: Remind about appointment/payment, confirm acknowledgment' : ''}

OUTPUT FORMAT — respond with ONLY valid JSON, no explanation, no markdown:
{
  "flow": [
    {
      "id": "intro",
      "prompt": "<greeting in ${langName} — introduce agent, state purpose>",
      "options": ["<yes response>", "<no/busy response>"]
    },
    {
      "id": "main_question_1",
      "prompt": "<first question in ${langName}>",
      "options": ["<option 1>", "<option 2>", "<option 3>"]
    },
    {
      "id": "closing",
      "prompt": "<thank you and goodbye in ${langName}>",
      "options": []
    }
  ]
}

Generate 4-8 states depending on document complexity. Make it a natural flowing conversation.`

  const userMessage = `Convert this document into a voice call script:\n\n${documentText.slice(0, 4000)}`

  try {
    const result = await getAIResponse(systemPrompt, [], userMessage)
    const text   = result.text || ''

    // Extract JSON from response (LLM might wrap in markdown)
    const jsonMatch = text.match(/\{[\s\S]*"flow"[\s\S]*\}/)
    if (!jsonMatch) throw new Error('LLM did not return valid JSON flow')

    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.flow || !Array.isArray(parsed.flow)) throw new Error('Invalid flow structure')

    // Normalize and validate each state
    return parsed.flow.map(normalizeNode).filter(n => n.prompt)

  } catch (err) {
    console.error(`[ParseScript] LLM generation failed: ${err.message}`)
    // Fall back to basic text parsing if LLM fails
    console.log(`[ParseScript] ⚠️ Falling back to plain text parser`)
    return parsePlainTextToFlow(documentText).flow
  }
}

// ─────────────────────────────────────────────────────────────
// PDF TEXT EXTRACTION — uses pdf-parse (already in package.json)
// ─────────────────────────────────────────────────────────────

async function extractPdfText(pdfBuffer) {
  try {
    const data = await pdfParse(pdfBuffer)
    const text = (data.text || '')
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!text) throw new Error('PDF appears empty or image-only (no extractable text)')
    return text

  } catch (err) {
    throw new Error(`PDF extraction failed: ${err.message}`)
  }
}

// ─────────────────────────────────────────────────────────────
// TRY PARSE DIRECT JSON — skip LLM if already structured
// ─────────────────────────────────────────────────────────────

function tryParseFlowJson(text) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null

  try {
    const parsed = JSON.parse(trimmed)

    if (parsed.flow && Array.isArray(parsed.flow)) {
      return { flow: parsed.flow.map(normalizeNode) }
    }
    if (Array.isArray(parsed)) {
      return { flow: parsed.map(normalizeNode) }
    }
  } catch {}

  return null
}

// ─────────────────────────────────────────────────────────────
// FALLBACK — plain text → states (no LLM)
// Used only if LLM call fails
// ─────────────────────────────────────────────────────────────

function parsePlainTextToFlow(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5)
  const flow  = []
  let index   = 0

  const chunks = []
  let current  = []

  for (const line of lines) {
    const isNew = /^(\d+[\.\):]|step\s*\d+|q\s*\d*:|question\s*\d*:)/i.test(line)
    if (isNew && current.length > 0) { chunks.push(current); current = [] }
    current.push(line)
  }
  if (current.length > 0) chunks.push(current)

  // No structure — split by sentence
  if (chunks.length <= 1) {
    const sentences = text.replace(/([।.!?])\s+/g, '$1\n').split('\n')
      .map(s => s.trim()).filter(s => s.length > 10)
    for (let i = 0; i < sentences.length; i += 2) chunks.push(sentences.slice(i, i + 2))
  }

  for (const chunk of chunks) {
    const prompt = chunk.join(' ').replace(/^\d+[\.\):\s]+/, '').trim()
    if (!prompt) continue
    const isQuestion = prompt.includes('?')
    flow.push({
      id:      index === 0 ? 'intro' : `step_${index}`,
      prompt,
      options: isQuestion ? [] : [],
    })
    index++
  }

  if (flow.length > 0) flow[flow.length - 1].options = []
  return { flow }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function normalizeNode(node) {
  return {
    id:      (node.id || `state_${Math.random().toString(36).slice(2, 6)}`)
               .toString().trim().toLowerCase().replace(/\s+/g, '_'),
    prompt:  (node.prompt || node.text || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
    options: Array.isArray(node.options)
      ? node.options.map(o => (typeof o === 'string' ? o : String(o)).trim()).filter(Boolean)
      : [],
  }
}

// parseTextToFlow exported for backward compat
function parseTextToFlow(text) {
  const direct = tryParseFlowJson(text)
  if (direct) return { ...direct, source: 'json', parsed_at: new Date().toISOString() }
  const result = parsePlainTextToFlow(text)
  return { ...result, source: 'plain_text', parsed_at: new Date().toISOString() }
}

module.exports = { parsePdfToFlowConfig, parseTextToFlow }
