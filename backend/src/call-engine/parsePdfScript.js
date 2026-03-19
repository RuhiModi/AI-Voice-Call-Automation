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
  // Strategy: split text into blocks separated by:
  // - Numbered headers: "1.", "2.", "3." etc
  // - Emoji headers: "📌", "✅", "⚠️" etc
  // - Keyword headers: "Script:", "Options:", "User Responses:"
  // - Blank lines (2+)
  // Each block = one state

  const lines = text.split('\n')
  const blocks = []
  let current = { headerHint: null, promptLines: [], optionLines: [] }
  let inOptions = false

  const flush = () => {
    const prompt = current.promptLines.join(' ').replace(/\s+/g, ' ').trim()
    const opts   = current.optionLines
    if (prompt.length > 3) {
      blocks.push({ hint: current.headerHint, prompt, optionLines: opts })
    } else if (opts.length > 0 && current.headerHint) {
      // Options-only section (no Script: label) — use header as prompt hint
      // Generate a minimal prompt from the header
      // For options-only sections, use a generic prompt based on section type
      const sectionName = current.headerHint
        .replace(/^\d+\.?\s*/, '')
        .replace(/[📌✅⚠️🔁❓🧩📂🤝📝🔚⭐🔄]/g, '')
        .trim()
      // Generate sensible prompt for common section types
      let autoPrompt = sectionName
      if (/reschedule|callback/i.test(sectionName)) {
        autoPrompt = 'ક્યારે ફોન કરી શકીએ? 1 કલાક પછી, સાંજે, અથવા કાલે?'
      } else if (/partial/i.test(sectionName)) {
        autoPrompt = 'કયો ભાગ હજુ બાકી છે?'
      } else if (/data.?issue|no.?applic/i.test(sectionName)) {
        autoPrompt = 'સમજ્યા. શું આ ડેટા ભૂલ છે?'
      } else if (/escalat|permission/i.test(sectionName)) {
        autoPrompt = 'શું આ મુદ્દો સંબંધિત વિભાગ સુધી પહોંચાડીએ?'
      }
      blocks.push({ hint: current.headerHint, prompt: autoPrompt, optionLines: opts })
    }
    current   = { headerHint: null, promptLines: [], optionLines: [] }
    inOptions = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Numbered section header: "1.", "2. Task Check" — must have period after number
    if (/^\d+\.\s/.test(line) && line.length < 80 && !line.includes('→') && !line.includes('->')) {
      flush()
      current.headerHint = line
      inOptions = false
      continue
    }

    // Emoji-only header line
    if (/^[📌✅⚠️🔁❓🧩📂🤝📝🔚⭐🔄]+/.test(line) && line.length < 60) {
      flush()
      current.headerHint = line
      inOptions = false
      continue
    }

    // "Script:" label — next content is prompt
    if (/^script\s*:/i.test(line)) {
      inOptions = false
      continue
    }

    // Options/responses section
    if (/^(options?|user\s*responses?|responses?|if\s+user)\s*:/i.test(line)) {
      inOptions = true
      continue
    }

    // Empty line — could reset options mode
    if (!line) {
      // Two empty lines = new block
      if (current.promptLines.length > 0 || current.optionLines.length > 0) {
        // Keep collecting — blank lines within a block are ok
      }
      continue
    }

    // Arrow option line — always treat as option regardless of inOptions flag
    if (line.includes('→') || line.includes('->')) {
      const arrowMatch = line.match(/^(.+?)\s*(?:→|->)\s*(.+)$/)
      if (arrowMatch) {
        const optText = arrowMatch[1].replace(/^[-•*\d.)]\s*/, '').trim()
        const target  = arrowMatch[2].trim()
        if (optText.length >= 2 && optText.length <= 80) {
          current.optionLines.push({ text: optText, target })
          inOptions = true
        }
      }
      continue
    }

    // Bullet/numbered option in options section
    if (inOptions && /^[-•*\d.)]\s*\S/.test(line)) {
      const optText = line.replace(/^[-•*\d.)]\s*/, '').trim()
      if (optText.length >= 2 && optText.length <= 80) {
        current.optionLines.push({ text: optText, target: null })
      }
      continue
    }

    // Regular prompt line — skip instruction/note lines
    if (!inOptions) {
      const isInstruction = /^(📌|Ref:|Note:|If\s+(user|yes|no)|Options?:|User\s+Responses?:)/i.test(line)
      if (!isInstruction && line.length > 3) {
        current.promptLines.push(line)
      }
    }
  }
  flush()

  if (blocks.length === 0) return parsePlainFormat(text)

  // Build state IDs from hints
  const flow = blocks.map((block, idx) => {
    const id = block.hint
      ? slugify(block.hint)
      : (idx === 0 ? 'intro' : `step_${idx}`)
    return {
      id:         id || (idx === 0 ? 'intro' : `step_${idx}`),
      prompt:     block.prompt,
      rawOptions: block.optionLines,
    }
  }).filter(n => n.prompt.length > 3)

  // Ensure unique IDs
  const seen = {}
  flow.forEach(n => {
    seen[n.id] = (seen[n.id] || 0) + 1
    if (seen[n.id] > 1) n.id = n.id + '_' + seen[n.id]
  })

  const stateIds = flow.map(n => n.id)

  // Resolve option targets to state IDs
  const result = flow.map((node, idx) => ({
    id:      node.id,
    prompt:  node.prompt,
    options: node.rawOptions.map(opt => ({
      text:       opt.text,
      next_state: opt.target
        ? resolveTarget(opt.target, stateIds, idx, flow)
        : flow[idx + 1]?.id || 'end',
    })),
  }))

  // Last state = terminal
  if (result.length > 0) result[result.length - 1].options = []

  return { flow: result, source: 'conditional_format' }
}

// Simple fallback
function parseSimpleConditional(text) {
  const blocks = text.split(/\n{2,}/)
  const flow   = []
  let idx      = 0

  for (const block of blocks) {
    const lines   = block.split('\n').map(l => l.trim()).filter(Boolean)
    const prompt  = lines.filter(l => !l.includes('→') && !l.includes('->') && !/^[-•*]/.test(l)).join(' ').trim()
    const optLines = lines.filter(l => l.includes('→') || l.includes('->') || /^[-•*]/.test(l))

    if (!prompt || prompt.length < 3) continue

    const options = optLines.map(l => {
      const m = l.match(/^(.+?)\s*(?:→|->)\s*(.+)$/)
      if (m) return { text: m[1].replace(/^[-•*]\s*/, '').trim(), next_state: slugify(m[2].trim()) }
      return { text: l.replace(/^[-•*]\s*/, '').trim(), next_state: null }
    }).filter(o => o.text && o.text.length < 80)

    flow.push({ id: idx === 0 ? 'intro' : `step_${idx}`, prompt, options })
    idx++
  }

  if (flow.length > 0) flow[flow.length - 1].options = []
  return { flow, source: 'simple_conditional' }
}


// ─────────────────────────────────────────────────────────────
// RESOLVE TARGET — maps a target string to a state ID
// ─────────────────────────────────────────────────────────────

function resolveTarget(target, stateIds, currentIdx, nodes) {
  if (!target) return nodes[currentIdx + 1]?.id || 'end'
  const t = target.toLowerCase().trim()

  // Hard end — check FIRST before any other matching
  if (/^(end|close|finish|terminate|goodbye|stop|exit|done|complete)/i.test(t)) return 'end'
  if (t === 'end' || t === 'end call' || t === 'end / update' || t === 'end/update') return 'end'

  // Try direct slug match first
  const slug    = slugify(target)
  // Strip leading number prefix from state IDs for comparison (e.g. '4_task_done' → 'task_done')
  const stripNum = id => id.replace(/^\d+_/, '')
  const exact = stateIds.find(id =>
    id === slug ||
    stripNum(id) === slug ||
    id.startsWith(slug.slice(0, 8)) ||
    slug.startsWith(stripNum(id).slice(0, 8)) ||
    stripNum(id).startsWith(slug.slice(0, 8))
  )
  if (exact) return exact

  // Semantic routing — run FIRST before any keyword matching
  const patterns = [
    [/^(proceed|continue|quickly|advance|yes.*proceed|tunkma)/i, null],   // → next state
    [/^(clarif|purpose|who|kaun|kon)/i,                           null],   // → stay
    [/reschedule|callback|call.?back|later|pachhi|baad|pachi/i,   /reschedule|callback/],
    [/task.?check|status.*check/i,                                /task_check|status_check/],
    [/task.?done|satisf|rating|purn.*thay/i,                      /task_done|satisf|rating/],
    [/task.?pend|problem|pending|baki/i,                          /task_pend|problem|pending/],
    [/partial|incomplete|bhagye/i,                                /partial|incomplete/],
    [/escalat|permission/i,                                       /escalat|permission/],
    [/data.?issue|wrong.?data/i,                                  /data_issue|no_applic/],
    [/problem.?record|noted|nondh/i,                              /problem_record|recorded/],
  ]

  for (const [trigger, targetPattern] of patterns) {
    if (trigger.test(t)) {
      if (!targetPattern) return nodes[currentIdx + 1]?.id || 'end'
      const found = stateIds.find(id => targetPattern.test(id))
      if (found) return found
    }
  }

  // Keyword search — last resort, only if semantic failed
  const keywords = t.replace(/^go to /i, '').split(/[\s_\-\/]+/).filter(w => w.length > 3)
  // Skip generic words that don't map to states
  const skipWords = new Set(['flow','check','the','and','or','for','this','that','with','from','into','goto','go'])
  for (const kw of keywords) {
    if (skipWords.has(kw)) continue
    const kwSlug = slugify(kw)
    const stripNum = id => id.replace(/^\d+_/, '')
    const match = stateIds.find(id =>
      stripNum(id).includes(kwSlug) ||
      kwSlug.includes(stripNum(id).replace(/_+\d+$/, ''))
    )
    if (match) return match
  }

  // Check if target matches any state prompt words
  for (const sid of stateIds) {
    const node = nodes.find(n => n.id === sid)
    if (node?.prompt) {
      const promptSlug = slugify(node.prompt.slice(0, 30))
      if (promptSlug.includes(slug.slice(0, 6)) && slug.length > 4) return sid
    }
  }

  // Default: next state in sequence
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
