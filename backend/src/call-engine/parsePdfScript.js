// src/call-engine/parsePdfScript.js
//
// Parses a voice flow PDF → extracts PROMPT TEXTS per state ID.
// Logic/transitions stay in scriptFlow.js (they don't change between campaigns).
// Only the Gujarati words spoken by the AI change campaign to campaign.
//
// Output: { state_id: "text to speak", ... }

const { execSync } = require('child_process')
const fs   = require('fs')
const path = require('path')
const os   = require('os')

async function parsePdfToFlowConfig(pdfBuffer) {
  const tmpPdf = path.join(os.tmpdir(), `flow_${Date.now()}.pdf`)
  fs.writeFileSync(tmpPdf, pdfBuffer)

  try {
    const pyScript = `
import pdfplumber, json, sys, re

def clean(text):
    if not text: return ''
    text = text.replace('\\u200b','').replace('\\u00a0',' ')
    text = re.sub(r'\\s+', ' ', text)
    return text.strip()

rows = []
with pdfplumber.open(sys.argv[1]) as pdf:
    for page in pdf.pages:
        for table in (page.extract_tables() or []):
            for row in table:
                cleaned = [clean(c) for c in row]
                if any(cleaned): rows.append(cleaned)

print(json.dumps(rows, ensure_ascii=False))
`
    const pyFile = path.join(os.tmpdir(), `ep_${Date.now()}.py`)
    fs.writeFileSync(pyFile, pyScript)
    const output = execSync(`python3 "${pyFile}" "${tmpPdf}"`, { maxBuffer: 5 * 1024 * 1024 }).toString()
    fs.unlinkSync(tmpPdf)
    fs.unlinkSync(pyFile)

    const rows = JSON.parse(output)
    return extractTexts(rows)
  } catch (err) {
    fs.existsSync(tmpPdf) && fs.unlinkSync(tmpPdf)
    throw new Error(`PDF parse failed: ${err.message}`)
  }
}

function extractTexts(rows) {
  const texts = {}

  for (const row of rows) {
    const stateId = (row[0] || '').trim().toLowerCase()
    const prompt  = (row[1] || '').trim()

    // Skip header row
    if (!stateId || stateId === 'id' || !prompt || prompt === 'prompt') continue

    // Clean up the prompt text (normalize spacing from PDF extraction)
    const cleaned = prompt
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    texts[stateId] = cleaned
  }

  return {
    texts,
    parsed_at: new Date().toISOString(),
    source: 'pdf'
  }
}

module.exports = { parsePdfToFlowConfig }
