import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { campaignApi, contactApi } from '../hooks/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Save, Trash2, Upload, X, Check,
  AlertTriangle, FileText, Users, Settings, Bot, Phone,
  Pause, Play, RotateCcw, Rocket
} from 'lucide-react'

const TABS = [
  { id: 'basic',    label: 'Basic Info', icon: Settings  },
  { id: 'script',   label: 'Script',     icon: FileText  },
  { id: 'ai',       label: 'AI Agent',   icon: Bot       },
  { id: 'contacts', label: 'Contacts',   icon: Users     },
  { id: 'calling',  label: 'Schedule',   icon: Phone     },
]

const LANG_OPTIONS = [
  { code: 'gu', label: 'Gujarati', flag: '🟠' },
  { code: 'hi', label: 'Hindi',    flag: '🟢' },
  { code: 'en', label: 'English',  flag: '🔵' },
]

const TONE_OPTIONS = [
  { value: 'friendly',     label: '😊 Friendly',     desc: 'Warm and approachable'   },
  { value: 'professional', label: '💼 Professional',  desc: 'Formal and structured'   },
  { value: 'empathetic',   label: '🤝 Empathetic',   desc: 'Caring and patient'       },
  { value: 'persuasive',   label: '🎯 Persuasive',   desc: 'Confident and assertive'  },
]

const TYPE_OPTIONS = [
  { type: 'announcement', label: '📢 Inform People'  },
  { type: 'survey',       label: '📋 Ask Questions'  },
  { type: 'reminder',     label: '⏰ Reminder'       },
  { type: 'political',    label: '🗳️ Political'      },
  { type: 'custom',       label: '⚙️ Custom'         },
]

const STATUS_META = {
  active:    { label: 'Live',      dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50  border-green-200'  },
  paused:    { label: 'Paused',    dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  completed: { label: 'Completed', dot: 'bg-gray-400',   text: 'text-gray-600',   bg: 'bg-gray-100  border-gray-200'   },
  draft:     { label: 'Draft',     dot: 'bg-gray-300',   text: 'text-gray-500',   bg: 'bg-gray-50   border-gray-200'   },
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        {hint && <span className="text-xs text-gray-400 normal-case font-normal">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export default function EditCampaign() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [showDelete,     setShowDelete]     = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState('')
  const [activeTab,      setActiveTab]      = useState('basic')
  const [contactFile,    setContactFile]    = useState(null)
  const [uploadLoading,  setUploadLoading]  = useState(false)
  const [contactCount,   setContactCount]   = useState(0)
  const [contacts,       setContacts]       = useState([])
  const [campaignStatus, setCampaignStatus] = useState('draft')
  const [relaunching,    setRelaunching]    = useState(false)
  const [pausing,        setPausing]        = useState(false)
  const [pdfFile,        setPdfFile]        = useState(null)
  const [hasUnsaved,     setHasUnsaved]     = useState(false)
  const fileRef = useRef()
  const pdfRef  = useRef()

  const [form, setForm] = useState({
    name: '', description: '', campaign_type: 'announcement',
    language_priority: 'gu', script_type: 'manual', script_content: '',
    announcement_template: '', closing_message: '',
    persona_name: 'Priya', persona_tone: 'friendly',
    data_fields: [], caller_id: '',
    max_concurrent_calls: 5, max_retries: 2,
    calling_hours_start: '09:00', calling_hours_end: '21:00',
    schedule_start: '', _scheduleMode: 'now',
  })

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setHasUnsaved(true)
  }

  useEffect(() => {
    async function load() {
      try {
        const [campRes, contactRes] = await Promise.all([
          campaignApi.get(id),
          contactApi.list(id),
        ])
        const c = campRes.data.campaign
        setCampaignStatus(c.status || 'draft')
        setForm({
          name:                  c.name || '',
          description:           c.description || '',
          campaign_type:         c.campaign_type || 'announcement',
          language_priority:     c.language_priority || 'gu',
          script_type:           c.script_type || 'manual',
          script_content:        c.script_content || '',
          announcement_template: c.announcement_template || '',
          closing_message:       c.closing_message || '',
          persona_name:          c.persona_name || 'Priya',
          persona_tone:          c.persona_tone || 'friendly',
          data_fields:           c.data_fields || [],
          caller_id:             c.caller_id || '',
          max_concurrent_calls:  c.max_concurrent_calls || 5,
          max_retries:           c.max_retries || 2,
          calling_hours_start:   c.calling_hours_start || '09:00',
          calling_hours_end:     c.calling_hours_end || '21:00',
          schedule_start:        c.schedule_start || '',
          _scheduleMode:         c.schedule_start ? 'schedule' : 'now',
        })
        setContacts(contactRes.data.contacts || [])
        setContactCount(contactRes.data.total || 0)
      } catch {
        toast.error('Failed to load campaign')
      } finally {
        setLoading(false)
        setHasUnsaved(false)
      }
    }
    load()
  }, [id])

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Campaign name is required'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload._scheduleMode === 'now') payload.schedule_start = null
      delete payload._scheduleMode
      await campaignApi.update(id, payload)
      setHasUnsaved(false)
      toast.success('Saved ✅')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handlePause() {
    setPausing(true)
    try {
      await campaignApi.pause(id)
      setCampaignStatus('paused')
      toast.success('Campaign paused — edit freely, then relaunch')
    } catch {
      toast.error('Could not pause campaign')
    } finally {
      setPausing(false)
    }
  }

  async function handleSaveAndRelaunch() {
    if (!form.name.trim()) { toast.error('Campaign name is required'); return }
    setRelaunching(true)
    try {
      // 1. Save edits
      const payload = { ...form }
      if (payload._scheduleMode === 'now') payload.schedule_start = null
      delete payload._scheduleMode
      await campaignApi.update(id, payload)

      // 2. Re-upload PDF script if changed
      if (pdfFile) {
        try { await campaignApi.extractFromPDF(id, pdfFile) }
        catch (e) { console.warn('PDF non-fatal:', e.message) }
      }

      // 3. Re-upload contacts if changed
      if (contactFile) {
        await campaignApi.uploadContacts(id, contactFile)
      }

      // 4. Launch
      await campaignApi.launch(id)
      setCampaignStatus('active')
      setHasUnsaved(false)
      setPdfFile(null)
      setContactFile(null)
      toast.success('🚀 Campaign relaunched!')
      navigate(`/dashboard/campaigns/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Relaunch failed')
    } finally {
      setRelaunching(false)
    }
  }

  async function handleUploadContacts() {
    if (!contactFile) return
    setUploadLoading(true)
    try {
      const res = await campaignApi.uploadContacts(id, contactFile)
      toast.success(`${res.data.count} contacts uploaded!`)
      setContactCount(res.data.count)
      setContactFile(null)
      const cr = await contactApi.list(id)
      setContacts(cr.data.contacts || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== form.name) { toast.error('Name does not match'); return }
    setDeleting(true)
    try {
      await campaignApi.delete(id)
      toast.success('Campaign deleted')
      navigate('/dashboard/campaigns')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const inp = 'w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] focus:border-[#a8a8a8] focus:outline-none'
  const isActive   = campaignStatus === 'active'
  const statusMeta = STATUS_META[campaignStatus] || STATUS_META.draft

  if (loading) return (
    <div className="p-10 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-28">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to={`/dashboard/campaigns/${id}`}
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-2 transition-colors">
            <ArrowLeft size={14}/> Back
          </Link>
          <h1 className="font-bold text-2xl text-gray-900">{form.name || 'Edit Campaign'}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.bg} ${statusMeta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`}/>
              {statusMeta.label}
            </span>
            {hasUnsaved && <span className="text-xs text-orange-500 font-medium">● Unsaved changes</span>}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || !hasUnsaved}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#ede7dc] bg-white text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-400 transition-all disabled:opacity-40">
          {saving
            ? <><div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"/> Saving</>
            : <><Save size={14}/> Save</>}
        </button>
      </div>

      {/* ── LIVE BANNER ── */}
      {isActive && (
        <div className="mb-5 p-5 bg-[#fffbf0] border-2 border-[#fde59a] rounded-2xl flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">⚡</span>
          <div className="flex-1">
            <p className="font-bold text-[#8f540f] mb-1">Campaign is currently live</p>
            <p className="text-sm text-[#b86f0e]">
              Pause it first to safely edit the script, message, contacts, or settings.
              Calls in progress will finish before it stops.
            </p>
            <button onClick={handlePause} disabled={pausing}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold hover:bg-[#333] transition-all disabled:opacity-50">
              {pausing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Pausing...</>
                : <><Pause size={15}/> Pause Campaign to Edit</>}
            </button>
          </div>
        </div>
      )}

      {/* ── PAUSED BANNER ── */}
      {campaignStatus === 'paused' && (
        <div className="mb-5 p-4 bg-[#f0faf4] border border-[#b8e6cb] rounded-2xl flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-[#1c673a] text-sm">Paused — edit freely then relaunch below</p>
            <p className="text-xs text-[#4a9e6a] mt-0.5">All changes apply when you hit "Save & Relaunch"</p>
          </div>
        </div>
      )}

      {/* ── COMPLETED BANNER ── */}
      {campaignStatus === 'completed' && (
        <div className="mb-5 p-4 bg-[#f0f4ff] border border-[#c0d0ff] rounded-2xl flex items-center gap-3">
          <span className="text-2xl">🏁</span>
          <div>
            <p className="font-semibold text-[#3050c0] text-sm">Campaign completed — want to run it again?</p>
            <p className="text-xs text-[#6080d0] mt-0.5">Update contacts or script below, then hit "Save & Run Again"</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={13}/> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — locked when live */}
      <div className={`bg-white rounded-2xl border border-gray-200 p-6 space-y-6 transition-opacity
        ${isActive ? 'opacity-40 pointer-events-none select-none' : ''}`}>

        {/* BASIC */}
        {activeTab === 'basic' && (<>
          <Field label="Campaign Name *">
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="e.g. Bus Driver Route Update — March"/>
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              className={inp + ' resize-none'} rows={2} placeholder="Optional notes..."/>
          </Field>
          <Field label="Campaign Type">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(t => (
                <button key={t.type} onClick={() => set('campaign_type', t.type)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all
                    ${form.campaign_type === t.type ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Language">
            <div className="flex gap-2">
              {LANG_OPTIONS.map(l => (
                <button key={l.code} onClick={() => set('language_priority', l.code)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all
                    ${form.language_priority === l.code ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </Field>
        </>)}

        {/* SCRIPT */}
        {activeTab === 'script' && (<>
          {(form.campaign_type === 'announcement' || form.campaign_type === 'reminder') && (
            <div className="p-4 bg-[#fffbf0] border border-[#fde59a] rounded-2xl space-y-4">
              <Field label="Message Template" hint="Use {{driver_name}}, {{route}}, {{timing}} to insert contact data">
                <textarea value={form.announcement_template} onChange={e => set('announcement_template', e.target.value)}
                  rows={3} placeholder="નમસ્તે {{driver_name}}, આજનો રૂટ {{route}} છે, સમય {{timing}} છે. સમજ્યા?"
                  className="w-full bg-white border border-[#fde59a] rounded-xl px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:border-[#f5a623]"/>
              </Field>
              <Field label="Closing Message" hint="Spoken after contact confirms">
                <input value={form.closing_message} onChange={e => set('closing_message', e.target.value)}
                  placeholder="ઠીક છે. ધ્યાન રાખજો. આભાર."
                  className="w-full bg-white border border-[#fde59a] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#f5a623]"/>
              </Field>
            </div>
          )}
          {form.campaign_type === 'survey' && (
            <Field label="Upload New PDF Script" hint="Replaces current script — processed on relaunch">
              <label onClick={() => pdfRef.current?.click()}
                className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all
                  ${pdfFile ? 'border-[#228248] bg-[#f0faf4]' : 'border-gray-200 hover:border-gray-400 bg-gray-50'}`}>
                <input ref={pdfRef} type="file" accept=".pdf"
                  onChange={e => { setPdfFile(e.target.files[0]); setHasUnsaved(true) }} className="hidden"/>
                <span className="text-2xl">{pdfFile ? '📄' : '📎'}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700">{pdfFile ? pdfFile.name : 'Upload new PDF'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pdfFile ? 'Will be processed on relaunch' : 'Click to browse'}</p>
                </div>
                {pdfFile && <button onClick={e => { e.stopPropagation(); setPdfFile(null) }} className="text-gray-400 hover:text-red-500"><X size={16}/></button>}
              </label>
            </Field>
          )}
          <Field label="Script / Additional Context">
            <textarea value={form.script_content} onChange={e => set('script_content', e.target.value)}
              className={inp + ' resize-none font-mono text-xs'} rows={10}
              placeholder="Write your full script or additional instructions here..."/>
            <p className="text-xs text-gray-400 mt-1">Use {'{{variable}}'} to personalise e.g. {'{{name}}'}, {'{{route}}'}</p>
          </Field>
        </>)}

        {/* AI AGENT */}
        {activeTab === 'ai' && (<>
          <Field label="Agent Name">
            <input value={form.persona_name} onChange={e => set('persona_name', e.target.value)}
              className={inp} placeholder="Priya"/>
            <p className="text-xs text-gray-400 mt-1">The name the AI introduces itself as during calls</p>
          </Field>
          <Field label="Agent Tone *">
            <div className="grid grid-cols-2 gap-3">
              {TONE_OPTIONS.map(t => (
                <button key={t.value} onClick={() => set('persona_tone', t.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all
                    ${form.persona_tone === t.value ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className={`font-bold text-sm ${form.persona_tone === t.value ? 'text-white' : 'text-gray-800'}`}>{t.label}</p>
                  <p className={`text-xs mt-0.5 ${form.persona_tone === t.value ? 'text-white/60' : 'text-gray-400'}`}>{t.desc}</p>
                </button>
              ))}
            </div>
          </Field>
        </>)}

        {/* CONTACTS */}
        {activeTab === 'contacts' && (<>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: contactCount, color: 'bg-gray-50 border-gray-200' },
              { label: 'Pending', value: contacts.filter(c => c.status === 'pending').length, color: 'bg-orange-50 border-orange-200' },
              { label: 'Done', value: contacts.filter(c => c.status === 'completed').length, color: 'bg-green-50 border-green-200' },
            ].map(s => (
              <div key={s.label} className={`p-4 rounded-xl border text-center ${s.color}`}>
                <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <Field label="Upload New / Updated Contact List" hint="New contacts added. Existing pending contacts replaced.">
            <label onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all
                ${contactFile ? 'border-[#228248] bg-[#f0faf4]' : 'border-gray-200 hover:border-gray-400 bg-gray-50'}`}>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                onChange={e => { setContactFile(e.target.files[0]); setHasUnsaved(true) }} className="hidden"/>
              <span className="text-3xl">{contactFile ? '📊' : '📎'}</span>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">{contactFile ? contactFile.name : 'Drop Excel or CSV here'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Must have a phone column</p>
              </div>
            </label>
            {contactFile && (
              <div className="flex gap-2 mt-3">
                <button onClick={handleUploadContacts} disabled={uploadLoading}
                  className="flex-1 py-3 bg-[#228248] text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploadLoading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Uploading...</>
                    : <><Upload size={14}/> Upload Now</>}
                </button>
                <button onClick={() => setContactFile(null)}
                  className="px-4 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 transition-all">
                  <X size={16}/>
                </button>
              </div>
            )}
            <p className="text-xs text-orange-500 font-medium mt-2">⚠️ Uploading replaces pending contacts. Completed contacts are kept.</p>
          </Field>

          {contacts.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500">Phone</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.slice(0, 10).map(c => {
                    const v = typeof c.variables === 'object' ? c.variables : (() => { try { return JSON.parse(c.variables || '{}') } catch { return {} } })()
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{c.phone}</td>
                        <td className="px-4 py-2.5 text-gray-600">{v.name || v.driver_name || v.Name || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg
                            ${c.status === 'completed' ? 'bg-green-50 text-green-700'
                              : c.status === 'pending'   ? 'bg-gray-100 text-gray-600'
                              : 'bg-orange-50 text-orange-700'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>)}

        {/* SCHEDULE */}
        {activeTab === 'calling' && (<>
          <Field label="Calling Hours">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">From</p>
                <input type="time" value={form.calling_hours_start} onChange={e => set('calling_hours_start', e.target.value)} className={inp}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Until</p>
                <input type="time" value={form.calling_hours_end} onChange={e => set('calling_hours_end', e.target.value)} className={inp}/>
              </div>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Simultaneous Calls">
              <input type="number" min={1} max={30} value={form.max_concurrent_calls}
                onChange={e => set('max_concurrent_calls', parseInt(e.target.value))} className={inp}/>
            </Field>
            <Field label="Max Retries">
              <input type="number" min={0} max={5} value={form.max_retries}
                onChange={e => set('max_retries', parseInt(e.target.value))} className={inp}/>
            </Field>
          </div>
          <Field label="When to Start">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ label: '⚡ Start Now', value: 'now' }, { label: '📅 Schedule', value: 'schedule' }].map(opt => (
                <button key={opt.value}
                  onClick={() => { set('_scheduleMode', opt.value); if (opt.value === 'now') set('schedule_start', '') }}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all
                    ${form._scheduleMode === opt.value ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {form._scheduleMode === 'schedule' && (
              <input type="datetime-local" value={form.schedule_start}
                onChange={e => set('schedule_start', e.target.value)}
                min={new Date().toISOString().slice(0, 16)} className={inp}/>
            )}
          </Field>
          <Field label="Caller ID (optional)">
            <input value={form.caller_id} onChange={e => set('caller_id', e.target.value)}
              className={inp} placeholder="+919876543210"/>
            <p className="text-xs text-gray-400 mt-1">Leave blank to use default number</p>
          </Field>
        </>)}

      </div>

      {isActive && (
        <p className="text-center text-xs text-gray-400 mt-3">⚡ Pause the campaign above to make changes</p>
      )}

      {/* ── STICKY BOTTOM BAR ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {isActive ? (<>
            <p className="flex-1 text-sm text-gray-500">Pause to edit script, contacts or settings</p>
            <button onClick={handlePause} disabled={pausing}
              className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold hover:bg-[#333] transition-all disabled:opacity-50">
              {pausing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Pausing</>
                : <><Pause size={15}/> Pause to Edit</>}
            </button>
          </>) : (<>
            <button onClick={() => setShowDelete(true)}
              className="p-3 border border-red-200 text-red-400 rounded-xl hover:bg-red-50 transition-all">
              <Trash2 size={16}/>
            </button>
            <button onClick={handleSave} disabled={saving || !hasUnsaved}
              className="flex items-center gap-2 px-5 py-3 border border-gray-300 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-500 transition-all disabled:opacity-40">
              {saving
                ? <><div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"/> Saving</>
                : <><Save size={14}/> Save Only</>}
            </button>
            <button onClick={handleSaveAndRelaunch} disabled={relaunching}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1a1a1a] hover:bg-[#333] active:scale-[0.98] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50">
              {relaunching ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Relaunching...</>
              ) : campaignStatus === 'paused' ? (
                <><RotateCcw size={15}/> Save &amp; Relaunch</>
              ) : campaignStatus === 'completed' ? (
                <><Rocket size={15}/> Save &amp; Run Again</>
              ) : (
                <><Rocket size={15}/> Save &amp; Launch</>
              )}
            </button>
          </>)}
        </div>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-500"/>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Campaign</h3>
                <p className="text-sm text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700 space-y-1">
              <p className="font-semibold mb-1">Permanently deletes:</p>
              <p>• All {contactCount} contacts</p>
              <p>• All call logs and transcripts</p>
              <p>• All collected data and results</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Type <span className="text-red-500 font-mono">{form.name}</span> to confirm
              </label>
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-red-400 focus:outline-none"
                placeholder={form.name}/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-400">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting || deleteConfirm !== form.name}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-40 flex items-center justify-center gap-2">
                {deleting
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Deleting...</>
                  : <><Trash2 size={14}/> Delete Forever</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
