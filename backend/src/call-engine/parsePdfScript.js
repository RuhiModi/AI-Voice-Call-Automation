// src/call-engine/parsePdfScript.js
//
// Parses voice call script PDF → { flow: [{id, prompt, options}] }
// NO LLM — pure deterministic parsing.
//
// PDF format expected:
//   Table with columns: ID | Prompt | (Old Options) | New Options
//   Options column may contain routing instructions like "If X → Y"
//   We extract only the clean spoken phrases, strip routing notes.

'use strict'

const fs       = require('fs')
const path     = require('path')
const os       = require('os')
const pdfParse = require('pdf-parse')

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY
// ─────────────────────────────────────────────────────────────

async function parsePdfToFlowConfig(input, options = {}) {
  // ── String input: JSON or plain text ─────────────────────
  if (typeof input === 'string') {
    return parseTextToFlow(input)
  }

  if (!Buffer.isBuffer(input)) {
    throw new Error('Input must be a Buffer (PDF/DOCX) or string')
  }

  // ── Detect file type by magic bytes ───────────────────────
  // DOCX magic: 50 4B 03 04 (ZIP/Office Open XML)
  // PDF magic:  25 50 44 46 (%PDF)
  const magic = input.slice(0, 4)
  const isPDF  = magic[0] === 0x25 && magic[1] === 0x50  // %P
  const isDOCX = magic[0] === 0x50 && magic[1] === 0x4B  // PK

  if (isDOCX) {
    console.log(`[ParseScript] 📝 DOCX detected`)
    const text = await extractDocxText(input)
    return parseTextToFlow(text)
  }

  // ── PDF: try pdfplumber table extraction first ──────────────
  const rows = await extractTableRows(input)
  if (rows && rows.length > 0) {
    const flow = buildFlowFromTable(rows)
    if (flow.length > 0) {
      console.log(`[ParseScript] ✅ PDF table parsed via pdfplumber — ${flow.length} states`)
      return { flow, source: 'pdf_table', parsed_at: new Date().toISOString() }
    }
  }

  // ── Fallback: use pdf-parse + extract table from plain text ──
  // pdfplumber may not be available on all servers
  console.log(`[ParseScript] ⚠️ pdfplumber unavailable — trying pdf-parse table extraction`)
  const data   = await pdfParse(input)
  const rawText = (data.text || '').trim()
  if (!rawText) throw new Error('PDF appears empty or image-only')

  // Try to parse table structure from plain text
  const textFlow = parseTableFromPlainText(rawText)
  if (textFlow && textFlow.length > 0) {
    console.log(`[ParseScript] ✅ Table parsed from plain text — ${textFlow.length} states`)
    return { flow: textFlow, source: 'pdf_text_table', parsed_at: new Date().toISOString() }
  }

  // Last resort: generic plain text parsing
  console.log(`[ParseScript] ⚠️ No table structure found — generic text parse`)
  return parseTextToFlow(rawText)
}

// ─────────────────────────────────────────────────────────────
// DOCX TEXT EXTRACTION
// Uses mammoth (already available in Node ecosystem)
// Falls back to unzip + XML parse if mammoth not installed
// ─────────────────────────────────────────────────────────────

async function extractDocxText(buffer) {
  // Extract table rows from DOCX word/document.xml
  // Returns flow directly (not raw text) since we can parse table structure
  try {
    const AdmZip   = require('adm-zip')
    const zip      = new AdmZip(buffer)
    const xmlEntry = zip.getEntry('word/document.xml')
    if (!xmlEntry) throw new Error('No document.xml in DOCX')

    const xml = xmlEntry.getData().toString('utf8')

    // Extract table rows — each <w:tr> is a row, each <w:tc> is a cell
    const rows = []
    const trMatches = xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []

    for (const tr of trMatches) {
      const cells = []
      const tcMatches = tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || []
      for (const tc of tcMatches) {
        // Extract all text runs in this cell
        const texts = (tc.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
          .map(m => m.replace(/<[^>]+>/g, '').trim())
          .filter(Boolean)
        cells.push(texts.join(' ').trim())
      }
      if (cells.some(c => c)) rows.push(cells)
    }

    if (rows.length > 0) {
      console.log(`[ParseScript] 📝 DOCX table: ${rows.length} rows`)
      const flow = buildFlowFromTable(rows)
      if (flow.length > 0) return JSON.stringify({ flow })
    }

    // Fallback: extract plain text
    const text = (xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
      .map(m => m.replace(/<[^>]+>/g, ''))
      .join(' ')
    return text

  } catch (err) {
    // Try mammoth as last resort
    try {
      const mammoth = require('mammoth')
      const result  = await mammoth.extractRawText({ buffer })
      return result.value || ''
    } catch {
      throw new Error(`Could not read DOCX: ${err.message}`)
    }
  }
}

// ─────────────────────────────────────────────────────────────
// EXTRACT TABLE ROWS FROM PDF via pdfplumber (Python)
// ─────────────────────────────────────────────────────────────

async function extractTableRows(pdfBuffer) {
  const { execSync } = require('child_process')
  const tmpPdf = path.join(os.tmpdir(), `flow_${Date.now()}.pdf`)
  fs.writeFileSync(tmpPdf, pdfBuffer)

  const pyScript = `
import sys, json, re

def clean(text):
    if not text: return ''
    text = text.replace('\\u200b','').replace('\\u00a0',' ')
    text = re.sub(r'[ \\t]+', ' ', text)
    return text.strip()

rows = []
try:
    import pdfplumber
    with pdfplumber.open(sys.argv[1]) as pdf:
        for page in pdf.pages:
            for table in (page.extract_tables() or []):
                for row in table:
                    cleaned = [clean(c or '') for c in row]
                    if any(cleaned):
                        rows.append(cleaned)
except Exception as e:
    rows = []

print(json.dumps(rows, ensure_ascii=False))
`

  const pyFile = path.join(os.tmpdir(), `ep_${Date.now()}.py`)
  fs.writeFileSync(pyFile, pyScript)

  try {
    const output = execSync(`python3 "${pyFile}" "${tmpPdf}"`, {
      maxBuffer: 5 * 1024 * 1024,
      timeout:   30000,
    }).toString()
    return JSON.parse(output)
  } catch (err) {
    console.warn(`[ParseScript] pdfplumber failed: ${err.message}`)
    return null
  } finally {
    try { fs.unlinkSync(tmpPdf) } catch {}
    try { fs.unlinkSync(pyFile) } catch {}
  }
}

// ─────────────────────────────────────────────────────────────
// PARSE TABLE FROM PLAIN TEXT
// When pdfplumber is unavailable, pdf-parse gives us raw text.
// This function detects the ID|Prompt|Options table pattern in text.
//
// The PDF plain text looks like:
// "ID Prompt Old Options New Options intro નમસ્તે... હા ના task_check..."
// We split on known state IDs and reconstruct rows.
// ─────────────────────────────────────────────────────────────

function parseTableFromPlainText(rawText) {
  if (!rawText) return null

  // Clean up the text
  const text = rawText
    .replace(/IDPromptOld OptionsNew Options/g, '')  // strip header
    .replace(/IDPromptOptions/g, '')
    .replace(/
/g, '
')
    .trim()

  // Strategy: find state IDs by looking for lines that are short
  // and look like valid state IDs (lowercase, underscores, no spaces)
  // e.g. "intro", "task_check", "task_done", "step_1"
  const STATE_ID_PATTERN = /^([a-z][a-z0-9_]{1,30})$/

  const lines = text.split('
').map(l => l.trim()).filter(Boolean)
  const flow  = []

  let currentId      = null
  let currentPrompt  = []
  let currentOptions = []
  let collectingOpts = false

  const flush = () => {
    if (!currentId) return
    const prompt  = currentPrompt.join(' ').trim()
    const options = currentOptions
      .join(';')
      .split(/[;
]/)
      .map(o => o.trim())
      .filter(o => o.length >= 2 && o.length <= 80)
      .filter(o => !/^if\s+/i.test(o) && !/→/.test(o))
    if (prompt) {
      flow.push({ id: currentId, prompt, options: [...new Set(options)] })
    }
    currentId      = null
    currentPrompt  = []
    currentOptions = []
    collectingOpts = false
  }

  for (const line of lines) {
    // Skip pure header lines
    if (/^(ID|Prompt|Old Options|New Options|Options)$/i.test(line)) continue

    // Detect state ID line
    if (STATE_ID_PATTERN.test(line)) {
      flush()
      currentId      = line
      collectingOpts = false
      continue
    }

    if (!currentId) continue

    // Detect option-like lines (short, no sentence structure)
    const isOption = line.length <= 60 &&
      !line.includes('કૃ') &&     // Gujarati question words that indicate prompts
      !line.includes('આ ') &&
      !line.includes('જ ') &&
      (currentPrompt.length > 0)  // only collect options after we have a prompt

    // Lines that start a new "section" in options
    if (/^(old options|new options|options)/i.test(line)) {
      collectingOpts = true
      continue
    }

    if (collectingOpts || (isOption && currentPrompt.length > 0)) {
      if (!/^if\s+/i.test(line) && !/→/.test(line)) {
        currentOptions.push(line)
      }
    } else {
      currentPrompt.push(line)
    }
  }
  flush()

  // Filter out states with garbled/empty prompts
  return flow.filter(s => s.prompt && s.prompt.length > 10)
}

// ─────────────────────────────────────────────────────────────
// BUILD FLOW FROM TABLE ROWS
// Handles column formats:
//   [ID, Prompt, Options]
//   [ID, Prompt, OldOptions, NewOptions]  ← use NewOptions (last col)
// ─────────────────────────────────────────────────────────────

function buildFlowFromTable(rows) {
  const flow = []

  for (const row of rows) {
    // Skip header row
    const first = (row[0] || '').trim().toLowerCase()
    if (!first || first === 'id' || first === 'sr' || first === 'no') continue

    const id     = first.replace(/\s+/g, '_')
    const prompt = cleanPrompt(row[1] || '')
    if (!prompt) continue

    let options = []

    if (row.length >= 4) {
      // 4-col PDF: try New Options (last col) first, fall back to Old Options (col 2)
      const newOpts = extractCleanOptions(row[row.length - 1] || '')
      const oldOpts = extractCleanOptions(row[2] || '')
      options = newOpts.length > 0 ? newOpts : oldOpts
    } else {
      options = extractCleanOptions(row[2] || '')
    }

    flow.push({ id, prompt, options })
  }

  return flow
}

// ─────────────────────────────────────────────────────────────
// EXTRACT CLEAN OPTIONS from raw options cell text
//
// The options column often contains:
//   - Actual spoken options:  "હા, હું જ બોલું છું"
//   - Routing notes:          "If X → Y"
//   - Bullet instructions:    "• દસ્તાવેજ અધૂરા"
//   - Section headers:        "Urgency Level:"
//
// We keep ONLY lines that are short spoken phrases (< 60 chars)
// and don't start with routing keywords.
// ─────────────────────────────────────────────────────────────

function extractCleanOptions(rawText) {
  if (!rawText || !rawText.trim()) return []

  // ── Format 1: Semicolon-separated (e.g. "હા, લઈ શકો; ના, સમય નથી") ──
  if (rawText.includes(';')) {
    return rawText
      .split(';')
      .map(o => o
        .replace(/^[""]|[""]$/g, '')
        .replace(/\s*,\s*/g, ', ')   // fix "હા , " → "હા, "
        .replace(/\s+/g, ' ')
        .trim()
      )
      .filter(o => o.length >= 2 && o.length <= 80)
  }

  // ── Format 2: Comma-separated short options (e.g. "Yes, No, Maybe") ──
  // Only use comma split if options are very short (avg < 20 chars)
  if (rawText.includes(',') && !rawText.includes('\n')) {
    const parts = rawText.split(',').map(o => o.trim()).filter(o => o.length >= 2 && o.length <= 40)
    const avgLen = parts.reduce((s, p) => s + p.length, 0) / (parts.length || 1)
    if (parts.length >= 2 && avgLen < 20) return parts
  }

  // ── Format 3: Newline-separated — stop at first routing instruction ──
  const lines   = rawText.split('\n')
  const options = []

  for (const line of lines) {
    let l = line.replace(/^[•\-\*]\s*/, '').trim()
    if (!l) continue

    // STOP at routing instructions — everything after is sub-flow notes
    if (/^if\s+/i.test(l))              break  // If "X" →
    if (/→|=>/.test(l))                  break  // lines with arrows
    if (/^options\s*:/i.test(l))        break  // "Options:" header
    if (/^urgency/i.test(l))             break  // "Urgency Level:"
    if (/capture/i.test(l))              break  // "Rating Capture"
    if (/closing\s+script/i.test(l))    break  // "Closing Script"
    if (/^fallback\s+scenario/i.test(l)) break // "Fallback Scenarios:"
    if (/^additional\s+real/i.test(l))  break  // "Additional Real-Life..."
    if (/⭐/.test(l))                     break

    // Clean surrounding quotes
    l = l.replace(/^[""]|[""]$/g, '').trim()

    // Keep clean spoken phrases (2-80 chars)
    if (l.length >= 2 && l.length <= 80) {
      options.push(l)
    }
  }

  return [...new Set(options)]
}

// ─────────────────────────────────────────────────────────────
// CLEAN PROMPT TEXT
// ─────────────────────────────────────────────────────────────

function cleanPrompt(text) {
  return (text || '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\d+[\.\):\s]+/, '')
    .trim()
}

// ─────────────────────────────────────────────────────────────
// PARSE PLAIN TEXT / JSON STRING → flow
// Used when no PDF table found, or for typed/pasted scripts
// ─────────────────────────────────────────────────────────────

function parseTextToFlow(text) {
  if (!text?.trim()) throw new Error('Empty content')

  const trimmed = text.trim()

  // JSON format → use directly
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.flow && Array.isArray(parsed.flow)) {
        return { flow: parsed.flow.map(normalizeNode), source: 'json', parsed_at: new Date().toISOString() }
      }
      if (Array.isArray(parsed)) {
        return { flow: parsed.map(normalizeNode), source: 'json', parsed_at: new Date().toISOString() }
      }
    } catch {}
  }

  // Plain text — split into states by lines/sentences
  const lines  = text.split('\n').map(l => l.trim()).filter(l => l.length > 5)
  const flow   = []
  let index    = 0
  let current  = []
  const chunks = []

  for (const line of lines) {
    const isNew = /^(\d+[\.\):]|step\s*\d+|q\s*\d*:|question\s*\d*:)/i.test(line)
    if (isNew && current.length > 0) { chunks.push(current); current = [] }
    current.push(line)
  }
  if (current.length > 0) chunks.push(current)

  if (chunks.length <= 1) {
    const sentences = text.replace(/([।.!?])\s+/g, '$1\n').split('\n')
      .map(s => s.trim()).filter(s => s.length > 10)
    for (let i = 0; i < sentences.length; i += 2) chunks.push(sentences.slice(i, i + 2))
  }

  for (const chunk of chunks) {
    const prompt = chunk.join(' ').replace(/^\d+[\.\):\s]+/, '').trim()
    if (!prompt) continue
    flow.push({ id: index === 0 ? 'intro' : `step_${index}`, prompt, options: [] })
    index++
  }

  if (flow.length > 0) flow[flow.length - 1].options = []

  console.log(`[ParseScript] ✅ Plain text → ${flow.length} states`)
  return { flow, source: 'plain_text', parsed_at: new Date().toISOString() }
}

// ─────────────────────────────────────────────────────────────
// NORMALIZE NODE
// ─────────────────────────────────────────────────────────────

function normalizeNode(node) {
  return {
    id:      (node.id || `state_${Math.random().toString(36).slice(2, 6)}`)
               .toString().trim().toLowerCase().replace(/\s+/g, '_'),
    prompt:  cleanPrompt(node.prompt || node.text || ''),
    options: Array.isArray(node.options)
      ? node.options.map(o => String(o).trim()).filter(Boolean)
      : [],
  }
}

module.exports = { parsePdfToFlowConfig, parseTextToFlow }
