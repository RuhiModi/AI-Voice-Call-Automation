// src/call-engine/parsePdfScript.js
//
// Parses a voice script (PDF, JSON text, or plain text) into:
// { flow: [ { id, prompt, options: [] }, ... ] }
//
// This output is stored in campaigns.flow_config and fed to ScriptFlowExecutor.
// ScriptFlowExecutor builds transitions dynamically — no hardcoded states.

const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY — accepts PDF buffer or plain text string
// ─────────────────────────────────────────────────────────────

async function parsePdfToFlowConfig(input) {
  // If input is a JSON string → try parsing directly
  if (typeof input === 'string') {
    return parseTextToFlow(input)
  }

  // Buffer → extract text from PDF first
  const text = await extractPdfText(input)
  return parseTextToFlow(text)
}

// ─────────────────────────────────────────────────────────────
// PARSE TEXT → flow config
// Handles 3 formats:
//   1. JSON { flow: [...] }           → use as-is
//   2. JSON array [ {id, prompt} ]    → wrap in { flow: }
//   3. Plain text / numbered list     → auto-structure into states
// ─────────────────────────────────────────────────────────────

function parseTextToFlow(text) {
  if (!text?.trim()) throw new Error('Empty script content')

  // ── Format 1 & 2: JSON ───────────────────────────────────
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)

      // { flow: [...] } — already correct format
      if (parsed.flow && Array.isArray(parsed.flow)) {
        const flow = parsed.flow.map(normalizeNode)
        console.log(`[ParseScript] ✅ JSON flow format — ${flow.length} states`)
        return { flow, source: 'json', parsed_at: new Date().toISOString() }
      }

      // Array of nodes
      if (Array.isArray(parsed)) {
        const flow = parsed.map(normalizeNode)
        console.log(`[ParseScript] ✅ JSON array format — ${flow.length} states`)
        return { flow, source: 'json_array', parsed_at: new Date().toISOString() }
      }

      // { id: prompt } map
      if (typeof parsed === 'object') {
        const flow = Object.entries(parsed).map(([id, prompt]) => normalizeNode({ id, prompt }))
        console.log(`[ParseScript] ✅ JSON map format — ${flow.length} states`)
        return { flow, source: 'json_map', parsed_at: new Date().toISOString() }
      }
    } catch (e) {
      console.warn(`[ParseScript] JSON parse failed — falling back to plain text: ${e.message}`)
    }
  }

  // ── Format 3: Plain text ─────────────────────────────────
  return parsePlainTextToFlow(text)
}

// ─────────────────────────────────────────────────────────────
// PLAIN TEXT PARSER
// Converts free-form script into states.
// Supports these patterns:
//   "Step 1: ..." or "1. ..."
//   "Q: ..." / "A: Yes / No"
//   Lines ending with "?" = question states with yes/no options
//   Lines without "?" = statement states (no options needed)
// ─────────────────────────────────────────────────────────────

function parsePlainTextToFlow(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 5)  // skip very short lines

  const flow = []
  let stateIndex = 0

  // Group lines into logical chunks
  // A new state starts at: numbered line, "Step", "Q:", empty line before content
  const chunks = []
  let current  = []

  for (const line of lines) {
    const isNewState = /^(\d+[\.\):]|step\s*\d+|q\s*\d*:|question\s*\d*:)/i.test(line)
    if (isNewState && current.length > 0) {
      chunks.push(current)
      current = []
    }
    current.push(line)
  }
  if (current.length > 0) chunks.push(current)

  // If no numbered structure detected, split on blank lines or sentences
  if (chunks.length <= 1) {
    // Split into sentences and group 2-3 per state
    const sentences = text
      .replace(/([।.!?])\s+/g, '$1\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 10)

    // Group into chunks of ~2 sentences
    for (let i = 0; i < sentences.length; i += 2) {
      chunks.push(sentences.slice(i, i + 2))
    }
  }

  for (const chunk of chunks) {
    const fullText = chunk.join(' ').replace(/^\d+[\.\):\s]+/, '').trim()
    if (!fullText) continue

    // Detect if this is a question (has ?, or mentions yes/no)
    const isQuestion = fullText.includes('?') ||
      /\byes\b|\bno\b|\bha\b|\bna\b|\bhaa\b|\bhan\b/i.test(fullText) ||
      /\bકે\b|\bકેમ\b|\bશું\b|\bshun\b/i.test(fullText)

    // Extract options if mentioned in text like "1. X  2. Y" or "Yes / No"
    const options = extractOptionsFromText(fullText)

    const stateId = generateStateId(fullText, stateIndex)

    flow.push({
      id:      stateId,
      prompt:  cleanPrompt(fullText),
      options: options.length > 0 ? options : (isQuestion ? [] : []),
    })

    stateIndex++
  }

  // Ensure last state has no options (terminal)
  if (flow.length > 0) {
    flow[flow.length - 1].options = []
  }

  console.log(`[ParseScript] ✅ Plain text → ${flow.length} states`)
  return { flow, source: 'plain_text', parsed_at: new Date().toISOString() }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function normalizeNode(node) {
  return {
    id:      (node.id || `state_${Math.random().toString(36).slice(2,6)}`).toString().trim().toLowerCase().replace(/\s+/g, '_'),
    prompt:  cleanPrompt(node.prompt || node.text || ''),
    options: Array.isArray(node.options) ? node.options.map(o => typeof o === 'string' ? o.trim() : String(o)) : [],
  }
}

function cleanPrompt(text) {
  return (text || '')
    .replace(/^\d+[\.\):\s]+/, '')   // remove leading numbers
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function generateStateId(text, index) {
  // Try to infer meaningful id from content
  const lower = text.toLowerCase()
  if (index === 0 || lower.includes('hello') || lower.includes('નમસ્તે') || lower.includes('namaste')) return 'intro'
  if (lower.includes('thank') || lower.includes('આભાર') || lower.includes('aabhar')) return index === 0 ? 'intro' : 'thanks'
  if (lower.includes('problem') || lower.includes('સમસ્યા') || lower.includes('issue')) return `problem_${index}`
  if (lower.includes('done') || lower.includes('complete') || lower.includes('પૂર્ણ')) return `completed_${index}`
  if (lower.includes('pending') || lower.includes('બાકી') || lower.includes('baki')) return `pending_${index}`
  if (lower.includes('record') || lower.includes('noted') || lower.includes('નોંધ')) return `recorded_${index}`
  return `step_${index}`
}

function extractOptionsFromText(text) {
  const options = []

  // Pattern: "Yes / No" or "Yes or No"
  const slashMatch = text.match(/([^\/,]+)\s*[\/,]\s*([^\/,\n]+)(?:\s*[\/,]\s*([^\/,\n]+))?/)
  if (slashMatch && text.includes('/')) {
    const parts = text.split('/').map(p => p.trim()).filter(p => p.length > 0 && p.length < 60)
    if (parts.length >= 2 && parts.length <= 4) {
      return parts
    }
  }

  // Pattern: numbered options "1. X  2. Y"
  const numbered = text.match(/\d+[.)]\s*([^\d\n]{3,50})/g)
  if (numbered?.length >= 2) {
    return numbered.map(m => m.replace(/^\d+[.)]\s*/, '').trim())
  }

  return options
}

// ─────────────────────────────────────────────────────────────
// PDF TEXT EXTRACTION
// ─────────────────────────────────────────────────────────────

async function extractPdfText(pdfBuffer) {
  const tmpPdf = path.join(os.tmpdir(), `flow_${Date.now()}.pdf`)
  fs.writeFileSync(tmpPdf, pdfBuffer)

  try {
    const pyScript = `
import sys, json, re

def clean(text):
    if not text: return ''
    text = text.replace('\\u200b','').replace('\\u00a0',' ')
    text = re.sub(r'\\s+', ' ', text)
    return text.strip()

result = {'text': '', 'tables': []}

try:
    import pdfplumber
    with pdfplumber.open(sys.argv[1]) as pdf:
        full_text = []
        for page in pdf.pages:
            # Extract tables first (structured data)
            for table in (page.extract_tables() or []):
                for row in table:
                    cleaned = [clean(c) for c in row if c]
                    if len(cleaned) >= 2:
                        result['tables'].append(cleaned)
            # Then plain text
            t = page.extract_text()
            if t: full_text.append(clean(t))
        result['text'] = ' '.join(full_text)
except ImportError:
    # Fallback: pypdf2
    try:
        import PyPDF2
        with open(sys.argv[1], 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            pages = [reader.pages[i].extract_text() for i in range(len(reader.pages))]
            result['text'] = ' '.join(clean(p) for p in pages if p)
    except:
        result['error'] = 'No PDF library available'

print(json.dumps(result, ensure_ascii=False))
`
    const pyFile = path.join(os.tmpdir(), `ep_${Date.now()}.py`)
    fs.writeFileSync(pyFile, pyScript)
    const output = execSync(`python3 "${pyFile}" "${tmpPdf}"`, { maxBuffer: 5 * 1024 * 1024 }).toString()
    fs.unlinkSync(tmpPdf)
    fs.unlinkSync(pyFile)

    const result = JSON.parse(output)

    // If we got structured table data with id/prompt columns → build JSON directly
    if (result.tables?.length > 0) {
      const jsonFlow = tryBuildFromTable(result.tables)
      if (jsonFlow) return JSON.stringify(jsonFlow)
    }

    return result.text || ''
  } catch (err) {
    fs.existsSync(tmpPdf) && fs.unlinkSync(tmpPdf)
    throw new Error(`PDF parse failed: ${err.message}`)
  }
}

// Try to detect id/prompt table structure from PDF tables
function tryBuildFromTable(tables) {
  const flow = []
  for (const row of tables) {
    const id     = (row[0] || '').trim().toLowerCase()
    const prompt = (row[1] || '').trim()
    if (!id || id === 'id' || !prompt || prompt === 'prompt') continue
    const options = row.slice(2).filter(Boolean).map(o => o.trim())
    flow.push({ id, prompt, options })
  }
  if (flow.length > 0) return { flow }
  return null
}

module.exports = { parsePdfToFlowConfig, parseTextToFlow }
