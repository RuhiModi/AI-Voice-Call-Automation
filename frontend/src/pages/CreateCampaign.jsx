import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { campaignApi } from '../hooks/useApi'
import { ChevronRight, ChevronLeft, Upload, Link, FileText } from 'lucide-react'

const STEPS = ['Basic Info', 'Script', 'AI Config', 'Contacts', 'Launch']

export default function CreateCampaign() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [createdId, setCreatedId] = useState(null)
  const [form, setForm] = useState({
    name: '', description: '', campaign_type: 'custom',
    language_priority: 'gu', script_type: 'manual', script_content: '',
    persona_name: 'Priya', persona_tone: 'friendly',
    data_fields: [], caller_id: '',
    max_concurrent_calls: 5, max_retries: 2, retry_gap_minutes: 30,
    calling_hours_start: '09:00', calling_hours_end: '21:00',
    google_sheet_url: '', schedule_start: ''
  })
  const [csvFile, setCsvFile] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [dataFieldInput, setDataFieldInput] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleScriptExtract() {
    setLoading(true)
    try {
      if (!createdId) {
        const res = await campaignApi.create({ ...form, status: 'draft' })
        setCreatedId(res.data.campaign.id)
      }
      let text = ''
      if (form.script_type === 'pdf' && pdfFile) {
        const res = await campaignApi.extractFromPDF(createdId || 'temp', pdfFile)
        text = res.data.text
      } else if (form.script_type === 'url' && urlInput) {
        const res = await campaignApi.extractFromURL(createdId || 'temp', urlInput)
        text = res.data.text
      }
      if (text) set('script_content', text)
      toast.success('Script extracted!')
    } catch (err) {
      toast.error('Extraction failed')
    } finally { setLoading(false) }
  }

  async function handleContactUpload() {
    if (!csvFile || !createdId) return
    setLoading(true)
    try {
      const res = await campaignApi.uploadContacts(createdId, csvFile)
      toast.success(`${res.data.count} contacts imported!`)
    } catch (err) {
      toast.error('Upload failed')
    } finally { setLoading(false) }
  }

  async function handleLaunch() {
    setLoading(true)
    try {
      let id = createdId
      if (!id) {
        const res = await campaignApi.create(form)
        id = res.data.campaign.id
        setCreatedId(id)
      } else {
        await campaignApi.update(id, form)
      }
      await campaignApi.launch(id)
      toast.success('Campaign launched! 🚀')
      navigate(`/campaigns/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Launch failed')
    } finally { setLoading(false) }
  }

  async function saveAndNext() {
    if (step === 0 && !form.name) return toast.error('Campaign name is required')
    if (step < 4) {
      if (step === 0 && !createdId) {
        setLoading(true)
        try {
          const res = await campaignApi.create({ ...form, status: 'draft' })
          setCreatedId(res.data.campaign.id)
        } catch { toast.error('Save failed') }
        finally { setLoading(false) }
      }
      setStep(s => s + 1)
    } else {
      await handleLaunch()
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Campaign</h1>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-0.5 bg-gray-200 mx-3" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">

        {/* STEP 0 — Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Bus Driver Reminder - Jan 2025"
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="What is this campaign about?"
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Language</label>
              <div className="flex gap-3">
                {[{code:'gu',label:'ગુજરાતી (Gujarati)'},{code:'hi',label:'हिंदी (Hindi)'},{code:'en',label:'English'}].map(l => (
                  <button key={l.code} onClick={() => set('language_priority', l.code)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                      ${form.language_priority === l.code ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
              <select value={form.campaign_type} onChange={e => set('campaign_type', e.target.value)}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="reminder">Reminder / Notification</option>
                <option value="survey">Survey / Feedback</option>
                <option value="political">Political / Scheme</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 1 — Script */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Script Source</label>
              <div className="flex gap-3 mb-4">
                {[{type:'manual',icon:FileText,label:'Write Script'},{type:'pdf',icon:Upload,label:'Upload PDF'},{type:'url',icon:Link,label:'From URL'}].map(s => (
                  <button key={s.type} onClick={() => set('script_type', s.type)}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border text-sm font-medium transition-all
                      ${form.script_type === s.type ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <s.icon size={20} />{s.label}
                  </button>
                ))}
              </div>

              {form.script_type === 'pdf' && (
                <div className="space-y-3">
                  <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm" />
                  <button onClick={handleScriptExtract} disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Extracting...' : 'Extract Text'}
                  </button>
                </div>
              )}
              {form.script_type === 'url' && (
                <div className="flex gap-2">
                  <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/scheme-info" 
                    className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <button onClick={handleScriptExtract} disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    Fetch
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Script / Context {form.script_type !== 'manual' ? '(auto-extracted, you can edit)' : ''}
              </label>
              <textarea value={form.script_content} onChange={e => set('script_content', e.target.value)}
                rows={8} placeholder={`Write your script here. Use {{name}}, {{bus_time}} etc. for variable substitution.\n\nExample:\n"Hello {{name}}, your bus {{bus_number}} departs at {{departure_time}} from {{route}}."`}
                className="w-full border rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        )}

        {/* STEP 2 — AI Config */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                <input value={form.persona_name} onChange={e => set('persona_name', e.target.value)}
                  placeholder="Priya"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                <select value={form.persona_tone} onChange={e => set('persona_tone', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fields to Collect</label>
              <div className="flex gap-2 mb-2">
                <input value={dataFieldInput} onChange={e => setDataFieldInput(e.target.value)}
                  placeholder="e.g. scheme_status, availability"
                  onKeyDown={e => { if (e.key === 'Enter' && dataFieldInput) {
                    set('data_fields', [...form.data_fields, dataFieldInput])
                    setDataFieldInput('')
                  }}}
                  className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <button onClick={() => { if (dataFieldInput) { set('data_fields', [...form.data_fields, dataFieldInput]); setDataFieldInput('') }}}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.data_fields.map((f, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                    {f}
                    <button onClick={() => set('data_fields', form.data_fields.filter((_, j) => j !== i))} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caller ID (Phone Number)</label>
              <input value={form.caller_id} onChange={e => set('caller_id', e.target.value)}
                placeholder="e.g. +917900000000"
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        )}

        {/* STEP 3 — Contacts */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-800 mb-1">CSV Format Required:</p>
              <code className="text-blue-700">phone,name,bus_number,departure_time,route</code>
              <br/><code className="text-blue-700">9876543210,Rajesh,Bus 47,6:30 AM,Ahmedabad-Gandhinagar</code>
              <p className="text-blue-600 mt-2">Column names should match your script variables exactly.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Contacts CSV</label>
              <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files[0])}
                className="w-full border rounded-lg px-4 py-2.5 text-sm" />
            </div>
            {csvFile && (
              <button onClick={handleContactUpload} disabled={loading}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Uploading...' : `Upload ${csvFile.name}`}
              </button>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Sheets URL (for output)</label>
              <input value={form.google_sheet_url} onChange={e => {
                set('google_sheet_url', e.target.value)
                const match = e.target.value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
                if (match) set('google_sheet_id', match[1])
              }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        )}

        {/* STEP 4 — Launch */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">Ready to Launch!</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>📞 Campaign: <strong>{form.name}</strong></p>
                <p>🌐 Language: <strong>{form.language_priority === 'gu' ? 'Gujarati' : form.language_priority === 'hi' ? 'Hindi' : 'English'}</strong></p>
                <p>🤖 Agent: <strong>{form.persona_name}</strong></p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concurrent Calls</label>
                <input type="number" value={form.max_concurrent_calls} onChange={e => set('max_concurrent_calls', parseInt(e.target.value))}
                  min={1} max={20}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" value={form.calling_hours_start} onChange={e => set('calling_hours_start', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" value={form.calling_hours_end} onChange={e => set('calling_hours_end', e.target.value)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Start (leave blank to launch now)</label>
              <input type="datetime-local" value={form.schedule_start} onChange={e => set('schedule_start', e.target.value)}
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={18} /> Back
        </button>
        <button onClick={saveAndNext} disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          {step === 4 ? '🚀 Launch Campaign' : 'Next'} {step < 4 && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  )
}
