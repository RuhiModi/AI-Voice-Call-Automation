import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { campaignApi } from '../hooks/api'
import { ChevronRight, ChevronLeft, Upload, Link2, FileText, Check, Plus, X, Rocket, Users, Bot, Phone, Calendar } from 'lucide-react'

const STEPS = [
  { id: 0, label: 'Basic Info', icon: Phone },
  { id: 1, label: 'Script',     icon: FileText },
  { id: 2, label: 'AI Config',  icon: Bot },
  { id: 3, label: 'Contacts',   icon: Users },
  { id: 4, label: 'Launch',     icon: Rocket },
]

const LANG_OPTIONS = [
  { code: 'gu', label: 'ગુજરાતી', sublabel: 'Gujarati', flag: '🟠' },
  { code: 'hi', label: 'हिंदी',   sublabel: 'Hindi',    flag: '🟢' },
  { code: 'en', label: 'English', sublabel: 'English',  flag: '🔵' },
]

const CAMPAIGN_TYPES = [
  { type: 'reminder',  emoji: '⏰', label: 'Reminder',         desc: 'Appointments, deadlines, updates' },
  { type: 'survey',    emoji: '📋', label: 'Survey',           desc: 'Feedback, satisfaction, NPS' },
  { type: 'political', emoji: '🏛️', label: 'Political/Scheme', desc: 'Verify beneficiaries, scheme status' },
  { type: 'custom',    emoji: '✨', label: 'Custom',           desc: 'Any other use case' },
]

const TONES = [
  { value: 'friendly',     label: '😊 Friendly',     desc: 'Warm and approachable' },
  { value: 'formal',       label: '👔 Formal',       desc: 'Professional and structured' },
  { value: 'professional', label: '💼 Professional', desc: 'Business-like tone' },
]

export default function CreateCampaign() {
  const navigate = useNavigate()
  const [step,         setStep]         = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [campaignId,   setCampaignId]   = useState(null)   // Real DB id once saved
  const [csvFile,      setCsvFile]      = useState(null)
  const [pdfFile,      setPdfFile]      = useState(null)
  const [urlInput,     setUrlInput]     = useState('')
  const [fieldInput,   setFieldInput]   = useState('')
  const [contactCount, setContactCount] = useState(0)

  const [form, setForm] = useState({
    name:                  '',
    description:           '',
    campaign_type:         'reminder',
    language_priority:     'gu',
    script_type:           'manual',
    script_content:        '',
    persona_name:          'Priya',
    persona_tone:          'friendly',
    data_fields:           [],
    caller_id:             '',
    max_concurrent_calls:  5,
    max_retries:           2,
    retry_gap_minutes:     30,
    calling_hours_start:   '09:00',
    calling_hours_end:     '21:00',
    google_sheet_url:      '',
    google_sheet_id:       '',
    schedule_start:        '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // Save as draft and return the campaign id
  async function saveDraft() {
    if (!form.name) { toast.error('Campaign name is required'); return null }
    if (campaignId) return campaignId   // Already saved
    try {
      const res = await campaignApi.create({ ...form, status: 'draft' })
      const id  = res.data.campaign.id
      setCampaignId(id)
      toast.success('Campaign saved!')
      return id
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save campaign')
      return null
    }
  }

  async function handleExtract() {
    setLoading(true)
    try {
      const id = campaignId || await saveDraft()
      if (!id) return
      let text = ''
      if (form.script_type === 'pdf' && pdfFile) {
        const res = await campaignApi.extractFromPDF(id, pdfFile)
        text = res.data.text
      } else if (form.script_type === 'url' && urlInput) {
        const res = await campaignApi.extractFromURL(id, urlInput)
        text = res.data.text
      }
      set('script_content', text)
      toast.success('Script extracted!')
    } catch (err) {
      toast.error('Extraction failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadContacts() {
    if (!csvFile) return
    setLoading(true)
    try {
      const id = campaignId || await saveDraft()
      if (!id) return
      const res = await campaignApi.uploadContacts(id, csvFile)
      setContactCount(res.data.count)
      toast.success(`${res.data.count} contacts imported!`)
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleLaunch() {
    if (!form.name) { toast.error('Campaign name required'); return }
    setLoading(true)
    try {
      let id = campaignId
      if (!id) {
        const res = await campaignApi.create(form)
        id = res.data.campaign.id
        setCampaignId(id)
      } else {
        await campaignApi.update(id, form)
      }
      // Launch — sets status to 'active' in DB
      // Note: actual calls won't happen until Vobiz key is added
      await campaignApi.launch(id)
      toast.success('Campaign launched! 🚀')
      navigate(`/dashboard/campaigns/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Launch failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleNext() {
    if (step === 0) {
      if (!form.name) { toast.error('Campaign name is required'); return }
      setLoading(true)
      const id = await saveDraft()
      setLoading(false)
      if (!id) return
    }
    if (step === 4) { await handleLaunch(); return }
    setStep(s => s + 1)
  }

  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto animate-fade-in">

      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-[#1a1a1a] mb-1">Create Campaign</h1>
        <p className="text-[#8a8a8a] text-sm">Set up your AI voice calling campaign</p>
        {campaignId && (
          <p className="text-xs text-[#228248] mt-1">✅ Saved to database · ID: {campaignId.slice(0,8)}...</p>
        )}
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const Icon   = s.icon
            const done   = i < step
            const active = i === step
            return (
              <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                    ${done   ? 'bg-[#f0faf4] text-[#1c673a] cursor-pointer hover:bg-jade-100' :
                      active ? 'bg-[#1a1a1a] text-white shadow-sm' :
                               'bg-white border border-[#ede7dc] text-[#8a8a8a] cursor-not-allowed'}`}>
                  {done ? <Check size={13} /> : <Icon size={13} />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight size={14} className={done ? 'text-jade-400' : 'text-[#c4c4c4]'} />}
              </div>
            )
          })}
        </div>
        <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#f5a623] to-[#e08c10] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#ede7dc] p-7 mb-6">

        {/* STEP 0 — Basic Info */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">Campaign Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Bus Driver Reminder — Jan 2025"
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] placeholder-navy-300 focus:border-[#cfc6b9] focus:outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="What is this campaign about? (optional)"
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] placeholder-navy-300 focus:border-[#cfc6b9] focus:outline-none resize-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-3">Primary Language</label>
              <div className="grid grid-cols-3 gap-3">
                {LANG_OPTIONS.map(l => (
                  <button key={l.code} onClick={() => set('language_priority', l.code)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all
                      ${form.language_priority === l.code ? 'border-navy-600 bg-[#faf8f4] shadow-sm' : 'border-[#ede7dc] hover:border-[#e0d9ce]'}`}>
                    <span className="text-2xl mb-2">{l.flag}</span>
                    <span className={`font-display font-bold text-sm ${form.language_priority === l.code ? 'text-[#1a1a1a]' : 'text-[#525252]'}`}>{l.label}</span>
                    <span className="text-[11px] text-[#8a8a8a] mt-0.5">{l.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-3">Campaign Type</label>
              <div className="grid grid-cols-2 gap-3">
                {CAMPAIGN_TYPES.map(t => (
                  <button key={t.type} onClick={() => set('campaign_type', t.type)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                      ${form.campaign_type === t.type ? 'border-navy-600 bg-[#faf8f4]' : 'border-[#ede7dc] hover:border-[#e0d9ce]'}`}>
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className={`font-semibold text-sm ${form.campaign_type === t.type ? 'text-[#1a1a1a]' : 'text-[#3d3d3d]'}`}>{t.label}</p>
                      <p className="text-[11px] text-[#8a8a8a] mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 — Script */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-3">Script Source</label>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { type: 'manual', icon: FileText, label: 'Write Script' },
                  { type: 'pdf',    icon: Upload,   label: 'Upload PDF' },
                  { type: 'url',    icon: Link2,    label: 'From URL' },
                ].map(s => (
                  <button key={s.type} onClick={() => set('script_type', s.type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                      ${form.script_type === s.type ? 'border-navy-600 bg-[#faf8f4]' : 'border-[#ede7dc] hover:border-[#e0d9ce]'}`}>
                    <s.icon size={20} className={form.script_type === s.type ? 'text-[#3d3d3d]' : 'text-[#8a8a8a]'} />
                    <span className={`text-xs font-semibold ${form.script_type === s.type ? 'text-[#2c2c2c]' : 'text-[#6b6b6b]'}`}>{s.label}</span>
                  </button>
                ))}
              </div>
              {form.script_type === 'pdf' && (
                <div className="flex items-center gap-3 mb-4">
                  <label className="flex-1 flex items-center gap-3 border-2 border-dashed border-[#e0d9ce] hover:border-[#cfc6b9] rounded-xl px-4 py-3 cursor-pointer transition-all">
                    <Upload size={16} className="text-[#8a8a8a]" />
                    <span className="text-sm text-[#6b6b6b]">{pdfFile ? pdfFile.name : 'Click to upload PDF'}</span>
                    <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} className="hidden" />
                  </label>
                  {pdfFile && (
                    <button onClick={handleExtract} disabled={loading}
                      className="px-4 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-semibold hover:bg-[#2c2c2c] disabled:opacity-50 whitespace-nowrap">
                      {loading ? '...' : 'Extract'}
                    </button>
                  )}
                </div>
              )}
              {form.script_type === 'url' && (
                <div className="flex gap-3 mb-4">
                  <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/scheme-details"
                    className="flex-1 bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] placeholder-navy-300 focus:border-[#cfc6b9] focus:outline-none" />
                  <button onClick={handleExtract} disabled={loading || !urlInput}
                    className="px-5 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-semibold hover:bg-[#2c2c2c] disabled:opacity-50">
                    {loading ? '...' : 'Fetch'}
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">
                Campaign Script
                <span className="text-[#a8a8a8] normal-case font-normal ml-2">Use {`{{name}}`}, {`{{bus_time}}`} for variables</span>
              </label>
              <textarea value={form.script_content} onChange={e => set('script_content', e.target.value)}
                rows={9}
                placeholder={`Write your call script here.\n\n• "Hello {{name}}! Your appointment is at {{time}}. Please confirm."\n\n• "નમસ્તે {{name}} ભાઈ! {{scheme_name}} scheme વિષે વાત કરવી છે."\n\nThe AI uses this as context and conversation guide.`}
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#3d3d3d] placeholder-navy-300 font-mono leading-relaxed resize-none focus:border-[#cfc6b9] focus:outline-none transition-all" />
              <p className="text-xs text-[#8a8a8a] mt-2">{form.script_content.length} characters</p>
            </div>
          </div>
        )}

        {/* STEP 2 — AI Config */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">Agent Name</label>
                <input value={form.persona_name} onChange={e => set('persona_name', e.target.value)}
                  placeholder="Priya"
                  className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] placeholder-navy-300 focus:border-[#cfc6b9] focus:outline-none" />
                <p className="text-xs text-[#8a8a8a] mt-1">Name used in greeting</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">Caller ID</label>
                <input value={form.caller_id} onChange={e => set('caller_id', e.target.value)}
                  placeholder="+917900000001"
                  className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] placeholder-navy-300 focus:border-[#cfc6b9] focus:outline-none" />
                <p className="text-xs text-[#8a8a8a] mt-1">Your registered number</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-3">Agent Tone</label>
              <div className="grid grid-cols-3 gap-3">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => set('persona_tone', t.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all
                      ${form.persona_tone === t.value ? 'border-navy-600 bg-[#faf8f4]' : 'border-[#ede7dc] hover:border-[#e0d9ce]'}`}>
                    <p className={`font-semibold text-sm mb-1 ${form.persona_tone === t.value ? 'text-[#1a1a1a]' : 'text-[#3d3d3d]'}`}>{t.label}</p>
                    <p className="text-[11px] text-[#8a8a8a]">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">
                Data Fields to Collect
                <span className="text-[#a8a8a8] normal-case font-normal ml-2">What should AI ask and record?</span>
              </label>
              <div className="flex gap-2 mb-3">
                <input value={fieldInput} onChange={e => setFieldInput(e.target.value)}
                  placeholder="e.g. scheme_status, availability, feedback"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && fieldInput.trim()) {
                      set('data_fields', [...form.data_fields, fieldInput.trim()])
                      setFieldInput('')
                    }
                  }}
                  className="flex-1 bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] placeholder-navy-300 focus:border-[#cfc6b9] focus:outline-none" />
                <button onClick={() => { if (fieldInput.trim()) { set('data_fields', [...form.data_fields, fieldInput.trim()]); setFieldInput('') }}}
                  className="w-11 h-11 bg-[#1a1a1a] text-white rounded-xl flex items-center justify-center hover:bg-[#2c2c2c] flex-shrink-0">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.data_fields.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-[#f0f0f0] text-[#3d3d3d] px-3 py-1.5 rounded-xl text-xs font-semibold">
                    {f}
                    <button onClick={() => set('data_fields', form.data_fields.filter((_, j) => j !== i))} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {form.data_fields.length === 0 && <p className="text-xs text-[#a8a8a8] italic">Press Enter to add a field</p>}
              </div>
            </div>

            <div className="p-4 bg-[#faf8f4] rounded-xl border border-[#ede7dc]">
              <p className="text-xs font-bold text-[#525252] uppercase tracking-wide mb-2">Auto-behaviors (always on)</p>
              {['✅ Auto-detect language (gu/hi/en)', '✅ Reschedule if user is busy', '✅ Transfer to human on request', '✅ Mark DNC if user says "stop calling"'].map(b => (
                <p key={b} className="text-xs text-[#6b6b6b] mb-1">{b}</p>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — Contacts */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="p-4 bg-[#fffbf0] border border-[#fde59a] rounded-xl">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-2">📋 CSV Format</p>
              <div className="bg-white rounded-xl p-3 font-mono text-xs text-[#3d3d3d] leading-relaxed">
                <p className="text-[#8a8a8a] mb-1"># Required column: phone</p>
                <p className="font-semibold">phone,name,bus_number,departure_time</p>
                <p>9876543210,Rajesh Patel,Bus 47,6:30 AM</p>
                <p>9876543211,Suresh Kumar,Bus 12,7:00 AM</p>
              </div>
              <p className="text-xs text-[#8f540f] mt-2">Column names must match script variables e.g. {`{{name}}`} → column "name"</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">Upload Contacts CSV</label>
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#e0d9ce] hover:border-[#cfc6b9] rounded-xl p-8 cursor-pointer transition-all group">
                <div className="w-12 h-12 bg-[#faf8f4] group-hover:bg-[#f0f0f0] rounded-xl flex items-center justify-center transition-colors">
                  <Upload size={22} className="text-[#8a8a8a] group-hover:text-[#525252]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#3d3d3d]">{csvFile ? csvFile.name : 'Click to upload CSV'}</p>
                  <p className="text-xs text-[#8a8a8a] mt-1">.csv files only</p>
                </div>
                <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files[0])} className="hidden" />
              </label>
              {csvFile && (
                <button onClick={handleUploadContacts} disabled={loading}
                  className="w-full mt-3 py-3 bg-[#228248] hover:bg-[#f0faf4]0 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Uploading...' : <><Upload size={15} /> Upload {csvFile.name}</>}
                </button>
              )}
              {contactCount > 0 && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-[#f0faf4] border border-[#b8e6cb] rounded-xl">
                  <Check size={16} className="text-[#228248]" />
                  <span className="text-sm font-semibold text-[#1c673a]">{contactCount} contacts imported to database!</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-2">
                Google Sheets Output (optional)
              </label>
              <input value={form.google_sheet_url} onChange={e => {
                set('google_sheet_url', e.target.value)
                const match = e.target.value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
                if (match) set('google_sheet_id', match[1])
              }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] placeholder-navy-300 focus:border-[#cfc6b9] focus:outline-none" />
              {form.google_sheet_id && (
                <p className="text-xs text-[#228248] mt-1">✅ Sheet ID: {form.google_sheet_id.substring(0, 20)}...</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 4 — Launch */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="p-5 bg-gradient-to-br from-navy-50 to-white rounded-xl border border-[#ede7dc]">
              <p className="text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-4">Campaign Summary</p>
              <div className="space-y-3">
                {[
                  { label: 'Campaign',  value: form.name },
                  { label: 'Language',  value: form.language_priority === 'gu' ? '🟠 Gujarati' : form.language_priority === 'hi' ? '🟢 Hindi' : '🔵 English' },
                  { label: 'Agent',     value: `${form.persona_name} (${form.persona_tone})` },
                  { label: 'Type',      value: form.campaign_type },
                  { label: 'Contacts',  value: contactCount > 0 ? `${contactCount} imported ✅` : '⚠️ No contacts yet — upload CSV first' },
                  { label: 'DB Status', value: campaignId ? `Saved ✅ (${campaignId.slice(0,8)}...)` : 'Will save on launch' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-[#8a8a8a] w-24 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-[#3d3d3d] flex-1">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#6b6b6b] uppercase tracking-wider mb-3">Calling Configuration</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#6b6b6b] mb-1.5">Concurrent Calls</label>
                  <input type="number" value={form.max_concurrent_calls} min={1} max={20}
                    onChange={e => set('max_concurrent_calls', parseInt(e.target.value))}
                    className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] focus:border-[#cfc6b9] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#6b6b6b] mb-1.5">Max Retries</label>
                  <input type="number" value={form.max_retries} min={0} max={5}
                    onChange={e => set('max_retries', parseInt(e.target.value))}
                    className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] focus:border-[#cfc6b9] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#6b6b6b] mb-1.5">Start Time</label>
                  <input type="time" value={form.calling_hours_start}
                    onChange={e => set('calling_hours_start', e.target.value)}
                    className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] focus:border-[#cfc6b9] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-[#6b6b6b] mb-1.5">End Time</label>
                  <input type="time" value={form.calling_hours_end}
                    onChange={e => set('calling_hours_end', e.target.value)}
                    className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] focus:border-[#cfc6b9] focus:outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#6b6b6b] mb-1.5">
                <Calendar size={12} className="inline mr-1" />
                Schedule Start (leave blank to launch immediately)
              </label>
              <input type="datetime-local" value={form.schedule_start}
                onChange={e => set('schedule_start', e.target.value)}
                className="w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] focus:border-[#cfc6b9] focus:outline-none" />
            </div>

            {contactCount === 0 && (
              <div className="p-4 bg-[#fffbf0] border border-[#fde59a] rounded-xl">
                <p className="text-xs text-[#8f540f] font-semibold">⚠️ No contacts uploaded yet</p>
                <p className="text-xs text-[#b86f0e] mt-1">Go back to Step 3 and upload a CSV file. Campaign will launch but won't call anyone without contacts.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-2 px-5 py-3 border-2 border-[#e0d9ce] hover:border-[#cfc6b9] rounded-xl text-sm font-semibold text-[#525252] hover:text-[#2c2c2c] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={handleNext} disabled={loading}
          className={`flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-lg
            ${step === 4 ? 'bg-gradient-to-r from-jade-600 to-navy-600 hover:shadow-jade-200' : 'bg-[#1a1a1a] hover:bg-[#2c2c2c] hover:shadow-navy-200'}`}>
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Please wait...</>
            : step === 4
              ? <><Rocket size={16} /> Launch Campaign</>
              : <>Next <ChevronRight size={16} /></>
          }
        </button>
      </div>
    </div>
  )
}
