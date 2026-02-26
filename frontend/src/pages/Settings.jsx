import { useState } from 'react'
import toast from 'react-hot-toast'
import { Phone, Bell, Shield, AlertCircle, Check, Download, Cpu, Mic } from 'lucide-react'

function Section({ title, desc, badge, children }) {
  return (
    <div className="card mb-5 overflow-hidden">
      <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid #f5f1ea' }}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>{title}</h3>
            {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#dcf3e5', color: '#228248' }}>{badge}</span>}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: '#a8a8a8' }}>{desc}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', hint, readOnly }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder} readOnly={readOnly}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        className="input-field" style={readOnly ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
      {hint && <p className="text-[11px] mt-1" style={{ color: '#a8a8a8' }}>{hint}</p>}
    </div>
  )
}

function InfoBanner({ color, children }) {
  const styles = {
    amber: { background: '#fffbf0', border: '1px solid #fde59a', color: '#8f540f' },
    green: { background: '#f0faf4', border: '1px solid #b8e6cb', color: '#1c673a' },
    blue:  { background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1' },
  }
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl mb-5 text-[12px]" style={styles[color]}>
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

export default function Settings() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [profile, setProfile] = useState({ company_name: user.company_name || '', email: user.email || '' })
  const [vobiz,   setVobiz]   = useState({ api_key: '', api_url: 'https://api.vobiz.in/v1', caller_id: '' })
  const [sarvam,  setSarvam]  = useState({ api_key: '', tts_voice: 'kavya' })
  const [groq,    setGroq]    = useState({ api_key: '', model: 'llama-3.1-70b-versatile' })
  const [sheetsOk, setSheetsOk] = useState(false)
  const [notifs,  setNotifs]  = useState({ call_completed: true, campaign_finished: true, error_alerts: true })

  const save = (s) => toast.success(`${s} saved — add keys to Render env vars to activate`)

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#8a8a8a' }}>Configure your account and integrations</p>
      </div>

      {/* Profile */}
      <Section title="Profile" desc="Your account information">
        <Field label="Company Name" value={profile.company_name} onChange={v => setProfile(p => ({...p, company_name: v}))} placeholder="Your company" />
        <Field label="Email" value={profile.email} type="email" readOnly hint="Cannot be changed after signup" />
        <button onClick={() => save('Profile')} className="btn-primary">Save Profile</button>
      </Section>

      {/* Groq */}
      <Section title="Groq — AI Brain" desc="Powers all AI conversations" badge="FREE">
        <InfoBanner color="green">
          Free tier: 14,400 requests/day. Get your key at{' '}
          <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">console.groq.com</a>
        </InfoBanner>
        <Field label="API Key" value={groq.api_key} type="password" onChange={v => setGroq(p => ({...p, api_key: v}))} placeholder="gsk_..." />
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>Model</label>
          <select value={groq.model} onChange={e => setGroq(p => ({...p, model: e.target.value}))} className="input-field" style={{ cursor: 'pointer' }}>
            <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile (Recommended)</option>
            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Faster)</option>
          </select>
        </div>
        <p className="text-[11px] mb-4" style={{ color: '#a8a8a8' }}>
          Add as <code className="px-1 py-0.5 rounded" style={{ background: '#f5f1ea' }}>GROQ_API_KEY</code> in Render → Environment
        </p>
        <button onClick={() => save('Groq')} className="btn-primary">Save</button>
      </Section>

      {/* Sarvam */}
      <Section title="Sarvam AI — Voice" desc="Speech recognition & synthesis for Indian languages" badge="₹1K FREE">
        <InfoBanner color="amber">
          Free ₹1,000 credits at{' '}
          <a href="https://sarvam.ai" target="_blank" rel="noopener noreferrer" className="font-semibold underline">sarvam.ai</a>
          {' '}— covers ~40 hours of calls
        </InfoBanner>
        <Field label="API Key" value={sarvam.api_key} type="password" onChange={v => setSarvam(p => ({...p, api_key: v}))} placeholder="Your Sarvam API key" />
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>Voice</label>
          <select value={sarvam.tts_voice} onChange={e => setSarvam(p => ({...p, tts_voice: e.target.value}))} className="input-field" style={{ cursor: 'pointer' }}>
            <option value="kavya">Kavya — Female, Gujarati</option>
            <option value="neha">Neha — Female, Hindi</option>
            <option value="amelia">Amelia — Female, English</option>
          </select>
        </div>
        <p className="text-[11px] mb-4" style={{ color: '#a8a8a8' }}>
          Add as <code className="px-1 py-0.5 rounded" style={{ background: '#f5f1ea' }}>SARVAM_API_KEY</code> in Render → Environment
        </p>
        <button onClick={() => save('Sarvam')} className="btn-primary">Save</button>
      </Section>

      {/* Vobiz */}
      <Section title="Vobiz — Telephony" desc="Calling provider for India">
        <InfoBanner color="amber">
          Get credentials at{' '}
          <a href="https://vobiz.in" target="_blank" rel="noopener noreferrer" className="font-semibold underline">vobiz.in</a>
        </InfoBanner>
        <Field label="API Key" value={vobiz.api_key} type="password" onChange={v => setVobiz(p => ({...p, api_key: v}))} placeholder="Your Vobiz API key" />
        <Field label="API URL" value={vobiz.api_url} onChange={v => setVobiz(p => ({...p, api_url: v}))} />
        <Field label="Default Caller ID" value={vobiz.caller_id} onChange={v => setVobiz(p => ({...p, caller_id: v}))} placeholder="+917900000001" hint="Must be registered with Vobiz" />
        <p className="text-[11px] mb-4" style={{ color: '#a8a8a8' }}>
          Add as <code className="px-1 py-0.5 rounded" style={{ background: '#f5f1ea' }}>VOBIZ_API_KEY</code> in Render → Environment
        </p>
        <button onClick={() => save('Vobiz')} className="btn-primary">Save</button>
      </Section>

      {/* Google Sheets */}
      <Section title="Google Sheets" desc="Automatically save call results to your spreadsheet">
        <div className="flex items-center justify-between p-4 rounded-xl mb-4" style={{ background: '#faf8f4', border: '1px solid #e8e3db' }}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: sheetsOk ? '#52b87c' : '#dcdcdc' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#2c2c2c' }}>{sheetsOk ? 'Connected' : 'Not Connected'}</p>
              <p className="text-[11px]" style={{ color: '#a8a8a8' }}>{sheetsOk ? 'Call results sync automatically' : 'Connect to sync results'}</p>
            </div>
          </div>
          <button onClick={() => { setSheetsOk(true); toast.success('Sheets connected!') }}
            className={sheetsOk ? 'btn-secondary' : 'btn-primary'} style={{ padding: '8px 16px', fontSize: '13px' }}>
            {sheetsOk ? <><Check size={13} /> Connected</> : 'Connect'}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: '#a8a8a8' }}>Each call adds: Phone · Name · Outcome · Language · Duration · Collected data · Time</p>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" desc="Alert preferences for campaign activity">
        <div className="space-y-1">
          {[
            { key: 'call_completed',    label: 'Call completed',    desc: 'After each call ends' },
            { key: 'campaign_finished', label: 'Campaign finished', desc: 'When all contacts are called' },
            { key: 'error_alerts',      label: 'Error alerts',      desc: 'On failures or API errors' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid #f5f1ea' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#2c2c2c' }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#a8a8a8' }}>{desc}</p>
              </div>
              <button onClick={() => setNotifs(n => ({...n, [key]: !n[key]}))}
                className="relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0"
                style={{
                  background: notifs[key] ? '#1a1a1a' : '#e8e3db',
                  width: '42px', height: '24px',
                }}>
                <div className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: notifs[key] ? '21px' : '3px' }} />
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
