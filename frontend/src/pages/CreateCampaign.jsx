import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { campaignApi } from '../hooks/api'
import { FileText, Globe, Upload, Loader } from 'lucide-react'

// ── Campaign "modes" ──────────────────────────────────────────
const MODES = [
  {
    id:       'announcement',
    emoji:    '📢',
    title:    'Inform People',
    subtitle: 'Route updates, scheme news, birthday wishes, reminders',
    color:    '#f5a623',
    bg:       '#fffbf0',
    border:   '#fde59a',
    examples: ['Driver route update', 'Scheme deadline reminder', 'Birthday wishes', 'EMI reminder'],
  },
  {
    id:       'survey',
    emoji:    '📋',
    title:    'Ask Questions',
    subtitle: 'Verify, collect feedback, confirm status',
    color:    '#228248',
    bg:       '#f0faf4',
    border:   '#b8e6cb',
    examples: ['Scheme beneficiary check', 'Service feedback', 'Appointment confirmation', 'Voting survey'],
  },
  {
    id:       'reminder',
    emoji:    '⏰',
    title:    'Send Reminders',
    subtitle: 'Appointments, payments, meetings, deadlines',
    color:    '#4f7ef0',
    bg:       '#f0f4ff',
    border:   '#c0d0ff',
    examples: ['Doctor appointment', 'Court date', 'Loan EMI', 'Meeting reminder'],
  },
]

const LANGS = [
  { code: 'gu', label: 'ગુજ', full: 'Gujarati' },
  { code: 'hi', label: 'हिं', full: 'Hindi'    },
  { code: 'en', label: 'Eng', full: 'English'  },
]

function extractVars(text) {
  if (!text) return []
  return [...new Set([...text.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()))]
}

function parseHeaders(text) {
  const firstLine = text.split('\n')[0]
  return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '')).filter(Boolean)
}

export default function CreateCampaign() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const pdfRef    = useRef(null)
  const msgRef    = useRef(null)

  const [campaignName, setCampaignName] = useState('')
  const [mode,         setMode]         = useState(null)
  const [lang,         setLang]         = useState('gu')
  const [message,      setMessage]      = useState('')
  const [contactFile,  setContactFile]  = useState(null)
  const [contactCols,  setContactCols]  = useState([])
  const [contactCount, setContactCount] = useState(0)
  const [previewRow,   setPreviewRow]   = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [launched,     setLaunched]     = useState(false)
  const [campaignId,   setCampaignId]   = useState(null)
  const [dragOver,     setDragOver]     = useState(false)

  // ── Script input state (for survey mode) ─────────────────
  const [scriptTab,   setScriptTab]   = useState('text')  // 'text' | 'url' | 'pdf'
  const [scriptText,  setScriptText]  = useState('')       // typed/pasted script
  const [pdfFile,     setPdfFile]     = useState(null)     // PDF upload
  const [urlInput,    setUrlInput]    = useState('')
  const [urlLoading,  setUrlLoading]  = useState(false)
  const [pdfLoading,  setPdfLoading]  = useState(false)
  const [generatedFlow, setGeneratedFlow] = useState(null)  // LLM-generated script preview
  const [scriptGenerating, setScriptGenerating] = useState(false)

  const [advanced, setAdvanced] = useState({
    persona_name:         'Priya',
    persona_tone:         'friendly',
    max_concurrent_calls: 3,
    calling_hours_start:  '09:00',
    calling_hours_end:    '21:00',
    google_sheet_url:     '',
    webhook_url:          '',
    webhook_secret:       '',
    max_retries:          2,
    schedule_mode:        'now',
    schedule_start:       '',
  })

  const selectedMode = MODES.find(m => m.id === mode)
  const templateVars = extractVars(message)
  const missingCols  = templateVars.filter(v =>
    !contactCols.some(c => c.toLowerCase().replace(/[\s_-]/g, '') === v.toLowerCase().replace(/[\s_-]/g, ''))
  )

  // script is "done" if text entered OR pdf uploaded
  const scriptReady = scriptText.trim().length > 10 || !!pdfFile

  function insertVar(varName) {
    const el  = msgRef.current
    const tag = `{{${varName}}}`
    if (!el) { setMessage(m => m + tag); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = message.slice(0, start) + tag + message.slice(end)
    setMessage(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + tag.length, start + tag.length)
    }, 0)
  }

  function buildPreview() {
    if (!message || !previewRow) return null
    let preview = message
    for (const [col, val] of Object.entries(previewRow)) {
      preview = preview.replace(new RegExp(`\\{\\{\\s*${col}\\s*\\}\\}`, 'gi'), val)
    }
    return preview
  }

  const handleContactFile = useCallback(async (file) => {
    if (!file) return
    setContactFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 1) return
      const headers = parseHeaders(lines[0])
      setContactCols(headers)
      if (lines.length > 1) {
        const vals = lines[1].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row = {}
        headers.forEach((h, i) => { row[h] = vals[i] || '' })
        setPreviewRow(row)
      }
    }
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      setContactCols([])
      setPreviewRow(null)
    }
  }, [])

  // ── Parse script into conversation flow (instant, no LLM) ──
  async function generatePreview(text) {
    if (!text || text.length < 30) return
    setScriptGenerating(true)
    setGeneratedFlow(null)
    try {
      const res = await campaignApi.previewScript(text, lang, mode)
      if (res.data?.flow?.length) {
        setGeneratedFlow(res.data.flow)
        toast.success(`✅ Script parsed — ${res.data.flow.length} conversation states`)
      } else {
        toast('Script parsed but no states found — check format', { icon: 'ℹ️' })
      }
    } catch (err) {
      console.warn('Script preview failed:', err.message)
      toast('Could not parse script — check format', { icon: '⚠️' })
    } finally {
      setScriptGenerating(false)
    }
  }

  // ── URL extraction → then generate script preview ─────────
  async function fetchUrl() {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    setGeneratedFlow(null)
    try {
      const res  = await campaignApi.extractUrl(urlInput.trim())
      const text = res.data.text || ''
      setScriptText(text)
      setScriptTab('text')
      toast.success('URL extracted — generating script...')
      generatePreview(text)  // fire and don't await — shows spinner separately
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Could not fetch URL')
    } finally { setUrlLoading(false) }
  }

  // ── PDF extraction → then generate script preview ─────────
  async function uploadScriptPdf(file) {
    if (!file) return
    setPdfFile(file)
    setPdfLoading(true)
    setScriptGenerating(true)
    setGeneratedFlow(null)
    try {
      // Send file directly — preserves binary, no text garbling
      const res  = await campaignApi.parseScriptFile(file)
      const flow = res.data?.flow
      if (flow?.length) {
        setGeneratedFlow(flow)
        setScriptText(flow.map(s => s.prompt).join('
'))
        toast.success(`✅ Script parsed — ${flow.length} states`)
      } else {
        toast('File uploaded — script will be parsed on launch', { icon: 'ℹ️' })
      }
    } catch (err) {
      // Fallback: extract text then preview
      try {
        const extractRes = await campaignApi.extractPdf(file)
        const text = extractRes.data.text || ''
        if (text) { setScriptText(text); generatePreview(text) }
      } catch { toast.error(err.response?.data?.error || 'Could not read file') }
    } finally {
      setPdfLoading(false)
      setScriptGenerating(false)
    }
  }

  // ── LAUNCH ────────────────────────────────────────────────
  async function handleLaunch() {
    if (!mode)        { toast.error('Please choose what kind of call to make'); return }
    if (!contactFile) { toast.error('Please upload a contact file'); return }
    if (mode === 'announcement' && !message.trim()) {
      toast.error('Please write your message'); return
    }
    if (mode === 'survey' && !scriptReady) {
      toast.error('Please add your question script (text, URL, or PDF)'); return
    }
    if (advanced.schedule_mode === 'schedule' && !advanced.schedule_start) {
      toast.error('Please set when to start calls'); return
    }

    setLoading(true)
    try {
      const finalScript = mode === 'survey' ? scriptText : message

      const payload = {
        name:                  campaignName.trim() || `${selectedMode.title} — ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}`,
        campaign_type:         mode,
        language_priority:     lang,
        script_type:           mode === 'survey' ? (pdfFile && !scriptText ? 'pdf' : 'manual') : 'manual',
        script_content:        finalScript,
        announcement_template: mode === 'announcement' ? message : null,
        persona_name:          advanced.persona_name,
        persona_tone:          advanced.persona_tone,
        max_concurrent_calls:  advanced.max_concurrent_calls,
        calling_hours_start:   advanced.calling_hours_start,
        calling_hours_end:     advanced.calling_hours_end,
        google_sheet_url:      advanced.google_sheet_url || null,
        webhook_url:           advanced.webhook_url    || null,
        webhook_secret:        advanced.webhook_secret || null,
        max_retries:           advanced.max_retries,
        schedule_start:        advanced.schedule_mode === 'schedule' ? advanced.schedule_start : null,
        status:                'draft',
      }

      const res = await campaignApi.create(payload)
      const id  = res.data.campaign.id
      setCampaignId(id)

      // Save edited script to campaign DB — non-fatal, never blocks launch
      try {
        if (mode === 'survey') {
          if (generatedFlow?.length) {
            // User reviewed/edited the generated flow — save it directly
            await campaignApi.update(id, { flow_config: { flow: generatedFlow, source: 'llm_edited', parsed_at: new Date().toISOString() } })
          } else if (scriptText && scriptText.length > 20) {
            // No preview yet — generate from text on backend
            await campaignApi.generateScript(id, scriptText, lang, mode)
          }
        }
      } catch (e) { console.warn('[Script] Save non-fatal:', e.message) }

      const contactRes = await campaignApi.uploadContacts(id, contactFile)
      setContactCount(contactRes.data.count)
      await campaignApi.launch(id)

      setLaunched(true)
      toast.success(`🚀 ${contactRes.data.count} calls starting now!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleContactFile(file)
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────
  if (launched) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-6 animate-bounce">🚀</div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Campaign Launched!</h2>
          <p className="text-[#6b6b6b] mb-1">
            <span className="font-bold text-[#228248]">{contactCount} calls</span> are starting now
          </p>
          <p className="text-sm text-[#8a8a8a] mb-8">Your AI agent is calling everyone on the list</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate(`/dashboard/campaigns/${campaignId}`)}
              className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-2xl font-semibold text-sm">
              Watch Live Results →
            </button>
            <button onClick={() => {
              setLaunched(false); setCampaignName(''); setMode(null)
              setMessage(''); setContactFile(null); setContactCols([])
              setPreviewRow(null); setPdfFile(null); setScriptText('')
              setUrlInput(''); setScriptTab('text')
            }}
              className="w-full py-3.5 border-2 border-[#e0d9ce] text-[#525252] rounded-2xl font-semibold text-sm">
              Create Another Campaign
            </button>
          </div>
        </div>
      </div>
    )
  }

  const preview   = buildPreview()
  const canLaunch = campaignName.trim() && mode && contactFile && advanced.persona_tone &&
    (advanced.schedule_mode === 'now' || !!advanced.schedule_start) &&
    (mode === 'survey' ? scriptReady : !!message.trim())

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1">New Campaign</h1>
        <p className="text-[#8a8a8a] text-sm">Set up and launch in under 2 minutes</p>
      </div>

      {/* ── STEP 1: Campaign Name ── */}
      <Section label="1. Campaign Name" done={campaignName.trim().length > 0}>
        <input
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
          placeholder={
            !mode ? 'e.g. Bus Driver Route Update — March 2026'
            : mode === 'announcement' ? 'e.g. Bus Driver Route Update — March 2026'
            : mode === 'survey' ? 'e.g. Beneficiary Verification — Taluka North'
            : 'e.g. EMI Reminder — April Batch'
          }
          className={`w-full border-2 rounded-2xl px-4 py-3.5 text-sm outline-none transition-all
            ${!campaignName.trim()
              ? 'border-[#ede7dc] bg-[#faf8f4] focus:border-[#1a1a1a]'
              : 'border-[#1a1a1a] bg-white'}`}
        />
        <p className="text-xs text-[#aaa] mt-1.5">Give it a specific name so you can find it later</p>
      </Section>

      {/* ── STEP 2: Mode ── */}
      <Section label="2. What do you want to do?" done={!!mode}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group
                ${mode === m.id
                  ? 'border-[#1a1a1a] bg-[#1a1a1a] shadow-lg scale-[1.02]'
                  : 'border-[#ede7dc] bg-white hover:border-[#ccc] hover:shadow-sm'}`}>
              <div className="text-3xl mb-3">{m.emoji}</div>
              <p className={`font-bold text-sm mb-1 ${mode === m.id ? 'text-white' : 'text-[#1a1a1a]'}`}>{m.title}</p>
              <p className={`text-xs leading-relaxed ${mode === m.id ? 'text-white/70' : 'text-[#8a8a8a]'}`}>{m.subtitle}</p>
              {mode === m.id && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#1a1a1a]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        {selectedMode && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedMode.examples.map(ex => (
              <span key={ex} className="text-xs px-3 py-1 rounded-full border border-[#e8e0d5] text-[#6b6b6b] bg-[#faf8f4]">{ex}</span>
            ))}
          </div>
        )}
      </Section>

      {/* ── STEP 3: Language ── */}
      {mode && (
        <Section label="3. Language" done={true}>
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all
                  ${lang === l.code
                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                    : 'border-[#ede7dc] text-[#525252] hover:border-[#bbb]'}`}>
                {l.label}
                <span className={`block text-[10px] font-normal mt-0.5 ${lang === l.code ? 'text-white/60' : 'text-[#aaa]'}`}>{l.full}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── STEP 4: Contact File ── */}
      {mode && (
        <Section label="4. Upload your contact list" done={!!contactFile}>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !contactFile && fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer
              ${contactFile
                ? 'border-[#228248] bg-[#f0faf4] p-4 cursor-default'
                : dragOver
                  ? 'border-[#1a1a1a] bg-[#f5f5f5] p-8'
                  : 'border-[#e0d9ce] hover:border-[#bbb] bg-[#faf8f4] p-8'}`}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
              onChange={e => handleContactFile(e.target.files[0])} className="hidden" />
            {contactFile ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#228248] rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1c673a] text-sm truncate">{contactFile.name}</p>
                  {contactCols.length > 0
                    ? <p className="text-xs text-[#228248] mt-1">Columns found: <span className="font-semibold">{contactCols.join(', ')}</span></p>
                    : <p className="text-xs text-[#228248] mt-1">File ready — contacts will be processed on launch</p>}
                </div>
                <button onClick={e => { e.stopPropagation(); setContactFile(null); setContactCols([]); setPreviewRow(null) }}
                  className="w-7 h-7 rounded-full bg-[#e0f0e8] flex items-center justify-center text-[#228248] hover:bg-[#228248] hover:text-white transition-all flex-shrink-0">
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-3">📎</div>
                <p className="font-semibold text-[#3d3d3d] text-sm mb-1">Drop your Excel or CSV file here</p>
                <p className="text-xs text-[#8a8a8a]">Must have a <strong>phone</strong> column + any other info (name, route, timing...)</p>
                <p className="text-xs text-[#bbb] mt-2">or click to browse</p>
              </div>
            )}
          </div>
          {contactCols.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {contactCols.map(col => (
                <span key={col} className="text-xs px-2.5 py-1 bg-white border border-[#e0d9ce] rounded-full text-[#525252] font-mono">{col}</span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── STEP 5a: Message (Announcement / Reminder) ── */}
      {mode && mode !== 'survey' && (
        <Section label="5. Write your message" done={message.trim().length > 10}>
          {contactCols.filter(c => c.toLowerCase() !== 'phone' && c.toLowerCase() !== 'mobile').length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[#8a8a8a] mb-2">Tap a column name to insert it into your message ↓</p>
              <div className="flex flex-wrap gap-2">
                {contactCols
                  .filter(c => c.toLowerCase() !== 'phone' && c.toLowerCase() !== 'mobile')
                  .map(col => (
                    <button key={col} onClick={() => insertVar(col)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fff9ee] border border-[#fde59a] text-[#8f540f] rounded-full text-xs font-semibold hover:bg-[#fde59a] transition-all">
                      <span className="text-[10px] opacity-60">{'{{'}</span>{col}<span className="text-[10px] opacity-60">{'}}'}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
          <textarea ref={msgRef} value={message} onChange={e => setMessage(e.target.value)} rows={4}
            placeholder={
              lang === 'gu' ? 'નમસ્તે {{Name}}, આપનો રૂટ {{Route}} છે, સમય {{Timing}} છે. સમજ્યા?'
              : lang === 'hi' ? 'नमस्ते {{Name}}, आपका रूट {{Route}} है, समय {{Timing}} है। समझे?'
              : 'Hello {{Name}}, your route is {{Route}} at {{Timing}}. Got it?'
            }
            className="w-full bg-white border-2 border-[#ede7dc] focus:border-[#1a1a1a] rounded-2xl px-4 py-3.5 text-sm text-[#2c2c2c] placeholder-[#c0b8ae] resize-none outline-none transition-all leading-relaxed font-mono" />
          {missingCols.length > 0 && (
            <div className="mt-2 p-3 bg-[#fff5f0] border border-[#ffc0a0] rounded-xl">
              <p className="text-xs text-[#c0440f] font-semibold">
                ⚠️ These variables are not in your contact file: {' '}
                <span className="font-mono">{missingCols.map(v => `{{${v}}}`).join(', ')}</span>
              </p>
              <p className="text-xs text-[#c0440f] mt-0.5">Add these columns to your file or fix the spelling.</p>
            </div>
          )}
          {preview && missingCols.length === 0 && (
            <div className="mt-3 p-4 bg-[#f0faf4] border border-[#b8e6cb] rounded-2xl">
              <p className="text-xs font-semibold text-[#228248] mb-2 uppercase tracking-wide">Preview — first contact</p>
              <p className="text-sm text-[#1c673a] leading-relaxed">{preview}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── STEP 5b: Script (Survey) — Text / URL / PDF tabs ── */}
      {mode === 'survey' && (
        <Section label="5. Upload your question script" done={scriptReady}>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: '#f5f1ea' }}>
            {[
              ['text', <FileText size={12} />, 'Type / Paste'],
              ['url',  <Globe    size={12} />, 'From URL'],
              ['pdf',  <Upload   size={12} />, 'Upload PDF'],
            ].map(([key, icon, label]) => (
              <button key={key} onClick={() => setScriptTab(key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={scriptTab === key
                  ? { background: '#fff', color: '#1a1a1a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { color: '#8a8a8a' }}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* ── Text tab ── */}
          {scriptTab === 'text' && (
            <>
              <textarea
                value={scriptText}
                onChange={e => setScriptText(e.target.value)}
                onBlur={e => { if (e.target.value.length > 50) generatePreview(e.target.value) }}
                rows={7}
                placeholder={`Paste or type your call script here...\n\nExample:\nVerify if the contact received their scheme benefit.\n\nQuestion 1: Did you receive your ₹2000 payment?\nQuestion 2: Was the amount correct?\nIf no → collect their bank account number.`}
                className="w-full bg-white border-2 border-[#ede7dc] focus:border-[#1a1a1a] rounded-2xl px-4 py-3.5 text-sm text-[#2c2c2c] placeholder-[#c0b8ae] resize-none outline-none transition-all leading-relaxed"
              />
              {scriptText && (
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-[#aaa]">{scriptText.length} chars</span>
                  <button onClick={() => setScriptText('')} className="text-[11px] text-red-400 hover:text-red-600">Clear</button>
                </div>
              )}
            </>
          )}

          {/* ── URL tab ── */}
          {scriptTab === 'url' && (
            <div className="space-y-3">
              <p className="text-xs text-[#8a8a8a]">Extract content from any website — product page, scheme info, FAQ</p>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchUrl()}
                placeholder="https://yourwebsite.com/scheme-details"
                className="w-full bg-[#faf8f4] border-2 border-[#ede7dc] focus:border-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none transition-all"
              />
              <button
                onClick={fetchUrl}
                disabled={urlLoading || !urlInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all text-white"
                style={{ background: urlLoading || !urlInput.trim() ? '#d0c9be' : '#1a1a1a' }}>
                {urlLoading
                  ? <><Loader size={14} className="animate-spin" /> Fetching...</>
                  : <><Globe size={14} /> Extract Content</>}
              </button>
              {scriptText && (
                <div className="p-3 bg-[#f0faf4] border border-[#b8e6cb] rounded-xl text-xs text-[#228248] font-semibold">
                  ✅ Content extracted ({scriptText.length} chars) — switch to "Type / Paste" tab to review or edit
                </div>
              )}
            </div>
          )}

          {/* ── PDF tab ── */}
          {scriptTab === 'pdf' && (
            <div className="space-y-3">
              <p className="text-xs text-[#8a8a8a]">Upload your script — PDF, Word (.docx), or text file</p>
              <input ref={pdfRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
                onChange={e => uploadScriptPdf(e.target.files[0])} />

              {pdfFile ? (
                <div className="flex items-center gap-3 p-4 bg-[#f0faf4] border-2 border-[#228248] rounded-2xl">
                  <div className="w-10 h-10 bg-[#228248] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1c673a] text-sm truncate">{pdfFile.name}</p>
                    <p className="text-xs text-[#228248] mt-0.5">
                      {scriptText ? `${scriptText.length} chars extracted` : 'Will be parsed on launch'}
                    </p>
                  </div>
                  <button onClick={() => { setPdfFile(null); setScriptText('') }}
                    className="w-7 h-7 rounded-full bg-[#e0f0e8] flex items-center justify-center text-[#228248] hover:bg-[#228248] hover:text-white transition-all flex-shrink-0">
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => pdfRef.current?.click()}
                  disabled={pdfLoading}
                  className="w-full flex flex-col items-center gap-2 py-8 rounded-2xl border-2 border-dashed transition-all hover:border-[#bbb]"
                  style={{ borderColor: '#e0d9ce', background: '#faf8f4', cursor: 'pointer' }}>
                  {pdfLoading
                    ? <><Loader size={20} className="animate-spin text-[#a8a8a8]" /><span className="text-xs text-[#a8a8a8]">Reading PDF...</span></>
                    : <><Upload size={20} className="text-[#a8a8a8]" /><span className="text-xs font-semibold text-[#6b6b6b]">Click to upload PDF or Word doc</span><span className="text-[11px] text-[#aaa]">Max 5MB</span></>}
                </button>
              )}
            </div>
          )}
        {/* ── Script Generating Spinner ── */}
        {scriptGenerating && (
          <div className="mt-4 p-4 rounded-2xl border-2 border-[#e0d9ce] bg-[#faf8f4] flex items-center gap-3">
            <Loader size={16} className="animate-spin text-[#8a8a8a]" />
            <p className="text-sm text-[#6b6b6b]">Parsing your conversation script...</p>
          </div>
        )}

        {/* ── Generated Script — Editable ── */}
        {!scriptGenerating && generatedFlow && generatedFlow.length > 0 && (
          <div className="mt-4 rounded-2xl border-2 border-[#4f7ef0] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4ff]">
              <p className="text-xs font-bold text-[#4f7ef0] uppercase tracking-wider">
                🤖 AI Script — {generatedFlow.length} states
              </p>
              <button onClick={() => generatePreview(scriptText)}
                className="text-[11px] text-[#4f7ef0] hover:underline flex items-center gap-1">
                <Loader size={10}/> Regenerate
              </button>
            </div>
            <div className="divide-y divide-[#e8eeff] max-h-96 overflow-y-auto">
              {generatedFlow.map((state, i) => (
                <div key={i} className="p-3 bg-white hover:bg-[#fafbff] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono bg-[#e8eeff] text-[#4f7ef0] px-2 py-0.5 rounded-full flex-shrink-0">{state.id}</span>
                    {state.options?.length === 0 && <span className="text-[10px] text-[#aaa] bg-[#f5f5f5] px-2 py-0.5 rounded-full">ends call</span>}
                  </div>
                  {/* Editable prompt */}
                  <textarea
                    value={state.prompt}
                    onChange={e => {
                      const updated = [...generatedFlow]
                      updated[i] = { ...updated[i], prompt: e.target.value }
                      setGeneratedFlow(updated)
                    }}
                    rows={2}
                    className="w-full text-xs text-[#2c2c2c] leading-relaxed bg-[#fafbff] border border-[#e8eeff] rounded-lg px-2 py-1.5 outline-none focus:border-[#4f7ef0] resize-none"
                  />
                  {/* Editable options */}
                  {state.options?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-[#aaa] uppercase tracking-wide">Expected responses</p>
                      {state.options.map((opt, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <input
                            value={opt}
                            onChange={e => {
                              const updated = [...generatedFlow]
                              const opts    = [...updated[i].options]
                              opts[j]       = e.target.value
                              updated[i]    = { ...updated[i], options: opts }
                              setGeneratedFlow(updated)
                            }}
                            className="flex-1 text-[11px] px-2 py-1 bg-[#f0f4ff] border border-[#c0d0ff] text-[#4f7ef0] rounded-lg outline-none focus:border-[#4f7ef0]"
                          />
                          <button onClick={() => {
                            const updated = [...generatedFlow]
                            updated[i]    = { ...updated[i], options: updated[i].options.filter((_, k) => k !== j) }
                            setGeneratedFlow(updated)
                          }} className="text-[#ccc] hover:text-red-400 text-xs px-1">✕</button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const updated = [...generatedFlow]
                        updated[i]    = { ...updated[i], options: [...updated[i].options, ''] }
                        setGeneratedFlow(updated)
                      }} className="text-[10px] text-[#4f7ef0] hover:underline mt-1">+ Add option</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-2 bg-[#f0f4ff] border-t border-[#c0d0ff]">
              <p className="text-[11px] text-[#6b7ef0]">✏️ Edit any prompt or option above — this is exactly what the AI will say</p>
            </div>
          </div>
        )}
        </Section>
      )}

      {/* ── STEP 6: Schedule ── */}
      {mode && (
        <Section label="6. When to start calling?" done={advanced.schedule_mode === 'now' || !!advanced.schedule_start}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { id: 'now',      emoji: '⚡', label: 'Start Now',  sub: 'Calls begin immediately' },
              { id: 'schedule', emoji: '📅', label: 'Schedule',   sub: 'Pick a date & time' },
            ].map(opt => (
              <button key={opt.id}
                onClick={() => setAdvanced(a => ({ ...a, schedule_mode: opt.id, schedule_start: opt.id === 'now' ? '' : a.schedule_start }))}
                className={`p-4 rounded-2xl border-2 text-left transition-all
                  ${advanced.schedule_mode === opt.id
                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                    : 'border-[#ede7dc] hover:border-[#bbb] bg-white'}`}>
                <span className="text-xl block mb-1">{opt.emoji}</span>
                <p className={`font-bold text-sm ${advanced.schedule_mode === opt.id ? 'text-white' : 'text-[#1a1a1a]'}`}>{opt.label}</p>
                <p className={`text-xs mt-0.5 ${advanced.schedule_mode === opt.id ? 'text-white/60' : 'text-[#8a8a8a]'}`}>{opt.sub}</p>
              </button>
            ))}
          </div>
          {advanced.schedule_mode === 'schedule' && (
            <input type="datetime-local"
              value={advanced.schedule_start}
              min={new Date().toISOString().slice(0,16)}
              onChange={e => setAdvanced(a => ({ ...a, schedule_start: e.target.value }))}
              className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all
                ${!advanced.schedule_start ? 'border-orange-300 bg-orange-50' : 'border-[#ede7dc] bg-[#faf8f4] focus:border-[#1a1a1a]'}`} />
          )}
          {advanced.schedule_mode === 'schedule' && !advanced.schedule_start && (
            <p className="text-xs text-orange-500 mt-1.5 font-medium">⚠️ Please set a date and time</p>
          )}
        </Section>
      )}

      {/* ── STEP 7: Agent Settings ── */}
      {mode && (
        <Section label="7. Agent settings" done={!!advanced.persona_tone}>
          <div className="mb-5">
            <label className="block text-xs font-bold text-[#3d3d3d] uppercase tracking-wider mb-2">
              Agent Tone <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'friendly',     emoji: '😊', label: 'Friendly',    desc: 'Warm, approachable' },
                { id: 'professional', emoji: '💼', label: 'Professional', desc: 'Formal, structured' },
                { id: 'empathetic',   emoji: '🤝', label: 'Empathetic',  desc: 'Caring, patient' },
              ].map(t => (
                <button key={t.id}
                  onClick={() => setAdvanced(a => ({ ...a, persona_tone: t.id }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all
                    ${advanced.persona_tone === t.id
                      ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                      : 'border-[#ede7dc] hover:border-[#bbb] bg-white'}`}>
                  <span className="text-xl block mb-1">{t.emoji}</span>
                  <p className={`font-bold text-xs ${advanced.persona_tone === t.id ? 'text-white' : 'text-[#1a1a1a]'}`}>{t.label}</p>
                  <p className={`text-[10px] mt-0.5 ${advanced.persona_tone === t.id ? 'text-white/60' : 'text-[#aaa]'}`}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-[#6b6b6b] mb-1.5">Agent Name</label>
              <input value={advanced.persona_name}
                onChange={e => setAdvanced(a => ({ ...a, persona_name: e.target.value }))}
                placeholder="Priya"
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ccc]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b6b6b] mb-1.5">Simultaneous Calls</label>
              <input type="number" min={1} max={20} value={advanced.max_concurrent_calls}
                onChange={e => setAdvanced(a => ({ ...a, max_concurrent_calls: +e.target.value }))}
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ccc]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b6b6b] mb-1.5">Call From</label>
              <input type="time" value={advanced.calling_hours_start}
                onChange={e => setAdvanced(a => ({ ...a, calling_hours_start: e.target.value }))}
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ccc]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6b6b6b] mb-1.5">Call Until</label>
              <input type="time" value={advanced.calling_hours_end}
                onChange={e => setAdvanced(a => ({ ...a, calling_hours_end: e.target.value }))}
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ccc]" />
            </div>
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ede7dc' }}>
            <label className="block text-xs font-semibold text-[#6b6b6b] mb-1">
              📊 Save results to Google Sheet <span className="font-normal text-[#aaa]">(optional)</span>
            </label>
            <input value={advanced.google_sheet_url}
              onChange={e => setAdvanced(a => ({ ...a, google_sheet_url: e.target.value }))}
              className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ccc]"
              placeholder="https://docs.google.com/spreadsheets/d/..." />
            <p className="text-[11px] mt-1.5 text-[#aaa]">Paste your Google Sheet link — call results will be added as new rows after each call</p>
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ede7dc' }}>
            <label className="block text-xs font-semibold text-[#6b6b6b] mb-1">
              📡 Send results to your server <span className="font-normal text-[#aaa]">(optional)</span>
            </label>
            <input value={advanced.webhook_url}
              onChange={e => setAdvanced(a => ({ ...a, webhook_url: e.target.value }))}
              className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ccc] mb-2"
              placeholder="https://yourserver.com/api/call-results" />
            {advanced.webhook_url && (
              <input value={advanced.webhook_secret}
                onChange={e => setAdvanced(a => ({ ...a, webhook_secret: e.target.value }))}
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#ccc]"
                placeholder="Webhook secret (optional — for signature verification)"
                type="password" />
            )}
            <p className="text-[11px] mt-1.5 text-[#aaa]">We POST call results here after every call ends — outcome, duration, collected data</p>
          </div>
        </Section>
      )}

      {/* ── LAUNCH BUTTON ── */}
      {mode && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-[#ede7dc] z-50">
          <div className="max-w-2xl mx-auto">
            {!canLaunch ? (
              <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f5f5] rounded-2xl">
                <div className="flex gap-1">
                  {[
                    !!campaignName.trim(),
                    !!mode,
                    !!contactFile,
                    mode === 'survey' ? scriptReady : message.trim().length > 10,
                    advanced.schedule_mode === 'now' || !!advanced.schedule_start,
                    !!advanced.persona_tone,
                  ].map((done, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${done ? 'bg-[#228248]' : 'bg-[#ddd]'}`} />
                  ))}
                </div>
                <p className="text-sm text-[#8a8a8a]">
                  {!campaignName.trim()                                    ? 'Give your campaign a name (Step 1)'
                    : !mode                                                ? 'Choose what kind of call to make'
                    : !contactFile                                         ? 'Upload your contact list'
                    : mode === 'survey' && !scriptReady                   ? 'Add your question script (Step 5)'
                    : !message.trim() && mode !== 'survey'                ? 'Write your message'
                    : advanced.schedule_mode === 'schedule' && !advanced.schedule_start ? 'Set a schedule date & time'
                    : !advanced.persona_tone                               ? 'Choose agent tone (Step 7)'
                    : 'Almost there!'}
                </p>
              </div>
            ) : (
              <button onClick={handleLaunch} disabled={loading}
                className="w-full py-4 bg-[#1a1a1a] hover:bg-[#2c2c2c] active:scale-[0.98] text-white rounded-2xl font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-xl">
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Starting calls...</>
                ) : (
                  <>🚀 Launch Campaign{contactFile && <span className="text-sm font-normal opacity-70">→ {contactFile.name}</span>}</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ label, done, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-[#228248]' : 'bg-[#e8e0d5]'}`}>
          {done ? (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#bbb]" />
          )}
        </div>
        <h3 className="text-sm font-bold text-[#3d3d3d] uppercase tracking-wide">{label}</h3>
      </div>
      {children}
    </div>
  )
}
