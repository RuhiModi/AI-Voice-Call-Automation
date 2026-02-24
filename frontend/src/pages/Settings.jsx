import { useState } from 'react'
import toast from 'react-hot-toast'
import { Phone, Key, Bell, Shield, ExternalLink, AlertCircle, Globe, Check, Download } from 'lucide-react'

const DEMO = localStorage.getItem('demo_mode')

function MicIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function Section({ title, desc, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-3xl border border-ink-100 overflow-hidden mb-5 animate-slide-up">
      <div className="flex items-center gap-4 px-7 py-5 border-b border-ink-50">
        <div className="w-10 h-10 bg-ink-50 rounded-xl flex items-center justify-center">
          <Icon size={18} className="text-ink-600" />
        </div>
        <div>
          <h3 className="font-display font-bold text-ink-900">{title}</h3>
          <p className="text-xs text-ink-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="p-7">{children}</div>
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ink-50 border border-ink-100 rounded-2xl px-4 py-3 text-sm text-ink-800 placeholder-ink-300 focus:border-ink-300 transition-all"
      />
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function Settings() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [profile, setProfile] = useState({
    company_name: user.company_name || '',
    email: user.email || '',
  })

  const [vobiz, setVobiz] = useState({
    api_key: '',
    api_url: 'https://api.vobiz.in/v1',
    default_caller_id: '',
  })

  const [exotel, setExotel] = useState({
    sid: '',
    token: '',
    subdomain: '',
  })

  const [openai, setOpenai] = useState({
    api_key: '',
    model: 'gpt-4o-mini',
  })

  const [google, setGoogle] = useState({
    project_id: '',
    sheets_connected: false,
  })

  const [notifications, setNotifications] = useState({
    call_completed: true,
    campaign_finished: true,
    error_alerts: true,
  })

  function save(section) {
    toast.success(`${section} settings saved!`)
  }

  function connectSheets() {
    if (DEMO) {
      setGoogle(g => ({ ...g, sheets_connected: true }))
      toast.success('Demo: Google Sheets connected!')
      return
    }
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google/sheets?state=${user.id}`
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display font-bold text-3xl text-ink-900">Settings</h1>
        <p className="text-ink-400 text-sm mt-1">Configure your account, telephony, and integrations</p>
      </div>

      <Section title="Profile" desc="Your account information" icon={Shield}>
        <InputField label="Company Name" value={profile.company_name} onChange={v => setProfile(p => ({ ...p, company_name: v }))} placeholder="Your company name" />
        <InputField label="Email" value={profile.email} type="email" onChange={v => setProfile(p => ({ ...p, email: v }))} placeholder="you@company.com" hint="Email cannot be changed after signup" />
        <button onClick={() => save('Profile')} className="px-5 py-2.5 bg-ink-900 text-white rounded-2xl text-sm font-semibold hover:bg-ink-800 transition-colors">
          Save Profile
        </button>
      </Section>

      <Section title="Vobiz Telephony" desc="Primary telephony provider for India calls" icon={Phone}>
        <div className="flex items-center gap-2 mb-5 p-3 bg-saffron-50 border border-saffron-200 rounded-2xl">
          <AlertCircle size={14} className="text-saffron-600 flex-shrink-0" />
          <p className="text-xs text-saffron-700">
            Get credentials from <a href="https://vobiz.in" target="_blank" rel="noopener noreferrer" className="font-semibold underline">vobiz.in</a>
          </p>
        </div>
        <InputField label="Vobiz API Key" value={vobiz.api_key} type="password" onChange={v => setVobiz(p => ({ ...p, api_key: v }))} placeholder="Your Vobiz API key" />
        <InputField label="API URL" value={vobiz.api_url} onChange={v => setVobiz(p => ({ ...p, api_url: v }))} placeholder="https://api.vobiz.in/v1" />
        <InputField label="Default Caller ID" value={vobiz.default_caller_id} onChange={v => setVobiz(p => ({ ...p, default_caller_id: v }))} placeholder="+917900000001" hint="Must be a registered number with Vobiz" />
        <button onClick={() => save('Vobiz')} className="px-5 py-2.5 bg-ink-900 text-white rounded-2xl text-sm font-semibold hover:bg-ink-800 transition-colors">
          Save Vobiz Settings
        </button>
      </Section>

      <Section title="Exotel Telephony" desc="Backup telephony provider" icon={Phone}>
        <div className="flex items-center gap-2 mb-5 p-3 bg-ink-50 border border-ink-100 rounded-2xl">
          <Globe size={14} className="text-ink-500 flex-shrink-0" />
          <p className="text-xs text-ink-500">
            Free trial at <a href="https://exotel.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">exotel.com</a>
          </p>
        </div>
        <InputField label="Exotel SID" value={exotel.sid} onChange={v => setExotel(p => ({ ...p, sid: v }))} placeholder="Your Exotel account SID" />
        <InputField label="Exotel Token" value={exotel.token} type="password" onChange={v => setExotel(p => ({ ...p, token: v }))} placeholder="Your Exotel auth token" />
        <InputField label="Subdomain" value={exotel.subdomain} onChange={v => setExotel(p => ({ ...p, subdomain: v }))} placeholder="yourcompany.exotel.com" />
        <button onClick={() => save('Exotel')} className="px-5 py-2.5 bg-ink-900 text-white rounded-2xl text-sm font-semibold hover:bg-ink-800 transition-colors">
          Save Exotel Settings
        </button>
      </Section>

      <Section title="OpenAI (AI Brain)" desc="GPT-4o mini powers all conversations" icon={MicIcon}>
        <div className="flex items-center gap-2 mb-5 p-3 bg-jade-50 border border-jade-200 rounded-2xl">
          <Check size={14} className="text-jade-600 flex-shrink-0" />
          <p className="text-xs text-jade-700">
            Using <strong>gpt-4o-mini</strong> — ~₹0.04 per call. Get key from{' '}
            <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">platform.openai.com</a>
          </p>
        </div>
        <InputField label="OpenAI API Key" value={openai.api_key} type="password" onChange={v => setOpenai(p => ({ ...p, api_key: v }))} placeholder="sk-proj-..." />
        <div className="mb-4">
          <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">Model</label>
          <select value={openai.model} onChange={e => setOpenai(p => ({ ...p, model: e.target.value }))} className="w-full bg-ink-50 border border-ink-100 rounded-2xl px-4 py-3 text-sm text-ink-800 focus:border-ink-300">
            <option value="gpt-4o-mini">gpt-4o-mini (Recommended — cheapest)</option>
            <option value="gpt-4o">gpt-4o (More capable, 10x cost)</option>
          </select>
        </div>
        <button onClick={() => save('OpenAI')} className="px-5 py-2.5 bg-ink-900 text-white rounded-2xl text-sm font-semibold hover:bg-ink-800 transition-colors">
          Save OpenAI Settings
        </button>
      </Section>

      <Section title="Google Cloud" desc="STT + TTS for Gujarati, Hindi, English" icon={MicIcon}>
        <div className="flex items-center gap-2 mb-5 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
          <AlertCircle size={14} className="text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Enable <strong>Speech-to-Text</strong> and <strong>Text-to-Speech</strong> APIs. New accounts get $300 free credit.
          </p>
        </div>
        <InputField label="Google Cloud Project ID" value={google.project_id} onChange={v => setGoogle(p => ({ ...p, project_id: v }))} placeholder="ai-voice-saas-123456" hint="Found in Google Cloud Console dashboard" />
        <div className="mb-4">
          <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">Service Account JSON</label>
          <div className="flex items-center gap-3 border-2 border-dashed border-ink-200 rounded-2xl p-4">
            <div className="flex-1">
              <p className="text-sm text-ink-600 font-medium">google-service-account.json</p>
              <p className="text-xs text-ink-400 mt-0.5">Upload in Render → Environment → GOOGLE_APPLICATION_CREDENTIALS_JSON</p>
            </div>
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800 font-medium whitespace-nowrap">
              Open Console <ExternalLink size={11} />
            </a>
          </div>
        </div>
        <button onClick={() => save('Google Cloud')} className="px-5 py-2.5 bg-ink-900 text-white rounded-2xl text-sm font-semibold hover:bg-ink-800 transition-colors">
          Save Google Settings
        </button>
      </Section>

      <Section title="Google Sheets" desc="Auto-save call results to your spreadsheet" icon={Download}>
        <div className="flex items-center justify-between p-4 bg-ink-50 rounded-2xl border border-ink-100 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${google.sheets_connected ? 'bg-jade-400' : 'bg-gray-300'}`} />
            <div>
              <p className="text-sm font-semibold text-ink-800">{google.sheets_connected ? 'Connected' : 'Not Connected'}</p>
              <p className="text-xs text-ink-400 mt-0.5">{google.sheets_connected ? 'Call results will auto-sync' : 'Connect to sync call results'}</p>
            </div>
          </div>
          <button
            onClick={connectSheets}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${google.sheets_connected ? 'bg-jade-50 text-jade-700 hover:bg-jade-100' : 'bg-ink-900 text-white hover:bg-ink-800'}`}
          >
            {google.sheets_connected ? <><Check size={13} /> Connected</> : 'Connect Google Sheets'}
          </button>
        </div>
        <p className="text-xs text-ink-400">Each completed call adds a row: Phone, Name, Outcome, Language, Duration, Data, Timestamp</p>
      </Section>

      <Section title="Notifications" desc="When to notify you about campaign activity" icon={Bell}>
        <div className="space-y-4">
          {[
            { key: 'call_completed', label: 'Call completed', desc: 'Notify after each call ends' },
            { key: 'campaign_finished', label: 'Campaign finished', desc: 'Notify when all contacts are called' },
            { key: 'error_alerts', label: 'Error alerts', desc: 'Notify on call failures or API errors' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-ink-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-ink-800">{label}</p>
                <p className="text-xs text-ink-400 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${notifications[key] ? 'bg-ink-800' : 'bg-ink-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${notifications[key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <div className="bg-gradient-to-br from-ink-900 to-ink-800 rounded-3xl p-6 border border-ink-700">
        <h3 className="font-display font-bold text-white mb-4">💰 Cost per Call</h3>
        <div className="space-y-2">
          {[
            { label: 'Vobiz (2 min call)', cost: '₹0.90' },
            { label: 'Google STT', cost: '₹0.06' },
            { label: 'GPT-4o mini', cost: '₹0.04' },
            { label: 'Google TTS', cost: '₹0.04' },
          ].map(({ label, cost }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-ink-300 text-xs">{label}</span>
              <span className="text-white font-semibold text-xs">{cost}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-white font-semibold text-sm">Total per call</span>
            <span className="text-saffron-400 font-display font-bold text-xl">~₹1.05</span>
          </div>
        </div>
      </div>
    </div>
  )
}
