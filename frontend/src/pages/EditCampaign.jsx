import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Save, Trash2, Upload, X, Check,
  AlertTriangle, FileText, Users, Settings, Bot, Phone
} from 'lucide-react'

const TABS = [
  { id: 'basic',    label: 'Basic Info',  icon: Settings  },
  { id: 'script',   label: 'Script',      icon: FileText  },
  { id: 'ai',       label: 'AI Config',   icon: Bot       },
  { id: 'contacts', label: 'Contacts',    icon: Users     },
  { id: 'calling',  label: 'Calling',     icon: Phone     },
]

const LANG_OPTIONS = [
  { code: 'gu', label: 'Gujarati', flag: '🟠' },
  { code: 'hi', label: 'Hindi',    flag: '🟢' },
  { code: 'en', label: 'English',  flag: '🔵' },
]

const TONE_OPTIONS = [
  { value: 'friendly',     label: '😊 Friendly'     },
  { value: 'professional', label: '💼 Professional'  },
  { value: 'persuasive',   label: '🎯 Persuasive'   },
  { value: 'empathetic',   label: '💙 Empathetic'    },
]

const TYPE_OPTIONS = [
  { type: 'sales',      label: '💰 Sales'      },
  { type: 'survey',     label: '📊 Survey'     },
  { type: 'reminder',   label: '🔔 Reminder'   },
  { type: 'political',  label: '🗳️ Political'  },
  { type: 'followup',   label: '📞 Follow Up'  },
  { type: 'custom',     label: '⚙️ Custom'     },
]

export default function EditCampaign() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [activeTab,     setActiveTab]     = useState('basic')
  const [contactFile,   setContactFile]   = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [contactCount,  setContactCount]  = useState(0)
  const [contacts,      setContacts]      = useState([])
  const fileRef = useRef()

  const [form, setForm] = useState({
    name: '', description: '', campaign_type: 'custom',
    language_priority: 'gu', script_type: 'manual', script_content: '',
    persona_name: 'Priya', persona_tone: 'friendly',
    data_fields: [], caller_id: '',
    max_concurrent_calls: 5, max_retries: 2,
    calling_hours_start: '09:00', calling_hours_end: '21:00',
    schedule_start: '', _scheduleMode: 'now',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    async function load() {
      try {
        const [campRes, contactRes] = await Promise.all([
          campaignApi.get(id),
          campaignApi.getContacts(id),
        ])
        const c = campRes.data.campaign
        setForm({
          name:                 c.name || '',
          description:          c.description || '',
          campaign_type:        c.campaign_type || 'custom',
          language_priority:    c.language_priority || 'gu',
          script_type:          c.script_type || 'manual',
          script_content:       c.script_content || '',
          persona_name:         c.persona_name || 'Priya',
          persona_tone:         c.persona_tone || 'friendly',
          data_fields:          c.data_fields || [],
          caller_id:            c.caller_id || '',
          max_concurrent_calls: c.max_concurrent_calls || 5,
          max_retries:          c.max_retries || 2,
          calling_hours_start:  c.calling_hours_start || '09:00',
          calling_hours_end:    c.calling_hours_end || '21:00',
          schedule_start:       c.schedule_start || '',
          _scheduleMode:        c.schedule_start ? 'schedule' : 'now',
        })
        setContacts(contactRes.data.contacts || [])
        setContactCount(contactRes.data.total || 0)
      } catch {
        toast.error('Failed to load campaign')
      } finally {
        setLoading(false)
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
      toast.success('Campaign saved! ✅')
      navigate(`/dashboard/campaigns/${id}`)
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadContacts() {
    if (!contactFile) return
    setUploadLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', contactFile)
      const res = await campaignApi.uploadContacts(id, formData)
      toast.success(`${res.data.count} contacts uploaded!`)
      setContactCount(res.data.count)
      setContactFile(null)
      // Reload contacts
      const cr = await campaignApi.getContacts(id)
      setContacts(cr.data.contacts || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== form.name) {
      toast.error('Campaign name does not match')
      return
    }
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

  const inp = "w-full bg-[#faf8f4] border border-[#ede7dc] rounded-xl px-4 py-3 text-sm text-[#2c2c2c] focus:border-[#a8a8a8] focus:outline-none"

  if (loading) return (
    <div className="p-10 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to={`/dashboard/campaigns/${id}`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm mb-2">
            <ArrowLeft size={14}/> Back to Campaign
          </Link>
          <h1 className="font-bold text-2xl text-gray-900">Edit Campaign</h1>
          <p className="text-gray-500 text-sm mt-1">{form.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all">
            <Trash2 size={14}/> Delete
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#228248] text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</>
              : <><Save size={14}/> Save Changes</>
            }
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={14}/> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">

        {/* ── Basic Info Tab ── */}
        {activeTab === 'basic' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Campaign Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="e.g. Diwali Sales Campaign"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                className={inp + ' resize-none'} rows={3} placeholder="Optional description..."/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Campaign Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map(t => (
                  <button key={t.type} onClick={() => set('campaign_type', t.type)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all
                      ${form.campaign_type === t.type ? 'border-[#228248] bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Language</label>
              <div className="flex gap-3">
                {LANG_OPTIONS.map(l => (
                  <button key={l.code} onClick={() => set('language_priority', l.code)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all
                      ${form.language_priority === l.code ? 'border-[#228248] bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Script Tab ── */}
        {activeTab === 'script' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Script / Instructions</label>
              <textarea value={form.script_content} onChange={e => set('script_content', e.target.value)}
                className={inp + ' resize-none font-mono text-xs'} rows={14}
                placeholder={`Write your call script here...\n\nExample:\nYou are calling to offer a special Diwali discount.\nAsk the customer if they are interested in our product.\nCollect: name, interest level (1-5), callback time preference.\n\nUse {{name}} to personalize with contact's name.`}/>
              <p className="text-xs text-gray-400 mt-1">Use {'{{variable}}'} to insert contact data. e.g. {'{{name}}'}, {'{{company}}'}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data Fields to Collect</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(form.data_fields || []).map((field, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                    <span className="text-sm text-gray-700">{field}</span>
                    <button onClick={() => set('data_fields', form.data_fields.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input id="fieldInput" className={inp + ' flex-1'} placeholder="e.g. interest_level, callback_time"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = e.target.value.trim()
                      if (val && !form.data_fields.includes(val)) {
                        set('data_fields', [...(form.data_fields || []), val])
                        e.target.value = ''
                      }
                    }
                  }}/>
                <button onClick={() => {
                    const el = document.getElementById('fieldInput')
                    const val = el.value.trim()
                    if (val && !form.data_fields.includes(val)) {
                      set('data_fields', [...(form.data_fields || []), val])
                      el.value = ''
                    }
                  }}
                  className="px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700">
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Press Enter or click Add. These are fields the AI will try to collect during the call.</p>
            </div>
          </>
        )}

        {/* ── AI Config Tab ── */}
        {activeTab === 'ai' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Agent Name</label>
              <input value={form.persona_name} onChange={e => set('persona_name', e.target.value)}
                className={inp} placeholder="e.g. Priya, Raj, Meera"/>
              <p className="text-xs text-gray-400 mt-1">The name the AI will introduce itself as during the call</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Agent Tone</label>
              <div className="grid grid-cols-2 gap-3">
                {TONE_OPTIONS.map(t => (
                  <button key={t.value} onClick={() => set('persona_tone', t.value)}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 text-left transition-all
                      ${form.persona_tone === t.value ? 'border-[#228248] bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Contacts Tab ── */}
        {activeTab === 'contacts' && (
          <>
            {/* Current contacts summary */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                <Users size={22} className="text-gray-500"/>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{contactCount}</p>
                <p className="text-sm text-gray-500">Total contacts in this campaign</p>
              </div>
            </div>

            {/* Upload new contacts */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload New Contacts</label>
              <p className="text-xs text-orange-600 font-medium mb-3">⚠️ Uploading a new file will replace all existing PENDING contacts</p>
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl p-8 cursor-pointer transition-all">
                <Upload size={24} className="text-gray-400"/>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    {contactFile ? contactFile.name : 'Click to upload contacts file'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">CSV, Excel (.xlsx/.xls) or PDF</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf"
                  onChange={e => setContactFile(e.target.files[0])} className="hidden"/>
              </label>
              {contactFile && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700">
                    {contactFile.name.endsWith('.xlsx') || contactFile.name.endsWith('.xls') ? '📊' :
                     contactFile.name.endsWith('.pdf') ? '📄' : '📋'} {contactFile.name}
                  </div>
                  <button onClick={() => setContactFile(null)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                </div>
              )}
              {contactFile && (
                <button onClick={handleUploadContacts} disabled={uploadLoading}
                  className="w-full mt-3 py-3 bg-[#228248] text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploadLoading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Uploading...</>
                    : <><Upload size={15}/> Upload Contacts</>
                  }
                </button>
              )}
            </div>

            {/* Contact list preview */}
            {contacts.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Contact Preview (first {Math.min(contacts.length, 10)} of {contactCount})
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500">Phone</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500">Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contacts.slice(0, 10).map((c, i) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{c.phone}</td>
                          <td className="px-4 py-2.5 text-gray-600">{c.variables?.name || '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg
                              ${c.status === 'completed' ? 'bg-green-50 text-green-700' :
                                c.status === 'pending'   ? 'bg-gray-100 text-gray-600' :
                                'bg-orange-50 text-orange-700'}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Calling Config Tab ── */}
        {activeTab === 'calling' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Caller ID (From Number)</label>
              <input value={form.caller_id} onChange={e => set('caller_id', e.target.value)}
                className={inp} placeholder="+911171366938"/>
              <p className="text-xs text-gray-400 mt-1">Leave blank to use default number from settings</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Concurrent Calls</label>
                <input type="number" min={1} max={30} value={form.max_concurrent_calls}
                  onChange={e => set('max_concurrent_calls', parseInt(e.target.value))} className={inp}/>
                <p className="text-xs text-gray-400 mt-1">Max simultaneous calls</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max Retries</label>
                <input type="number" min={0} max={5} value={form.max_retries}
                  onChange={e => set('max_retries', parseInt(e.target.value))} className={inp}/>
                <p className="text-xs text-gray-400 mt-1">Times to retry if no answer</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Calling Start Time</label>
                <input type="time" value={form.calling_hours_start}
                  onChange={e => set('calling_hours_start', e.target.value)} className={inp}/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Calling End Time</label>
                <input type="time" value={form.calling_hours_end}
                  onChange={e => set('calling_hours_end', e.target.value)} className={inp}/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Schedule Start</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[{ label: '⚡ Now', value: 'now' }, { label: '📅 Schedule', value: 'schedule' }].map(opt => (
                  <button key={opt.value} onClick={() => { set('_scheduleMode', opt.value); if (opt.value === 'now') set('schedule_start', '') }}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all
                      ${form._scheduleMode === opt.value
                        ? 'border-[#228248] bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {form._scheduleMode === 'schedule' && (
                <input type="datetime-local" value={form.schedule_start}
                  onChange={e => set('schedule_start', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)} className={inp}/>
              )}
              {form._scheduleMode === 'now' && (
                <p className="text-xs text-green-600 font-medium">✅ Calls will start immediately when campaign is launched</p>
              )}
            </div>
          </>
        )}

      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between mt-6 p-4 bg-white rounded-2xl border border-gray-200">
        <Link to={`/dashboard/campaigns/${id}`}
          className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-400 transition-all">
          Cancel
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all">
            <Trash2 size={14}/> Delete Campaign
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#228248] text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</>
              : <><Save size={14}/> Save Changes</>
            }
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle size={22} className="text-red-500"/>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Campaign</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
              <p className="text-sm text-red-700 font-medium">This will permanently delete:</p>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• All contacts ({contactCount})</li>
                <li>• All call logs and transcripts</li>
                <li>• All campaign data</li>
              </ul>
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
                  : <><Trash2 size={14}/> Delete Forever</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
