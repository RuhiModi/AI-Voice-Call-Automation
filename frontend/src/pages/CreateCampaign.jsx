import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { campaignApi } from '../hooks/api'

// ── Campaign "modes" — plain language, no tech jargon ─────────
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

// ── Extract {{variable}} names from template ──────────────────
function extractVars(text) {
  if (!text) return []
  return [...new Set([...text.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()))]
}

// ── Parse CSV/Excel headers to detect column names ────────────
function parseHeaders(text) {
  const firstLine = text.split('\n')[0]
  return firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '')).filter(Boolean)
}

export default function CreateCampaign() {
  const navigate  = useNavigate()
  const fileRef   = useRef(null)
  const pdfRef    = useRef(null)

  const [mode,         setMode]         = useState(null)        // 'announcement' | 'survey' | 'reminder'
  const [lang,         setLang]         = useState('gu')
  const [message,      setMessage]      = useState('')          // announcement template
  const [pdfFile,      setPdfFile]      = useState(null)        // survey PDF
  const [contactFile,  setContactFile]  = useState(null)        // Excel/CSV
  const [contactCols,  setContactCols]  = useState([])          // detected column names
  const [contactCount, setContactCount] = useState(0)
  const [previewRow,   setPreviewRow]   = useState(null)        // first row for preview
  const [loading,      setLoading]      = useState(false)
  const [launched,     setLaunched]     = useState(false)
  const [campaignId,   setCampaignId]   = useState(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [advanced, setAdvanced] = useState({
    persona_name:         'Priya',
    persona_tone:         'friendly',
    max_concurrent_calls: 3,
    calling_hours_start:  '09:00',
    calling_hours_end:    '21:00',
    max_retries:          2,
    schedule_mode:        'now',    // 'now' | 'schedule'
    schedule_start:       '',
  })

  const selectedMode = MODES.find(m => m.id === mode)
  const templateVars = extractVars(message)
  const missingCols  = templateVars.filter(v =>
    !contactCols.some(c => c.toLowerCase().replace(/[\s_-]/g, '') === v.toLowerCase().replace(/[\s_-]/g, ''))
  )

  // ── Insert variable into message at cursor ────────────────
  const msgRef = useRef(null)
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

  // ── Preview first contact in message ─────────────────────
  function buildPreview() {
    if (!message || !previewRow) return null
    let preview = message
    for (const [col, val] of Object.entries(previewRow)) {
      preview = preview.replace(new RegExp(`\\{\\{\\s*${col}\\s*\\}\\}`, 'gi'), val)
    }
    return preview
  }

  // ── Handle contact file upload ────────────────────────────
  const handleContactFile = useCallback(async (file) => {
    if (!file) return
    setContactFile(file)

    // Read first few rows to detect columns + preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 1) return

      const headers = parseHeaders(lines[0])
      setContactCols(headers)

      // Build preview row from first data row
      if (lines.length > 1) {
        const vals = lines[1].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row = {}
        headers.forEach((h, i) => { row[h] = vals[i] || '' })
        setPreviewRow(row)
      }
    }
    // Only works for CSV — for Excel show col count
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      // Excel: show filename, actual parsing happens server-side
      setContactCols([])
      setPreviewRow(null)
    }
  }, [])

  // ── LAUNCH ────────────────────────────────────────────────
  async function handleLaunch() {
    if (!mode)    { toast.error('Please choose what kind of call to make'); return }
    if (!contactFile) { toast.error('Please upload a contact file'); return }
    if (mode === 'announcement' && !message.trim()) {
      toast.error('Please write your message'); return
    }
    if (mode === 'survey' && !pdfFile) {
      toast.error('Please upload the question PDF'); return
    }
    if (advanced.schedule_mode === 'schedule' && !advanced.schedule_start) {
      toast.error('Please set when to start calls'); return
    }

    setLoading(true)
    try {
      // 1. Create campaign
      const autoName = `${selectedMode.title} — ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}`
      const payload = {
        name:                 autoName,
        campaign_type:        mode,
        language_priority:    lang,
        script_type:          mode === 'survey' ? 'pdf' : 'manual',
        script_content:       mode === 'announcement' ? message : '',
        announcement_template: mode === 'announcement' ? message : null,
        persona_name:         advanced.persona_name,
        persona_tone:         advanced.persona_tone,
        max_concurrent_calls: advanced.max_concurrent_calls,
        calling_hours_start:  advanced.calling_hours_start,
        calling_hours_end:    advanced.calling_hours_end,
        max_retries:          advanced.max_retries,
        schedule_start:       advanced.schedule_mode === 'schedule' ? advanced.schedule_start : null,
        status:               'draft',
      }

      const res = await campaignApi.create(payload)
      const id  = res.data.campaign.id
      setCampaignId(id)

      // 2. Upload PDF script (survey) — triggers flow_config parsing
      if (mode === 'survey' && pdfFile) {
        try {
          await campaignApi.extractFromPDF(id, pdfFile)
        } catch (e) {
          console.warn('PDF parse non-fatal:', e.message)
        }
      }

      // 3. Upload contacts
      const contactRes = await campaignApi.uploadContacts(id, contactFile)
      setContactCount(contactRes.data.count)

      // 4. Launch
      await campaignApi.launch(id)

      setLaunched(true)
      toast.success(`🚀 ${contactRes.data.count} calls starting now!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Drag and drop ──────────────────────────────────────────
  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleContactFile(file)
  }

  // ── SUCCESS SCREEN ─────────────────────────────────────────
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
            <button onClick={() => { setLaunched(false); setMode(null); setMessage(''); setContactFile(null); setContactCols([]); setPreviewRow(null); setPdfFile(null) }}
              className="w-full py-3.5 border-2 border-[#e0d9ce] text-[#525252] rounded-2xl font-semibold text-sm">
              Create Another Campaign
            </button>
          </div>
        </div>
      </div>
    )
  }

  const preview = buildPreview()
  const canLaunch = mode && contactFile && advanced.persona_tone &&
    (advanced.schedule_mode === 'now' || !!advanced.schedule_start) &&
    (mode === 'survey' ? !!pdfFile : !!message.trim())

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-1">New Campaign</h1>
        <p className="text-[#8a8a8a] text-sm">Set up and launch in under 2 minutes</p>
      </div>

      {/* ── STEP 1: Mode ─────────────────────────────────────── */}
      <Section label="1. What do you want to do?" done={!!mode}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 group
                ${mode === m.id
                  ? 'border-[#1a1a1a] bg-[#1a1a1a] shadow-lg scale-[1.02]'
                  : 'border-[#ede7dc] bg-white hover:border-[#ccc] hover:shadow-sm'}`}>
              <div className="text-3xl mb-3">{m.emoji}</div>
              <p className={`font-bold text-sm mb-1 ${mode === m.id ? 'text-white' : 'text-[#1a1a1a]'}`}>
                {m.title}
              </p>
              <p className={`text-xs leading-relaxed ${mode === m.id ? 'text-white/70' : 'text-[#8a8a8a]'}`}>
                {m.subtitle}
              </p>
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
              <span key={ex} className="text-xs px-3 py-1 rounded-full border border-[#e8e0d5] text-[#6b6b6b] bg-[#faf8f4]">
                {ex}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* ── STEP 2: Language ──────────────────────────────────── */}
      {mode && (
        <Section label="2. Language" done={true}>
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all
                  ${lang === l.code
                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                    : 'border-[#ede7dc] text-[#525252] hover:border-[#bbb]'}`}>
                {l.label}
                <span className={`block text-[10px] font-normal mt-0.5 ${lang === l.code ? 'text-white/60' : 'text-[#aaa]'}`}>
                  {l.full}
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── STEP 3: Contact File ──────────────────────────────── */}
      {mode && (
        <Section label="3. Upload your contact list" done={!!contactFile}>
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
                  {contactCols.length > 0 ? (
                    <p className="text-xs text-[#228248] mt-1">
                      Columns found: <span className="font-semibold">{contactCols.join(', ')}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-[#228248] mt-1">File ready — contacts will be processed on launch</p>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); setContactFile(null); setContactCols([]); setPreviewRow(null) }}
                  className="w-7 h-7 rounded-full bg-[#e0f0e8] flex items-center justify-center text-[#228248] hover:bg-[#228248] hover:text-white transition-all flex-shrink-0">
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-3">📎</div>
                <p className="font-semibold text-[#3d3d3d] text-sm mb-1">
                  Drop your Excel or CSV file here
                </p>
                <p className="text-xs text-[#8a8a8a]">
                  Must have a <strong>phone</strong> column + any other info (name, route, timing...)
                </p>
                <p className="text-xs text-[#bbb] mt-2">or click to browse</p>
              </div>
            )}
          </div>

          {/* Column chips */}
          {contactCols.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {contactCols.map(col => (
                <span key={col}
                  className="text-xs px-2.5 py-1 bg-white border border-[#e0d9ce] rounded-full text-[#525252] font-mono">
                  {col}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── STEP 4a: Message (Announcement / Reminder) ─────────── */}
      {mode && mode !== 'survey' && (
        <Section label="4. Write your message" done={message.trim().length > 10}>

          {/* Variable insert buttons — only if columns detected */}
          {contactCols.filter(c => c.toLowerCase() !== 'phone' && c.toLowerCase() !== 'mobile').length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[#8a8a8a] mb-2">
                Tap a column name to insert it into your message ↓
              </p>
              <div className="flex flex-wrap gap-2">
                {contactCols
                  .filter(c => c.toLowerCase() !== 'phone' && c.toLowerCase() !== 'mobile')
                  .map(col => (
                    <button key={col} onClick={() => insertVar(col)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fff9ee] border border-[#fde59a] text-[#8f540f] rounded-full text-xs font-semibold hover:bg-[#fde59a] transition-all">
                      <span className="text-[10px] opacity-60">{'{{'}</span>
                      {col}
                      <span className="text-[10px] opacity-60">{'}}'}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <textarea ref={msgRef}
            value={message} onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder={
              lang === 'gu'
                ? 'નમસ્તે {{Name}}, આપનો રૂટ {{Route}} છે, સમય {{Timing}} છે. સમજ્યા?'
                : lang === 'hi'
                  ? 'नमस्ते {{Name}}, आपका रूट {{Route}} है, समय {{Timing}} है। समझे?'
                  : 'Hello {{Name}}, your route is {{Route}} at {{Timing}}. Got it?'
            }
            className="w-full bg-white border-2 border-[#ede7dc] focus:border-[#1a1a1a] rounded-2xl px-4 py-3.5 text-sm text-[#2c2c2c] placeholder-[#c0b8ae] resize-none outline-none transition-all leading-relaxed font-mono" />

          {/* Warning: variable in message but not in file */}
          {missingCols.length > 0 && (
            <div className="mt-2 p-3 bg-[#fff5f0] border border-[#ffc0a0] rounded-xl">
              <p className="text-xs text-[#c0440f] font-semibold">
                ⚠️ These variables are not in your contact file:
                {' '}<span className="font-mono">{missingCols.map(v => `{{${v}}}`).join(', ')}</span>
              </p>
              <p className="text-xs text-[#c0440f] mt-0.5">
                Add these columns to your file or fix the spelling.
              </p>
            </div>
          )}

          {/* Live preview */}
          {preview && missingCols.length === 0 && (
            <div className="mt-3 p-4 bg-[#f0faf4] border border-[#b8e6cb] rounded-2xl">
              <p className="text-xs font-semibold text-[#228248] mb-2 uppercase tracking-wide">
                Preview — first contact
              </p>
              <p className="text-sm text-[#1c673a] leading-relaxed">{preview}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── STEP 4b: PDF Upload (Survey) ─────────────────────── */}
      {mode === 'survey' && (
        <Section label="4. Upload your question script (PDF)" done={!!pdfFile}>
          <div
            onClick={() => !pdfFile && pdfRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl transition-all
              ${pdfFile
                ? 'border-[#228248] bg-[#f0faf4] p-4 cursor-default'
                : 'border-[#e0d9ce] hover:border-[#bbb] bg-[#faf8f4] p-8 cursor-pointer'}`}>

            <input ref={pdfRef} type="file" accept=".pdf"
              onChange={e => setPdfFile(e.target.files[0])} className="hidden" />

            {pdfFile ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#228248] rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📄</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1c673a] text-sm">{pdfFile.name}</p>
                  <p className="text-xs text-[#228248] mt-0.5">Script will be parsed automatically</p>
                </div>
                <button onClick={() => setPdfFile(null)}
                  className="w-7 h-7 rounded-full bg-[#e0f0e8] flex items-center justify-center text-[#228248] hover:bg-[#228248] hover:text-white transition-all">
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-3">📄</div>
                <p className="font-semibold text-[#3d3d3d] text-sm mb-1">Upload your PDF script</p>
                <p className="text-xs text-[#8a8a8a]">The AI will follow this script exactly — no LLM guessing</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── STEP 5: Schedule — MANDATORY ─────────────────────── */}
      {mode && (
        <Section label="5. When to start calling?" done={advanced.schedule_mode === 'now' || !!advanced.schedule_start}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { id: 'now',      emoji: '⚡', label: 'Start Now',    sub: 'Calls begin immediately' },
              { id: 'schedule', emoji: '📅', label: 'Schedule',     sub: 'Pick a date & time' },
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

      {/* ── STEP 6: Agent Settings — VISIBLE, MANDATORY tone ──── */}
      {mode && (
        <Section label="6. Agent settings" done={!!advanced.persona_tone}>
          {/* Tone — mandatory */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-[#3d3d3d] uppercase tracking-wider mb-2">
              Agent Tone <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'friendly',     emoji: '😊', label: 'Friendly',     desc: 'Warm, approachable' },
                { id: 'professional', emoji: '💼', label: 'Professional',  desc: 'Formal, structured' },
                { id: 'empathetic',   emoji: '🤝', label: 'Empathetic',   desc: 'Caring, patient' },
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

          {/* Agent name + calling window */}
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
        </Section>
      )}

      {/* ── LAUNCH BUTTON — sticky bottom ────────────────────── */}
      {mode && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-[#ede7dc] z-50">
          <div className="max-w-2xl mx-auto">
            {!canLaunch ? (
              <div className="flex items-center gap-3 px-5 py-4 bg-[#f5f5f5] rounded-2xl">
                <div className="flex gap-1">
                  {[
                    !!mode,
                    !!contactFile,
                    mode === 'survey' ? !!pdfFile : message.trim().length > 10,
                    advanced.schedule_mode === 'now' || !!advanced.schedule_start,
                    !!advanced.persona_tone,
                  ].map((done, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${done ? 'bg-[#228248]' : 'bg-[#ddd]'}`} />
                  ))}
                </div>
                <p className="text-sm text-[#8a8a8a]">
                  {!mode ? 'Choose what kind of call to make'
                    : !contactFile ? 'Upload your contact list'
                    : mode === 'survey' && !pdfFile ? 'Upload your question PDF'
                    : !message.trim() && mode !== 'survey' ? 'Write your message'
                    : advanced.schedule_mode === 'schedule' && !advanced.schedule_start ? 'Set a schedule date & time'
                    : !advanced.persona_tone ? 'Choose agent tone (Step 6)'
                    : 'Almost there!'}
                </p>
              </div>
            ) : (
              <button onClick={handleLaunch} disabled={loading}
                className="w-full py-4 bg-[#1a1a1a] hover:bg-[#2c2c2c] active:scale-[0.98] text-white rounded-2xl font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-xl">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting calls...
                  </>
                ) : (
                  <>
                    🚀 Launch Campaign
                    {contactFile && (
                      <span className="text-sm font-normal opacity-70">→ {contactFile.name}</span>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Section wrapper component ─────────────────────────────────
function Section({ label, done, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
          ${done ? 'bg-[#228248]' : 'bg-[#e8e0d5]'}`}>
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
