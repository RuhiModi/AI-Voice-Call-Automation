// src/call-engine/promptTranslate.js
//
// AUTO LANGUAGE TRANSLATION FOR SCRIPT PROMPTS
//
// When a user speaks in Hindi or English but the script is written in Gujarati,
// this module translates the next prompt to the user's language using Sarvam AI.
//
// Design decisions:
// - Cache all translations in memory (same prompts repeat across calls)
// - Skip translation if languages match (most common case — zero overhead)
// - Skip translation if prompt is empty or very short
// - Never crash the call if translation fails — fallback to original text
// - Translate in parallel with other processing for minimum latency

const axios  = require('axios')
const config = require('../config')

const SARVAM_TRANSLATE_URL = 'https://api.sarvam.ai/translate'

// Language code mapping for Sarvam translate API
const LANG_CODE = {
  gu: 'gu-IN',
  hi: 'hi-IN',
  en: 'en-IN',
}

// In-memory translation cache: "gu→hi:text" => translated text
// Avoids re-translating the same prompt hundreds of times per campaign
const _cache    = new Map()
const MAX_CACHE = 500

/**
 * Translate a script prompt to the target language if different from source.
 *
 * @param {string} text        - The original prompt text (in script's base language)
 * @param {string} targetLang  - User's detected language: 'gu' | 'hi' | 'en'
 * @param {string} sourceLang  - Script's base language: 'gu' | 'hi' | 'en'
 * @returns {Promise<string>}  - Translated text, or original if same lang / error
 */
async function translatePromptIfNeeded(text, targetLang, sourceLang) {
  // ── Fast path: same language → no translation needed ─────────
  if (!text || targetLang === sourceLang) return text

  // ── Fast path: very short text (placeholders, single words) ──
  if (text.trim().length < 5) return text

  // ── Check cache ──────────────────────────────────────────────
  const cacheKey = `${sourceLang}→${targetLang}:${text}`
  if (_cache.has(cacheKey)) {
    console.log(`[Translate] Cache hit: "${text.substring(0,30)}"`)
    return _cache.get(cacheKey)
  }

  // ── Skip if no Sarvam API key ─────────────────────────────────
  if (!config.sarvamApiKey) {
    console.warn('[Translate] No SARVAM_API_KEY — returning original text')
    return text
  }

  try {
    console.log(`[Translate] ${sourceLang}→${targetLang}: "${text.substring(0,50)}"`)

    const response = await axios.post(
      SARVAM_TRANSLATE_URL,
      {
        input:                 text,
        source_language_code:  LANG_CODE[sourceLang] || 'gu-IN',
        target_language_code:  LANG_CODE[targetLang] || 'hi-IN',
        speaker_gender:        'Female',
        mode:                  'formal',
        model:                 'mayura:v1',
        enable_preprocessing:  true,
      },
      {
        headers: {
          'api-subscription-key': config.sarvamApiKey,
          'Content-Type':         'application/json',
        },
        timeout: 4000,  // 4s max — don't hold up the call
      }
    )

    const translated = response.data?.translated_text || text

    // Store in cache
    if (_cache.size >= MAX_CACHE) {
      // Evict oldest entry
      const firstKey = _cache.keys().next().value
      _cache.delete(firstKey)
    }
    _cache.set(cacheKey, translated)

    console.log(`[Translate] ✅ "${text.substring(0,30)}" → "${translated.substring(0,30)}"`)
    return translated

  } catch (err) {
    // Never crash the call — return original text if translation fails
    console.warn(`[Translate] ⚠️  Failed (${err.response?.status || err.code}): ${err.message} — using original`)
    return text
  }
}

/**
 * Pre-warm translation cache for all prompts in a script.
 * Call this when a campaign launches (optional optimization).
 * Translates all script prompts into both hi and en upfront.
 *
 * @param {Array<{prompt: string}>} states  - Script flow states
 * @param {string} sourceLang               - Script's base language
 */
async function prewarmTranslationCache(states, sourceLang = 'gu') {
  if (!config.sarvamApiKey || !states?.length) return

  const targetLangs = ['hi', 'en', 'gu'].filter(l => l !== sourceLang)
  const prompts     = states.map(s => s.prompt).filter(Boolean)

  console.log(`[Translate] Pre-warming ${prompts.length} prompts × ${targetLangs.length} languages`)

  // Translate in parallel, 3 at a time to avoid rate limiting
  for (let i = 0; i < prompts.length; i += 3) {
    const batch = prompts.slice(i, i + 3)
    await Promise.all(
      batch.flatMap(prompt =>
        targetLangs.map(lang => translatePromptIfNeeded(prompt, lang, sourceLang).catch(() => {}))
      )
    )
  }

  console.log(`[Translate] ✅ Cache pre-warmed`)
}

module.exports = { translatePromptIfNeeded, prewarmTranslationCache }
