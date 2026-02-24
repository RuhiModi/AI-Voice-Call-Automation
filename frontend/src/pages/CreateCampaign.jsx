import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { campaignApi } from '../hooks/useApi'
import {
  ChevronRight, ChevronLeft, Upload, Link2, FileText,
  Check, Plus, X, Rocket, Users, Bot, Phone, Calendar
} from 'lucide-react'

const STEPS = [
  { id: 0, label: 'Basic Info', icon: Phone },
  { id: 1, label: 'Script', icon: FileText },
  { id: 2, label: 'AI Config', icon: Bot },
  { id: 3, label: 'Contacts', icon: Users },
  { id: 4, label: 'Launch', icon: Rocket },
]

const LANG_OPTIONS = [
  { code: 'gu', label: 'ગુજરાતી', sublabel: 'Gujarati', flag: '🟠', desc: 'Default — AI starts in Gujarati' },
  { code: 'hi', label: 'हिंदी', sublabel: 'Hindi', flag: '🟢', desc: 'AI starts in Hindi' },
  { code: 'en', label: 'English', sublabel: 'English', flag: '🔵', desc: 'AI starts in English' },
]

const CAMPAIGN_TYPES = [
  { type: 'reminder', emoji: '⏰', label: 'Reminder', desc: 'Bus times, appointments, deadlines' },
  { type: 'survey', emoji: '📋', label: 'Survey', desc: 'Feedback, satisfaction, NPS' },
  { type: 'political', emoji: '🏛️', label: 'Political/Scheme', desc: 'Verify beneficiaries, scheme status' },
  { type: 'custom', emoji: '✨', label: 'Custom', desc: 'Any other use case' },
]

const TONES = [
  { value: 'friendly', label: '😊 Friendly', desc: 'Warm and approachable' },
  { value: 'formal', label: '👔 Formal', desc: 'Professional and structured' },
  { value: 'professional', label: '💼 Professional', desc: 'Business-like tone' },
]

const DEMO = localStorage.getItem('demo_mode')

export default function CreateCampaign() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [createdId, setCreatedId] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [fieldInput, setFieldInput] = useState('')
  const [contactCount, setContactCount] = useState(0)

  const [form, setForm] = useState({
    name: '',
    description: '',
    campaign_type: 'reminder',
    language_priority: 'gu',
    script_type: 'manual',
    script_content: '',
    persona_name: 'Priya',
    persona_tone: 'friendly',
    data_fields: [],
    caller_id: '',
    max_concurrent_calls: 5,
    max_retries: 2,
    retry_gap_minutes: 30,
    calling_hours_start: '09:00',
    calling_hours_end: '21:00',
    google_sheet_url: '',
    google_sheet_id: '',
    schedule_start: '',
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function saveAsDraft() {
    if (!form.name) { toast.error('Campaign name is required'); return false }
    if (!createdId && !DEMO) {
      try {
        const res = await campaignApi.create({ ...form, status: 'draft' })
        setCreatedId(res.data.campaign.id)
        return res.data.campaign.id
      } catch (err) {
        toast.error('Failed to save: ' + (err.response?.data?.error || err.message))
        return false
      }
    }
    return createdId || 'demo-id'
  }

  async function handleExtract() {
    setLoading(true)
    try {
      const id = createdId || await saveAsDraft()
      if (!id) return
      let text = ''
      if (form.script_type === 'pdf' && pdfFile && !DEMO) {
        const res = await campaignApi.extractFromPDF(id, pdfFile)
        text = res.data.text
      } else if (form.script_type === 'url' && urlInput && !DEMO) {
        const res = await campaignApi.extractFromURL(id, urlInput)
        text = res.data.text
      } else {
        text = `[Demo] Extracted content from ${form.script_type === 'pdf' ? pdfFile?.name : urlInput}`
      }
      set('script_content', text)
      toast.success('Script extracted!')
    } catch (err) {
      toast.error('Extraction failed')
    } finally { setLoading(false) }
  }

  async function handleUploadContacts() {
    if (!csvFile) return
    setLoading(true)
    try {
      if (DEMO) {
        await new Promise(r => setTimeout(r, 800))
        setContactCount(Math.floor(Math.random() * 200) + 50)
        toast.success('Demo: Contacts imported!')
        return
      }
      const id = createdId || await saveAsDraft()
      if (!id) return
      const res = await campaignApi.uploadContacts(id, csvFile)
      setContactCount(res.data.count)
      toast.success(`${res.data.count} contacts imported!`)
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.error || err.message))
    } finally { setLoading(false) }
  }

  async function handleLaunch() {
    if (!form.name) { toast.error('Campaign name required'); return }
    setLoading(true)
    try {
      if (DEMO) {
        await new Promise(r => setTimeout(r, 1200))
        toast.success('Demo: Campaign launched! 🚀')
        navigate('/dashboard/campaigns')
        return
      }
      let id = createdId
      if (!id) {
        const res = await campaignApi.create(form)
        id = res.data.campaign.id
      } else {
        await campaignApi.update(id, form)
      }
      await campaignApi.launch(id)
      toast.success('Campaign launched! 🚀')
      navigate(`/dashboard/campaigns/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Launch failed')
    } finally { setLoading(false) }
  }

  async function handleNext() {
    if (step === 0 && !form.name) { toast.error('Campaign name is required'); return }
    if (step === 4) { await handleLaunch(); return }
    if (step === 0 && !DEMO) await saveAsDraft()
    setStep(s => s + 1)
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-navy-900 mb-1">Create Campaign</h1>
        <p className="text-navy-400 text-sm">Set up your AI voice calling campaign in 5 steps</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < step
            const active = i === step
            return (
              <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                    ${done ? 'bg-jade-50 text-jade-700 cursor-pointer hover:bg-jade-100' :
                      active ? 'bg-navy-900 text-white shadow-sm' :
                      'bg-white border border-navy-100 text-navy-400 cursor-not-allowed'}`}>
                  {done ? <Check size={13} /> : <Icon size={13} />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={14} className={done ? 'text-jade-400' : 'text-navy-200'} />
                )}
              </div>
            )
          })}
        </div>
        <div className="h-1.5 bg-navy-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-navy-500 to-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-3xl border border-navy-100 p-7 mb-6 animate-slide-up">

        {/* ===== STEP 0 — Basic Info ===== */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Campaign Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Bus Driver Reminder — Jan 2025"
                className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 transition-all focus:border-navy-300" />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="What is this campaign about? (optional)"
                className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 transition-all focus:border-navy-300 resize-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">
                Primary Language <span className="text-navy-300 normal-case font-normal">(AI will auto-detect, but starts in this language)</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {LANG_OPTIONS.map(l => (
                  <button key={l.code} onClick={() => set('language_priority', l.code)}
                    className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all
                      ${form.language_priority === l.code
                        ? 'border-navy-600 bg-navy-50 shadow-sm'
                        : 'border-navy-100 hover:border-navy-200'}`}>
                    <span className="text-2xl mb-2">{l.flag}</span>
                    <span className={`font-display font-bold text-sm ${form.language_priority === l.code ? 'text-navy-900' : 'text-navy-600'}`}>{l.label}</span>
                    <span className="text-[11px] text-navy-400 mt-0.5">{l.sublabel}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">Campaign Type</label>
              <div className="grid grid-cols-2 gap-3">
                {CAMPAIGN_TYPES.map(t => (
                  <button key={t.type} onClick={() => set('campaign_type', t.type)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all
                      ${form.campaign_type === t.type
                        ? 'border-navy-600 bg-navy-50'
                        : 'border-navy-100 hover:border-navy-200'}`}>
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className={`font-semibold text-sm ${form.campaign_type === t.type ? 'text-navy-900' : 'text-navy-700'}`}>{t.label}</p>
                      <p className="text-[11px] text-navy-400 mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 1 — Script ===== */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">Script Source</label>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { type: 'manual', icon: FileText, label: 'Write Script' },
                  { type: 'pdf', icon: Upload, label: 'Upload PDF' },
                  { type: 'url', icon: Link2, label: 'From URL' },
                ].map(s => (
                  <button key={s.type} onClick={() => set('script_type', s.type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all
                      ${form.script_type === s.type
                        ? 'border-navy-600 bg-navy-50'
                        : 'border-navy-100 hover:border-navy-200'}`}>
                    <s.icon size={20} className={form.script_type === s.type ? 'text-navy-700' : 'text-navy-400'} />
                    <span className={`text-xs font-semibold ${form.script_type === s.type ? 'text-navy-800' : 'text-navy-500'}`}>{s.label}</span>
                  </button>
                ))}
              </div>

              {form.script_type === 'pdf' && (
                <div className="flex items-center gap-3 mb-4">
                  <label className="flex-1 flex items-center gap-3 border-2 border-dashed border-navy-200 hover:border-navy-400 rounded-2xl px-4 py-3 cursor-pointer transition-all">
                    <Upload size={16} className="text-navy-400" />
                    <span className="text-sm text-navy-500">{pdfFile ? pdfFile.name : 'Click to upload PDF'}</span>
                    <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} className="hidden" />
                  </label>
                  {pdfFile && (
                    <button onClick={handleExtract} disabled={loading}
                      className="px-4 py-3 bg-navy-900 text-white rounded-2xl text-sm font-semibold hover:bg-navy-800 disabled:opacity-50 whitespace-nowrap">
                      {loading ? '...' : 'Extract'}
                    </button>
                  )}
                </div>
              )}

              {form.script_type === 'url' && (
                <div className="flex gap-3 mb-4">
                  <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/scheme-details"
                    className="flex-1 bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-300" />
                  <button onClick={handleExtract} disabled={loading || !urlInput}
                    className="px-5 py-3 bg-navy-900 text-white rounded-2xl text-sm font-semibold hover:bg-navy-800 disabled:opacity-50">
                    {loading ? '...' : 'Fetch'}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                Campaign Script / Context
                <span className="text-navy-300 normal-case font-normal ml-2">Use {'{{name}}'}, {'{{bus_time}}'} for variables</span>
              </label>
              <textarea value={form.script_content} onChange={e => set('script_content', e.target.value)}
                rows={9}
                placeholder={`Write your call script here. Examples:\n\n• "Hello {{name}}! Your bus {{bus_number}} departs at {{departure_time}}. Please confirm."\n\n• "નમસ્તે {{name}} ભાઈ! {{scheme_name}} scheme વિષે થોડી વાત કરવી છે."\n\nThe AI will use this as context and conversation guide.`}
                className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-700 placeholder-navy-300 font-mono leading-relaxed resize-none focus:border-navy-300 transition-all" />
              <p className="text-xs text-navy-400 mt-2">{form.script_content.length} characters</p>
            </div>
          </div>
        )}

        {/* ===== STEP 2 — AI Config ===== */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Agent Name</label>
                <input value={form.persona_name} onChange={e => set('persona_name', e.target.value)}
                  placeholder="Priya"
                  className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-300 transition-all" />
                <p className="text-xs text-navy-400 mt-1">Name used in greeting</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Caller ID</label>
                <input value={form.caller_id} onChange={e => set('caller_id', e.target.value)}
                  placeholder="+917900000001"
                  className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-300 transition-all" />
                <p className="text-xs text-navy-400 mt-1">Your registered number</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">Agent Tone</label>
              <div className="grid grid-cols-3 gap-3">
                {TONES.map(t => (
                  <button key={t.value} onClick={() => set('persona_tone', t.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all
                      ${form.persona_tone === t.value ? 'border-navy-600 bg-navy-50' : 'border-navy-100 hover:border-navy-200'}`}>
                    <p className={`font-semibold text-sm mb-1 ${form.persona_tone === t.value ? 'text-navy-900' : 'text-navy-700'}`}>{t.label}</p>
                    <p className="text-[11px] text-navy-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                Data Fields to Collect
                <span className="text-navy-300 normal-case font-normal ml-2">What should AI ask and record?</span>
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
                  className="flex-1 bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-300 transition-all" />
                <button
                  onClick={() => { if (fieldInput.trim()) { set('data_fields', [...form.data_fields, fieldInput.trim()]); setFieldInput('') }}}
                  className="w-11 h-11 bg-navy-900 text-white rounded-2xl flex items-center justify-center hover:bg-navy-800 transition-colors flex-shrink-0">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.data_fields.map((f, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-navy-100 text-navy-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
                    {f}
                    <button onClick={() => set('data_fields', form.data_fields.filter((_, j) => j !== i))}
                      className="hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {form.data_fields.length === 0 && (
                  <p className="text-xs text-navy-300 italic">Press Enter to add a field</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-navy-50 rounded-2xl border border-navy-100">
              <p className="text-xs font-bold text-navy-600 uppercase tracking-wide mb-2">Auto-behaviors (always on)</p>
              {[
                '✅ Auto-detect user language (gu/hi/en)',
                '✅ Reschedule if user is busy',
                '✅ Transfer to human on request',
                '✅ Mark DNC if user says "stop calling"',
              ].map(b => <p key={b} className="text-xs text-navy-500 mb-1">{b}</p>)}
            </div>
          </div>
        )}

        {/* ===== STEP 3 — Contacts ===== */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-2">📋 CSV Format</p>
              <div className="bg-white rounded-xl p-3 font-mono text-xs text-navy-700 leading-relaxed">
                <p className="text-navy-400 mb-1"># Required column: phone</p>
                <p className="font-semibold">phone,name,bus_number,departure_time</p>
                <p>9876543210,Rajesh Patel,Bus 47,6:30 AM</p>
                <p>9876543211,Suresh Kumar,Bus 12,7:00 AM</p>
              </div>
              <p className="text-xs text-orange-700 mt-2">Column names must match your script variables (e.g. {'{{name}}'} → column "name")</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Upload Contacts CSV</label>
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-navy-200 hover:border-navy-400 rounded-2xl p-8 cursor-pointer transition-all group">
                <div className="w-12 h-12 bg-navy-50 group-hover:bg-navy-100 rounded-2xl flex items-center justify-center transition-colors">
                  <Upload size={22} className="text-navy-400 group-hover:text-navy-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-navy-700">{csvFile ? csvFile.name : 'Click to upload CSV'}</p>
                  <p className="text-xs text-navy-400 mt-1">.csv files only</p>
                </div>
                <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files[0])} className="hidden" />
              </label>
              {csvFile && (
                <button onClick={handleUploadContacts} disabled={loading}
                  className="w-full mt-3 py-3 bg-jade-600 hover:bg-jade-500 text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Uploading...' : <><Upload size={15} /> Upload {csvFile.name}</>}
                </button>
              )}
              {contactCount > 0 && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-jade-50 border border-jade-200 rounded-xl">
                  <Check size={16} className="text-jade-600" />
                  <span className="text-sm font-semibold text-jade-700">{contactCount} contacts imported successfully!</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">
                Google Sheets Output (optional)
                <span className="text-navy-300 normal-case font-normal ml-1">— call results saved here</span>
              </label>
              <input value={form.google_sheet_url} onChange={e => {
                set('google_sheet_url', e.target.value)
                const match = e.target.value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
                if (match) set('google_sheet_id', match[1])
              }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-300 transition-all" />
              {form.google_sheet_id && (
                <p className="text-xs text-jade-600 mt-1">✅ Sheet ID detected: {form.google_sheet_id.substring(0, 20)}...</p>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 4 — Launch ===== */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-5 bg-gradient-to-br from-navy-50 to-white rounded-2xl border border-navy-100">
              <p className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-4">Campaign Summary</p>
              <div className="space-y-3">
                {[
                  { label: 'Campaign', value: form.name },
                  { label: 'Language', value: form.language_priority === 'gu' ? '🟠 Gujarati' : form.language_priority === 'hi' ? '🟢 Hindi' : '🔵 English' },
                  { label: 'Agent', value: `${form.persona_name} (${form.persona_tone})` },
                  { label: 'Type', value: form.campaign_type },
                  { label: 'Contacts', value: contactCount > 0 ? `${contactCount} imported` : 'Upload CSV in previous step' },
                  { label: 'Script', value: form.script_content ? `${form.script_content.substring(0, 60)}...` : 'No script set' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-navy-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-navy-700 flex-1">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calling config */}
            <div>
              <p className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">Calling Configuration</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-500 mb-1.5">Concurrent Calls</label>
                  <input type="number" value={form.max_concurrent_calls} min={1} max={20}
                    onChange={e => set('max_concurrent_calls', parseInt(e.target.value))}
                    className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 focus:border-navy-300" />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1.5">Max Retries</label>
                  <input type="number" value={form.max_retries} min={0} max={5}
                    onChange={e => set('max_retries', parseInt(e.target.value))}
                    className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 focus:border-navy-300" />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1.5">Start Time</label>
                  <input type="time" value={form.calling_hours_start}
                    onChange={e => set('calling_hours_start', e.target.value)}
                    className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 focus:border-navy-300" />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1.5">End Time</label>
                  <input type="time" value={form.calling_hours_end}
                    onChange={e => set('calling_hours_end', e.target.value)}
                    className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 focus:border-navy-300" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-navy-500 mb-1.5">
                <Calendar size={12} className="inline mr-1" />
                Schedule Start (leave blank to launch immediately)
              </label>
              <input type="datetime-local" value={form.schedule_start}
                onChange={e => set('schedule_start', e.target.value)}
                className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 focus:border-navy-300 transition-all" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-2 px-5 py-3 border-2 border-navy-200 hover:border-navy-400 rounded-2xl text-sm font-semibold text-navy-600 hover:text-navy-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={handleNext} disabled={loading}
          className={`flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-lg
            ${step === 4 ? 'bg-gradient-to-r from-jade-600 to-navy-600 hover:shadow-jade-200' : 'bg-navy-900 hover:bg-navy-800 hover:shadow-navy-200'}`}>
          {loading ? 'Please wait...' : step === 4 ? (
            <><Rocket size={16} /> Launch Campaign</>
          ) : (
            <>Next <ChevronRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  )
}
