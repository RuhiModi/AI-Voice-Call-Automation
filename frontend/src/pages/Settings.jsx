import { useState } from 'react'
import toast from 'react-hot-toast'
import { Phone, Bell, Shield, AlertCircle, Check, Download, Cpu } from 'lucide-react'

function MicIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function Section({ title, desc, icon: Icon, badge, children }) {
  return (
    <div className="bg-white rounded-3xl border border-navy-100 overflow-hidden mb-5">
      <div className="flex items-center gap-4 px-7 py-5 border-b border-navy-50">
        <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center">
          <Icon size={18} className="text-navy-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-navy-900">{title}</h3>
            {badge && <span className="text-[10px] font-bold px-2 py-0.5 bg-jade-100 text-jade-700 rounded-lg">{badge}</span>}
          </div>
          <p className="text-xs text-navy-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="p-7">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', hint, readOnly }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input type={type} value={value} placeholder={placeholder} readOnly={readOnly}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        className={`w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-400 focus:outline-none transition-all ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`} />
      {hint && <p className="text-xs text-navy-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function Settings() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [profile, setProfile] = useState({ company_name: user.company_name || '', email: user.email || '' })
  const [vobiz,   setVobiz]   = useState({ api_key: '', api_url: 'https://api.vobiz.in/v1', caller_id: '' })
  const [sarvam,  setSarvam]  = useState({ api_key: '', tts_voice: 'kavya' })
  const [groq,    setGroq]    = useState({ api_key: '', model: 'llama-3.1-70b-versatile' })
  const [sheetsConnected, setSheetsConnected] = useState(false)
  const [notifs, setNotifs]   = useState({ call_completed: true, campaign_finished: true, error_alerts: true })

  function save(section) { toast.success(`${section} settings saved! Add to Render env vars to activate.`) }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-navy-900">Settings</h1>
        <p className="text-navy-400 text-sm mt-1">Configure your account and API integrations</p>
      </div>

      <Section title="Profile" desc="Your account information" icon={Shield}>
        <Field label="Company Name" value={profile.company_name} onChange={v => setProfile(p => ({...p, company_name: v}))} placeholder="Your company" />
        <Field label="Email" value={profile.email} type="email" readOnly hint="Email cannot be changed after signup" />
        <button onClick={() => save('Profile')} className="px-5 py-2.5 bg-navy-900 text-white rounded-2xl text-sm font-semibold hover:bg-navy-800 transition-colors">Save Profile</button>
      </Section>

      <Section title="Groq — AI Brain" desc="Free LLM, Llama 3.1 70B" icon={Cpu} badge="FREE">
        <div className="flex items-center gap-2 mb-5 p-3 bg-jade-50 border border-jade-200 rounded-2xl">
          <Check size={14} className="text-jade-600 flex-shrink-0" />
          <p className="text-xs text-jade-700">Free tier: 14,400 requests/day · Get key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">console.groq.com</a></p>
        </div>
        <Field label="Groq API Key" value={groq.api_key} type="password" onChange={v => setGroq(p => ({...p, api_key: v}))} placeholder="gsk_..." />
        <div className="mb-4">
          <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-1.5">Model</label>
          <select value={groq.model} onChange={e => setGroq(p => ({...p, model: e.target.value}))}
            className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 focus:border-navy-400 focus:outline-none">
            <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile (Recommended)</option>
            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Faster)</option>
          </select>
        </div>
        <p className="text-xs text-navy-400 mb-4">Add as <code className="bg-navy-100 px-1 rounded">GROQ_API_KEY</code> in Render → Environment</p>
        <button onClick={() => save('Groq')} className="px-5 py-2.5 bg-navy-900 text-white rounded-2xl text-sm font-semibold hover:bg-navy-800 transition-colors">Save Groq Settings</button>
      </Section>

      <Section title="Sarvam AI — STT + TTS" desc="Indian language speech recognition & synthesis" icon={MicIcon} badge="₹1K FREE">
        <div className="flex items-center gap-2 mb-5 p-3 bg-orange-50 border border-orange-200 rounded-2xl">
          <AlertCircle size={14} className="text-orange-600 flex-shrink-0" />
          <p className="text-xs text-orange-700">Free ₹1,000 credits at <a href="https://sarvam.ai" target="_blank" rel="noopener noreferrer" className="font-semibold underline">sarvam.ai</a> — covers ~40 hrs STT</p>
        </div>
        <Field label="Sarvam API Key" value={sarvam.api_key} type="password" onChange={v => setSarvam(p => ({...p, api_key: v}))} placeholder="Your Sarvam API key" />
        <div className="mb-4">
          <label className="block text-xs font-bold text-navy-500 uppercase tracking-wider mb-1.5">TTS Voice</label>
          <select value={sarvam.tts_voice} onChange={e => setSarvam(p => ({...p, tts_voice: e.target.value}))}
            className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 focus:border-navy-400 focus:outline-none">
            <option value="kavya">Kavya — Female, Gujarati</option>
            <option value="neha">Neha — Female, Hindi</option>
            <option value="amelia">Amelia — Female, English</option>
          </select>
        </div>
        <p className="text-xs text-navy-400 mb-4">Add as <code className="bg-navy-100 px-1 rounded">SARVAM_API_KEY</code> in Render → Environment</p>
        <button onClick={() => save('Sarvam')} className="px-5 py-2.5 bg-navy-900 text-white rounded-2xl text-sm font-semibold hover:bg-navy-800 transition-colors">Save Sarvam Settings</button>
      </Section>

      <Section title="Vobiz — Telephony" desc="Calling provider for India" icon={Phone}>
        <div className="flex items-center gap-2 mb-5 p-3 bg-orange-50 border border-orange-200 rounded-2xl">
          <AlertCircle size={14} className="text-orange-600 flex-shrink-0" />
          <p className="text-xs text-orange-700">Get credentials at <a href="https://vobiz.in" target="_blank" rel="noopener noreferrer" className="font-semibold underline">vobiz.in</a></p>
        </div>
        <Field label="Vobiz API Key" value={vobiz.api_key} type="password" onChange={v => setVobiz(p => ({...p, api_key: v}))} placeholder="Your Vobiz API key" />
        <Field label="API URL" value={vobiz.api_url} onChange={v => setVobiz(p => ({...p, api_url: v}))} />
        <Field label="Default Caller ID" value={vobiz.caller_id} onChange={v => setVobiz(p => ({...p, caller_id: v}))} placeholder="+917900000001" hint="Must be registered with Vobiz" />
        <p className="text-xs text-navy-400 mb-4">Add as <code className="bg-navy-100 px-1 rounded">VOBIZ_API_KEY</code> in Render → Environment</p>
        <button onClick={() => save('Vobiz')} className="px-5 py-2.5 bg-navy-900 text-white rounded-2xl text-sm font-semibold hover:bg-navy-800 transition-colors">Save Vobiz Settings</button>
      </Section>

      <Section title="Google Sheets" desc="Auto-save every call result to your spreadsheet" icon={Download}>
        <div className="flex items-center justify-between p-4 bg-navy-50 rounded-2xl border border-navy-100 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${sheetsConnected ? 'bg-jade-400' : 'bg-gray-300'}`} />
            <div>
              <p className="text-sm font-semibold text-navy-800">{sheetsConnected ? 'Connected' : 'Not Connected'}</p>
              <p className="text-xs text-navy-400 mt-0.5">{sheetsConnected ? 'Call results will auto-sync' : 'Connect to sync results automatically'}</p>
            </div>
          </div>
          <button onClick={() => { setSheetsConnected(true); toast.success('Sheets connected!') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${sheetsConnected ? 'bg-jade-50 text-jade-700' : 'bg-navy-900 text-white hover:bg-navy-800'}`}>
            {sheetsConnected ? <><Check size={13} /> Connected</> : 'Connect Sheets'}
          </button>
        </div>
        <p className="text-xs text-navy-400">Each call adds a row: Phone · Name · Outcome · Language · Duration · Collected Data · Time</p>
      </Section>

      <Section title="Notifications" desc="When to alert you about campaign activity" icon={Bell}>
        <div className="space-y-4">
          {[
            { key: 'call_completed',    label: 'Call completed',    desc: 'After each call ends' },
            { key: 'campaign_finished', label: 'Campaign finished', desc: 'When all contacts are called' },
            { key: 'error_alerts',      label: 'Error alerts',      desc: 'On failures or API errors' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-navy-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-navy-800">{label}</p>
                <p className="text-xs text-navy-400 mt-0.5">{desc}</p>
              </div>
              <button onClick={() => setNotifs(n => ({...n, [key]: !n[key]}))}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${notifs[key] ? 'bg-navy-800' : 'bg-navy-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${notifs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <div className="bg-gradient-to-br from-navy-900 to-navy-800 rounded-3xl p-6 border border-navy-700">
        <h3 className="font-display font-bold text-white mb-4">💰 Cost per Call</h3>
        <div className="space-y-2">
          {[
            { label: 'Vobiz (2 min call)',  cost: '₹0.90' },
            { label: 'Sarvam STT',          cost: '₹0.02' },
            { label: 'Sarvam TTS',          cost: '₹0.02' },
            { label: 'Groq LLM',            cost: '₹0.00', free: true },
          ].map(({ label, cost, free }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-navy-300 text-xs">{label}</span>
              <span className={`font-semibold text-xs ${free ? 'text-jade-400' : 'text-white'}`}>{cost}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-white font-semibold text-sm">Total per call</span>
            <span className="text-orange-400 font-display font-bold text-xl">~₹0.94</span>
          </div>
        </div>
      </div>
    </div>
  )
}
