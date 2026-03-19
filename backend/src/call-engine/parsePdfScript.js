// src/call-engine/parsePdfScript.js
//
// Parses ANY script format into a CONDITIONAL BRANCHING flow.
//
// Key feature: "Option → next_state" routing is parsed directly.
// Each option can lead to a different state — full if/else branching.
//
// Supported script formats:
//
// FORMAT 1 — Conditional with arrows (your format):
//   Script:
//   Agent says something...
//
//   Options:
//   હા → task_check
//   ના → reschedule
//   ખોટો નંબર → end
//
// FORMAT 2 — Agent/User markers:
//   Agent: What do you want?
//   User: Yes / No
//
// FORMAT 3 — DOCX/PDF table (ID | Prompt | Options)
//
// FORMAT 4 — JSON { flow: [...] }
//
// Output: { flow: [{ id, prompt, options: [{text, next_state}] }] }

'use strict'

const pdfParse = require('pdf-parse')
const zlib     = require('zlib')
const fs       = require('fs')
const path     = require('path')
const os       = require('os')

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY
// ─────────────────────────────────────────────────────────────

async function parsePdfToFlowConfig(input, options = {}) {
  let text = ''

  if (typeof input === 'string') {
    text = input.trim()
  } else if (Buffer.isBuffer(input)) {
    const magic  = input.slice(0, 4)
    const isDOCX = magic[0] === 0x50 && magic[1] === 0x4B
    text = isDOCX ? await extractDocxText(input) : await extractPdfText(input)
  } else {
    throw new Error('Input must be Buffer or string')
  }

  if (!text?.trim()) throw new Error('No content found in file')

  const result = parseAnyFormat(text)
  console.log(`[ParseScript] ✅ ${result.source} → ${result.flow.length} states`)
  return { ...result, parsed_at: new Date().toISOString() }
}

// ─────────────────────────────────────────────────────────────
// DETECT AND PARSE ANY FORMAT
// ─────────────────────────────────────────────────────────────

function parseAnyFormat(text) {
  const trimmed = text.trim()

  // 1. JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.flow && Array.isArray(parsed.flow)) {
        return { flow: parsed.flow.map(normalizeNode), source: 'json' }
      }
      if (Array.isArray(parsed)) {
        return { flow: parsed.map(normalizeNode), source: 'json' }
      }
    } catch {}
  }

  // 2. Conditional/arrow format ("Option → state" or "Option → description")
  if (hasArrowRouting(text)) {
    return parseConditionalFormat(text)
  }

  // 3. Agent/User markers
  if (hasAgentUserMarkers(text)) {
    return parseAgentUserFormat(text)
  }

  // 4. Table format
  if (hasTableStructure(text)) {
    return parseTableFormat(text)
  }

  // 5. Plain paragraphs
  return parsePlainFormat(text)
}

// ─────────────────────────────────────────────────────────────
// FORMAT 1: CONDITIONAL FORMAT WITH ARROWS
//
// Detects sections like:
//   1. Intro / 2. Task Check / Script: / If user says...
//   Options: / User Responses:
//   હા → Proceed / task_check
//   ના → Reschedule
//
// Builds a full branching state graph.
// ─────────────────────────────────────────────────────────────

function hasArrowRouting(text) {
  return /→|->/.test(text)
}

function parseConditionalFormat(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const nodes = []   // { id, prompt, rawOptions: [{text, target}] }

  let current     = null
  let inOptions   = false
  let promptLines = []

  // Helper to flush current node
  const flush = () => {
    if (!current || !promptLines.length) return
    nodes.push({
      id:         current,
      prompt:     promptLines.join(' ').trim(),
      rawOptions: [],
    })
    promptLines = []
    inOptions   = false
  }

  // First pass: identify section headers and prompts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Section header patterns:
    // "1. Intro", "2. Task Check", "## Section", numbered/emoji headers
    const sectionMatch = line.match(/^(?:\d+\.?\s*|#+\s*|[📌✅⚠️🔁❓🧩📂🤝📝🔚]\s*)?([A-Za-zઁ-ૹ\s]+(?:Flow|Check|Script|Intro|Closing|Reschedule|Status|Recorded|Permission|Issue))/i)
    const isHeader = sectionMatch && line.length < 60 && !line.includes('→') && !line.includes('->')

    if (isHeader) {
      flush()
      current   = slugify(line)
      inOptions = false
      continue
    }

    // "Script:" label — next lines are the prompt
    if (/^script\s*:/i.test(line)) {
      if (!current) current = `step_${nodes.length}`
      inOptions = false
      continue
    }

    // Options section marker
    if (/^(options?|user\s*responses?|if\s+user\s+says?)\s*:/i.test(line)) {
      inOptions = true
      continue
    }

    // Arrow option line: "హా → task_check" or "NA → Reschedule"
    if ((line.includes('→') || line.includes('->')) && inOptions) {
      const arrowMatch = line.match(/^(.+?)\s*(?:→|->)\s*(.+)$/)
      if (arrowMatch && current) {
        const lastNode = nodes[nodes.length - 1]
        if (lastNode && lastNode.id === current) {
          lastNode.rawOptions.push({
            text:   arrowMatch[1].trim().replace(/^[-•*]\s*/, ''),
            target: arrowMatch[2].trim(),
          })
        }
      }
      continue
    }

    // Bullet option (no arrow) — plain option
    if (/^[-•*\d.)]/.test(line) && inOptions && current) {
      const optText = line.replace(/^[-•*\d.)]\s*/, '').trim()
      if (optText && optText.length < 80 && !/^(📌|Ref|Note)/i.test(optText)) {
        const lastNode = nodes[nodes.length - 1]
        if (lastNode && lastNode.id === current) {
          lastNode.rawOptions.push({ text: optText, target: null })
        }
      }
      continue
    }

    // Regular content line — add to prompt
    if (!inOptions && current && !isEmojiHeader(line) && line.length > 3) {
      // Skip pure ref/note lines
      if (!/^(📌|Ref:|Note:|If\s+YES|If\s+")/i.test(line)) {
        promptLines.push(line)
      }
    }
  }
  flush()

  if (nodes.length === 0) {
    // Fallback — couldn't parse sections, try simpler approach
    return parseSimpleConditional(text)
  }

  // Second pass: resolve targets to state IDs
  const stateIds = nodes.map(n => n.id)

  const flow = nodes.map((node, idx) => {
    const nextId = nodes[idx + 1]?.id || 'end'

    const options = node.rawOptions.map(opt => ({
      text:       opt.text,
      next_state: resolveTarget(opt.target, stateIds, idx, nodes),
    }))

    return {
      id:      node.id,
      prompt:  node.prompt,
      options,
    }
  })

  // Clean up — remove nodes with empty prompts, mark terminals
  const cleanFlow = flow
    .filter(n => n.prompt && n.prompt.length > 3)
    .map((n, i, arr) => ({
      ...n,
      options: n.options.length === 0 && i === arr.length - 1 ? [] : n.options,
    }))

  return { flow: cleanFlow, source: 'conditional_format' }
}

// Simpler fallback for conditional format
function parseSimpleConditional(text) {
  const blocks = text.split(/\n{2,}/)
  const flow   = []
  let idx      = 0

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    // First line = prompt, remaining lines with → = options
    const prompt  = lines.filter(l => !l.includes('→') && !l.includes('->') && !/^[-•*]/.test(l)).join(' ').trim()
    const optLines = lines.filter(l => l.includes('→') || l.includes('->') || /^[-•*]/.test(l))

    if (!prompt || prompt.length < 5) continue

    const options = optLines.map(l => {
      const m = l.match(/^(.+?)\s*(?:→|->)\s*(.+)$/)
      if (m) return { text: m[1].replace(/^[-•*]\s*/, '').trim(), next_state: slugify(m[2].trim()) }
      return { text: l.replace(/^[-•*]\s*/, '').trim(), next_state: null }
    }).filter(o => o.text && o.text.length < 80)

    flow.push({
      id:      idx === 0 ? 'intro' : `step_${idx}`,
      prompt,
      options,
    })
    idx++
  }

  if (flow.length > 0) flow[flow.length - 1].options = []
  return { flow, source: 'simple_conditional' }
}

// Resolve a target string to an actual state ID
function resolveTarget(target, stateIds, currentIdx, nodes) {
  if (!target) return nodes[currentIdx + 1]?.id || 'end'

  const t = target.toLowerCase().trim()

  // Direct "end" keywords
  if (/^(end|close|done|finish|terminate|goodbye)/i.test(t)) return 'end'

  // Find matching state ID by slug similarity
  const slug = slugify(target)
  const exact = stateIds.find(id => id === slug || id.includes(slug) || slug.includes(id))
  if (exact) return exact

  // Keyword matching
  if (/reschedule|callback|call back|later/i.test(t)) {
    return stateIds.find(id => /reschedule|callback/.test(id)) || 'end'
  }
  if (/task|check|status|proceed/i.test(t)) {
    return stateIds.find(id => /task|check|status/.test(id)) || nodes[currentIdx + 1]?.id || 'end'
  }
  if (/problem|pending|issue|error/i.test(t)) {
    return stateIds.find(id => /problem|pending|issue/.test(id)) || 'end'
  }
  if (/partial|incomplete/i.test(t)) {
    return stateIds.find(id => /partial|incomplete/.test(id)) || 'end'
  }
  if (/satisfaction|rating|done|complete/i.test(t)) {
    return stateIds.find(id => /satisf|rating|done|task_done/.test(id)) || 'end'
  }
  if (/escalat|permission/i.test(t)) {
    return stateIds.find(id => /escalat|permission/.test(id)) || 'end'
  }
  if (/clarif|purpose|who/i.test(t)) {
    return stateIds.find(id => /clarif|who/.test(id)) || nodes[currentIdx]?.id || 'end'  // stay
  }

  // Default: next state
  return nodes[currentIdx + 1]?.id || 'end'
}

// ─────────────────────────────────────────────────────────────
// FORMAT 2: AGENT/USER MARKERS
// ─────────────────────────────────────────────────────────────

const AGENT_MARKERS = /^(agent|ai|bot|q|question|priya|assistant|caller|system|એજન્ટ|एजेंट)\s*:/i
const USER_MARKERS  = /^(user|human|a|answer|options?|response|caller|customer|contact|યુઝર|उपयोगकर्ता)\s*:/i

function hasAgentUserMarkers(text) {
  return text.split('\n').some(l => AGENT_MARKERS.test(l.trim()) || USER_MARKERS.test(l.trim()))
}

function parseAgentUserFormat(text) {
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean)
  const flow   = []
  let idx      = 0
  let prompt   = null
  let options  = []

  const flush = () => {
    if (!prompt) return
    flow.push({
      id:      idx === 0 ? 'intro' : `step_${idx}`,
      prompt,
      options: options.map(o => {
        const m = o.match(/^(.+?)\s*(?:→|->)\s*(.+)$/)
        return m
          ? { text: m[1].trim(), next_state: slugify(m[2].trim()) }
          : { text: o, next_state: null }
      }).filter(o => o.text.length >= 2 && o.text.length <= 80),
    })
    idx++
    prompt  = null
    options = []
  }

  for (const line of lines) {
    if (AGENT_MARKERS.test(line)) {
      flush()
      prompt = line.replace(AGENT_MARKERS, '').trim()
    } else if (USER_MARKERS.test(line)) {
      const raw = line.replace(USER_MARKERS, '').trim()
      options   = splitOptions(raw)
    } else if (prompt !== null) {
      if (looksLikeOptions(line)) options.push(...splitOptions(line))
      else prompt += ' ' + line
    }
  }
  flush()

  // Resolve null next_states
  const stateIds = flow.map(n => n.id)
  flow.forEach((node, idx) => {
    node.options = node.options.map(opt => ({
      ...opt,
      next_state: opt.next_state || flow[idx + 1]?.id || 'end',
    }))
  })

  if (flow.length > 0) flow[flow.length - 1].options = []
  return { flow, source: 'agent_user_format' }
}

// ─────────────────────────────────────────────────────────────
// FORMAT 3: TABLE FORMAT
// ─────────────────────────────────────────────────────────────

function hasTableStructure(text) {
  return text.split('\n').some(l => {
    const parts = l.split(/\t|\|/)
    return parts.length >= 2 && /^[a-z][a-z0-9_]{0,30}$/.test(parts[0].trim().toLowerCase())
  })
}

function parseTableFormat(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const flow  = []

  for (const line of lines) {
    const parts = line.includes('\t')
      ? line.split('\t').map(p => p.trim())
      : line.split('|').map(p => p.trim())

    if (parts.length < 2) continue
    const id = parts[0].toLowerCase().replace(/\s+/g, '_')
    if (!id || /^(id|#|no|sr)$/i.test(id)) continue

    const prompt  = parts[1] || ''
    const optRaw  = parts[2] || ''
    const options = splitOptions(optRaw).map(o => {
      const m = o.match(/^(.+?)\s*(?:→|->)\s*(.+)$/)
      return m
        ? { text: m[1].trim(), next_state: slugify(m[2].trim()) }
        : { text: o, next_state: null }
    })

    if (prompt.length > 3) flow.push({ id, prompt, options })
  }

  // Resolve nulls
  const stateIds = flow.map(n => n.id)
  flow.forEach((node, idx) => {
    node.options = node.options.map(opt => ({
      ...opt,
      next_state: opt.next_state || flow[idx + 1]?.id || 'end',
    }))
  })

  if (flow.length > 0) flow[flow.length - 1].options = []
  return { flow, source: 'table_format' }
}

// ─────────────────────────────────────────────────────────────
// FORMAT 4: PLAIN PARAGRAPHS
// ─────────────────────────────────────────────────────────────

function parsePlainFormat(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 5 && !/^(IDPrompt|ID\s+Prompt)/i.test(p))

  const flow = paragraphs.map((para, i) => ({
    id:      i === 0 ? 'intro' : `step_${i}`,
    prompt:  para,
    options: [],
  }))

  return { flow, source: 'plain_format' }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function slugify(text) {
  if (!text) return 'end'
  return text
    .toLowerCase()
    .trim()
    .replace(/[📌✅⚠️🔁❓🧩📂🤝📝🔚⭐]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'step'
}

function isEmojiHeader(line) {
  return /^[📌✅⚠️🔁❓🧩📂🤝📝🔚⭐\d]+/.test(line) && line.length < 60
}

function splitOptions(raw) {
  if (!raw) return []
  let parts = []
  if (raw.includes(';'))       parts = raw.split(';')
  else if (raw.includes(' / ')) parts = raw.split(' / ')
  else if (raw.includes('/'))  parts = raw.split('/')
  else if (raw.includes(',') && raw.length < 100) parts = raw.split(',')
  else parts = [raw]
  return parts
    .map(p => p.replace(/^[-•*\d.)]\s*/, '').trim())
    .filter(p => p.length >= 2 && p.length <= 80)
    .filter(p => !/^if\s+/i.test(p) && !/→/.test(p) && !/->/.test(p))
}

function looksLikeOptions(line) {
  return line.length < 80 && (
    line.includes(';') || line.includes(' / ') || line.includes('/') ||
    line.startsWith('-') || line.startsWith('•') || line.startsWith('*')
  )
}

function normalizeNode(node) {
  const options = Array.isArray(node.options) ? node.options.map(o => {
    if (typeof o === 'string') return { text: o.trim(), next_state: null }
    return { text: String(o.text || o.label || '').trim(), next_state: o.next_state || null }
  }).filter(o => o.text.length >= 2) : []

  return {
    id:      slugify(node.id || `step_${Math.random().toString(36).slice(2, 5)}`),
    prompt:  (node.prompt || node.text || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
    options,
  }
}

// ─────────────────────────────────────────────────────────────
// DOCX EXTRACTION
// ─────────────────────────────────────────────────────────────

async function extractDocxText(buffer) {
  try {
    const xml = extractXmlFromZip(buffer, 'word/document.xml')
    if (!xml) throw new Error('Could not find document.xml')

    if (xml.includes('<w:tbl>')) {
      const tableText = extractTableText(xml)
      if (tableText) return tableText
    }

    return extractParagraphText(xml)
  } catch (err) {
    throw new Error(`DOCX read error: ${err.message}`)
  }
}

function extractTableText(xml) {
  const rows = []
  const trBlocks = xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []
  for (const tr of trBlocks) {
    const cells    = []
    const tcBlocks = tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || []
    for (const tc of tcBlocks) {
      const texts = (tc.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
        .map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
      cells.push(texts.join(' ').trim())
    }
    if (cells.some(c => c)) rows.push(cells)
  }
  return rows.length ? rows.map(r => r.join('\t')).join('\n') : null
}

function extractParagraphText(xml) {
  const pBlocks = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []
  return pBlocks
    .map(p => (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
      .map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ').trim())
    .filter(Boolean)
    .join('\n')
}

function extractXmlFromZip(zipBuffer, targetPath) {
  try {
    let offset = 0
    while (offset < zipBuffer.length - 30) {
      if (zipBuffer[offset] !== 0x50 || zipBuffer[offset+1] !== 0x4B ||
          zipBuffer[offset+2] !== 0x03 || zipBuffer[offset+3] !== 0x04) { offset++; continue }
      const compMethod = zipBuffer.readUInt16LE(offset + 8)
      const compSize   = zipBuffer.readUInt32LE(offset + 18)
      const fnLen      = zipBuffer.readUInt16LE(offset + 26)
      const extraLen   = zipBuffer.readUInt16LE(offset + 28)
      const fileName   = zipBuffer.slice(offset+30, offset+30+fnLen).toString('utf8')
      const dataStart  = offset + 30 + fnLen + extraLen
      if (fileName === targetPath) {
        const compData = zipBuffer.slice(dataStart, dataStart + compSize)
        if (compMethod === 0) return compData.toString('utf8')
        if (compMethod === 8) return zlib.inflateRawSync(compData).toString('utf8')
      }
      offset = dataStart + compSize
    }
    return null
  } catch { return null }
}

// ─────────────────────────────────────────────────────────────
// PDF EXTRACTION
// ─────────────────────────────────────────────────────────────

async function extractPdfText(pdfBuffer) {
  const tableText = await tryPdfplumber(pdfBuffer)
  if (tableText) return tableText
  const data = await pdfParse(pdfBuffer)
  return (data.text || '').trim()
}

async function tryPdfplumber(pdfBuffer) {
  const { execSync } = require('child_process')
  const tmpPdf = path.join(os.tmpdir(), `flow_${Date.now()}.pdf`)
  const pyFile = path.join(os.tmpdir(), `pp_${Date.now()}.py`)
  fs.writeFileSync(tmpPdf, pdfBuffer)
  fs.writeFileSync(pyFile, `
import sys,json
try:
    import pdfplumber
    rows=[]
    with pdfplumber.open(sys.argv[1]) as pdf:
        for page in pdf.pages:
            for table in (page.extract_tables() or []):
                for row in table:
                    c=[str(x or '').replace('\\n',' ').strip() for x in row]
                    if any(c): rows.append(c)
    print(json.dumps(rows,ensure_ascii=False))
except: print('[]')
`)
  try {
    const out  = execSync(`python3 "${pyFile}" "${tmpPdf}"`, { maxBuffer: 2*1024*1024, timeout: 15000 }).toString()
    const rows = JSON.parse(out)
    return rows?.length ? rows.map(r => r.join('\t')).join('\n') : null
  } catch { return null }
  finally {
    try { fs.unlinkSync(tmpPdf) } catch {}
    try { fs.unlinkSync(pyFile) } catch {}
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

function parseTextToFlow(text) {
  const result = parseAnyFormat(text)
  return { ...result, parsed_at: new Date().toISOString() }
}

function parseScript() { return [] }

module.exports = { parsePdfToFlowConfig, parseTextToFlow }
