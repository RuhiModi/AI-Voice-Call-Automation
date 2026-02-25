// src/call-engine/prompts.js
// Builds the AI system prompt for each call.
// Every call gets a custom prompt with contact info, language, campaign script, etc.

const LANG_NAMES = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }

const GREETINGS = {
  gu: (name, persona) => `નમસ્તે${name ? ' ' + name : ''}! હું ${persona} બોલું છું.`,
  hi: (name, persona) => `नमस्ते${name ? ' ' + name + ' जी' : ''}! मैं ${persona} बोल रही हूं।`,
  en: (name, persona) => `Hello${name ? ' ' + name : ''}! This is ${persona} calling.`,
}

/**
 * Build the LLM system prompt for a call session.
 * @param {Object} campaign
 * @param {Object} contact
 * @param {string} detectedLang
 */
function buildSystemPrompt(campaign, contact = null, detectedLang = null) {
  const lang        = detectedLang || campaign.language_priority || 'gu'
  const langName    = LANG_NAMES[lang] || 'Gujarati'
  const persona     = campaign.persona_name || 'Priya'
  const tone        = campaign.persona_tone || 'friendly'
  const contactVars = contact?.variables ? JSON.stringify(contact.variables) : '{}'
  const dataFields  = Array.isArray(campaign.data_fields) && campaign.data_fields.length
    ? campaign.data_fields.join(', ')
    : 'general feedback or confirmation'
  const handoffKeywords = Array.isArray(campaign.handoff_keywords)
    ? campaign.handoff_keywords.join(', ')
    : 'human, agent, manager'

  return `You are ${persona}, an AI voice assistant making an outbound phone call.

CAMPAIGN: "${campaign.name}"
CAMPAIGN TYPE: ${campaign.campaign_type || 'general'}
CONTACT INFO: ${contactVars}

LANGUAGE RULES (CRITICAL):
- Current language: ${langName} (code: ${lang})
- START the conversation in ${langName}
- If the user responds in Gujarati → switch to Gujarati
- If the user responds in Hindi → switch to Hindi
- If the user responds in English → switch to English
- ALWAYS match the user's language after first response
- NEVER mix languages in a single sentence

TONE: ${tone} — be respectful, clear, and natural on a phone call

CAMPAIGN CONTEXT / SCRIPT:
${campaign.script_content || 'Introduce yourself and have a helpful, brief conversation.'}

YOUR GOAL:
Collect the following information: ${dataFields}

STRICT BEHAVIOR RULES:
1. Keep ALL responses SHORT — maximum 2-3 sentences. This is a PHONE CALL.
2. If user says "stop", "don't call", "remove", "nahi chahiye" → action = "dnc"
3. If user says they are busy or asks to call later → ask for a time → action = "reschedule"
4. If user mentions "${handoffKeywords}" → action = "transfer"
5. If conversation goal is complete → action = "end"
6. Never mention you are an AI unless directly asked
7. TRAI compliance: identify the organization within the first 30 seconds

RESPONSE FORMAT — ALWAYS return valid JSON, nothing else:
{
  "text": "<what to say — in correct language — short>",
  "action": "continue" | "reschedule" | "transfer" | "end" | "dnc",
  "reschedule_time": "<natural language time — ONLY if action=reschedule>",
  "collected_data": { "<field_name>": "<value>" },
  "detected_language": "gu" | "hi" | "en"
}`
}

/**
 * Build the opening greeting for a call.
 */
function buildGreeting(campaign, contact, lang = 'gu') {
  const name    = contact?.variables?.name || ''
  const persona = campaign.persona_name || 'Priya'
  const greetFn = GREETINGS[lang] || GREETINGS.gu
  const base    = greetFn(name, persona)

  const full = {
    gu: `${base} ${campaign.name} campaign તરફથી call છે. શું હું 2 minute વાત કરી શકું?`,
    hi: `${base} ${campaign.name} campaign की तरफ से call है। क्या मैं 2 minute बात कर सकती हूं?`,
    en: `${base} I'm calling on behalf of ${campaign.name}. Do you have 2 minutes to talk?`,
  }
  return full[lang] || full.gu
}

module.exports = { buildSystemPrompt, buildGreeting, LANG_NAMES }

