import { useState, useEffect } from 'react'
import { settingsApi } from '../hooks/api'
import toast from 'react-hot-toast'
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader, AlertCircle, Check } from 'lucide-react'

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
    red:   { background: '#fff0f0', border: '1px solid #fecaca', color: '#b91c1c' },
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

  const [loading,       setLoading]       = useState(true)
  const [savingVobiz,   setSavingVobiz]   = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [testing,       setTesting]       = useState(false)
  const [testResult,    setTestResult]    = useState(null)
  const [showToken,     setShowToken]     = useState(false)
  const [originalToken, setOriginalToken] = useState('')
  const [sheetsOk,      setSheetsOk]      = useState(false)
  const [notifs,        setNotifs]        = useState({
    call_completed: true, campaign_finished: true, error_alerts: true,
  })
  const [groq,   setGroq]   = useState({ api_key: '', model: 'llama-3.1-8b-instant' })
  const [sarvam, setSarvam] = useState({ api_key: '', tts_voice: 'kavya' })

  const [profile, setProfile] = useState({
    company_name: user.company_name || '',
    email:        user.email        || '',
  })

  const [vobiz, setVobiz] = useState({
    vobiz_auth_id:     '',
    vobiz_auth_token:  '',
    vobiz_from_number: '',
  })

  // Load saved Vobiz + profile from DB
  useEffect(() => {
    async function load() {
      try {
        const res = await settingsApi.get()
        const d   = res.data
        setProfile(p => ({ ...p, company_name: d.company_name || p.company_name }))
        setVobiz({
          vobiz_auth_id:     d.vobiz_auth_id     || '',
          vobiz_auth_token:  d.vobiz_auth_token  || '',
          vobiz_from_number: d.vobiz_from_number || '',
        })
        setOriginalToken(d.vobiz_auth_token || '')
      } catch {
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Save Vobiz credentials to DB
  async function handleSaveVobiz() {
    setSavingVobiz(true)
    setTestResult(null)
    try {
      const payload = { ...vobiz }
      // Don't send masked token back if unchanged
      if (payload.vobiz_auth_token === originalToken) delete payload.vobiz_auth_token
      await settingsApi.update(payload)
      toast.success('Vobiz credentials saved ✅')
      // Reload to get new masked token
      const res = await settingsApi.get()
      const masked = res.data.vobiz_auth_token || ''
      setOriginalToken(masked)
      setVobiz(v => ({ ...v, vobiz_auth_token: masked }))
    } catch {
      toast.error('Save failed')
    } finally {
      setSavingVobiz(false)
    }
  }

  // Test Vobiz connection
  async function handleTestVobiz() {
    setTesting(true)
    setTestResult(null)
    try {
      // Save first so test uses latest creds
      const payload = { ...vobiz }
      if (payload.vobiz_auth_token === originalToken) delete payload.vobiz_auth_token
      await settingsApi.update(payload)

      const res = await settingsApi.testVobiz()
      setTestResult({ success: true, account: res.data.account })
      toast.success('Connected to Vobiz ✅')
    } catch (err) {
      const msg = err.response?.data?.error || 'Connection failed'
      setTestResult({ success: false, error: msg })
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  // Save profile to DB
  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      await settingsApi.update({ company_name: profile.company_name })
      toast.success('Profile saved ✅')
    } catch {
      toast.error('Save failed')
    } finally {
      setSavingProfile(false)
    }
  }

  const isTokenChanged = vobiz.vobiz_auth_token !== originalToken && !vobiz.vobiz_auth_token.includes('••')
  const hasVobizCreds  = vobiz.vobiz_auth_id && vobiz.vobiz_auth_token

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#8a8a8a' }}>Configure your account and integrations</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────── */}
      <Section title="Profile" desc="Your account information">
        <Field label="Company Name" value={profile.company_name}
          onChange={v => setProfile(p => ({ ...p, company_name: v }))} placeholder="Your company" />
        <Field label="Email" value={profile.email} type="email" readOnly hint="Cannot be changed after signup" />
        <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary">
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </button>
      </Section>

      {/* ── Vobiz Credentials (saved to DB) ─────────────────── */}
      <Section title="Vobiz — Telephony" desc="Your calling account credentials — saved securely to your profile">

        {/* Status badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
          style={{ background: hasVobizCreds ? '#f0faf4' : '#fffbf0', border: hasVobizCreds ? '1px solid #b8e6cb' : '1px solid #fde59a' }}>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: hasVobizCreds ? '#52b87a' : '#f59e0b' }}/>
          <div>
            <p className="text-[12px] font-semibold" style={{ color: hasVobizCreds ? '#1c673a' : '#8f540f' }}>
              {hasVobizCreds ? 'Credentials configured — campaigns will use your Vobiz account' : 'Credentials not set — campaigns cannot make calls'}
            </p>
          </div>
        </div>

        <InfoBanner color="blue">
          Find your credentials at <strong>app.vobiz.ai</strong> → Account → API Access.
          Your Auth ID starts with <strong>SA</strong>.
        </InfoBanner>

        {/* Auth ID */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>
            Auth ID *
          </label>
          <input
            value={vobiz.vobiz_auth_id}
            onChange={e => setVobiz(v => ({ ...v, vobiz_auth_id: e.target.value }))}
            placeholder="e.g. SAXXXXXXXXXXXXXXXXXX"
            className="input-field"
          />
        </div>

        {/* Auth Token */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>
            Auth Token *
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={vobiz.vobiz_auth_token}
              onChange={e => setVobiz(v => ({ ...v, vobiz_auth_token: e.target.value }))}
              placeholder="Your Vobiz auth token"
              className="input-field"
              style={{ paddingRight: '44px' }}
            />
            <button onClick={() => setShowToken(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#a8a8a8' }}>
              {showToken ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {isTokenChanged && (
            <p className="text-[11px] mt-1" style={{ color: '#f59e0b' }}>● New token — will be saved</p>
          )}
        </div>

        {/* From Number */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>
            Default From Number *
          </label>
          <input
            value={vobiz.vobiz_from_number}
            onChange={e => setVobiz(v => ({ ...v, vobiz_from_number: e.target.value }))}
            placeholder="+919876543210"
            className="input-field"
          />
          <p className="text-[11px] mt-1" style={{ color: '#a8a8a8' }}>
            Used for all campaigns unless overridden on a specific campaign
          </p>
        </div>

        {/* Test result */}
        {testResult && (
          <div className="flex items-start gap-3 p-3 rounded-xl mb-4 text-[12px]"
            style={testResult.success
              ? { background: '#f0faf4', border: '1px solid #b8e6cb' }
              : { background: '#fff0f0', border: '1px solid #fecaca' }}>
            {testResult.success
              ? <CheckCircle size={15} style={{ color: '#228248', flexShrink: 0, marginTop: 1 }}/>
              : <XCircle    size={15} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 1 }}/>}
            <div>
              {testResult.success ? (
                <>
                  <p className="font-semibold" style={{ color: '#1c673a' }}>Connected successfully!</p>
                  {testResult.account?.username && <p style={{ color: '#4a9e6a' }}>Account: {testResult.account.username}</p>}
                  {testResult.account?.cash_credits !== undefined && <p style={{ color: '#4a9e6a' }}>Balance: ₹{testResult.account.cash_credits}</p>}
                </>
              ) : (
                <>
                  <p className="font-semibold" style={{ color: '#b91c1c' }}>Connection failed</p>
                  <p style={{ color: '#ef4444' }}>{testResult.error}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={handleTestVobiz} disabled={testing || !vobiz.vobiz_auth_id || !vobiz.vobiz_auth_token}
            className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {testing ? <><Loader size={13} className="animate-spin"/> Testing...</> : '🔌 Test Connection'}
          </button>
          <button onClick={handleSaveVobiz} disabled={savingVobiz} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {savingVobiz ? 'Saving...' : <><Save size={13}/> Save Credentials</>}
          </button>
        </div>
      </Section>

      {/* ── Groq ────────────────────────────────────────────── */}
      <Section title="Groq — AI Brain" desc="Powers all AI conversations" badge="FREE">
        <InfoBanner color="green">
          Free tier: 14,400 requests/day. Get your key at{' '}
          <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">console.groq.com</a>
        </InfoBanner>
        <Field label="API Key" value={groq.api_key} type="password"
          onChange={v => setGroq(p => ({ ...p, api_key: v }))} placeholder="gsk_..." />
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>Model</label>
          <select value={groq.model} onChange={e => setGroq(p => ({ ...p, model: e.target.value }))}
            className="input-field" style={{ cursor: 'pointer' }}>
            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Faster — Recommended)</option>
            <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile (Smarter)</option>
          </select>
        </div>
        <p className="text-[11px] mb-4" style={{ color: '#a8a8a8' }}>
          Add as <code className="px-1 py-0.5 rounded" style={{ background: '#f5f1ea' }}>GROQ_API_KEY</code> in Render → Environment
        </p>
        <button onClick={() => toast.success('Add GROQ_API_KEY to Render env vars to activate')} className="btn-primary">Save</button>
      </Section>

      {/* ── Sarvam ──────────────────────────────────────────── */}
      <Section title="Sarvam AI — Voice" desc="Speech recognition & synthesis for Indian languages" badge="₹1K FREE">
        <InfoBanner color="amber">
          Free ₹1,000 credits at{' '}
          <a href="https://sarvam.ai" target="_blank" rel="noopener noreferrer" className="font-semibold underline">sarvam.ai</a>
          {' '}— covers ~40 hours of calls
        </InfoBanner>
        <Field label="API Key" value={sarvam.api_key} type="password"
          onChange={v => setSarvam(p => ({ ...p, api_key: v }))} placeholder="Your Sarvam API key" />
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6b6b6b' }}>Voice</label>
          <select value={sarvam.tts_voice} onChange={e => setSarvam(p => ({ ...p, tts_voice: e.target.value }))}
            className="input-field" style={{ cursor: 'pointer' }}>
            <option value="kavya">Kavya — Female, Gujarati</option>
            <option value="neha">Neha — Female, Hindi</option>
            <option value="amelia">Amelia — Female, English</option>
          </select>
        </div>
        <p className="text-[11px] mb-4" style={{ color: '#a8a8a8' }}>
          Add as <code className="px-1 py-0.5 rounded" style={{ background: '#f5f1ea' }}>SARVAM_API_KEY</code> in Render → Environment
        </p>
        <button onClick={() => toast.success('Add SARVAM_API_KEY to Render env vars to activate')} className="btn-primary">Save</button>
      </Section>

      {/* ── Google Sheets ────────────────────────────────────── */}
      <Section title="Google Sheets" desc="Automatically save call results to your spreadsheet">
        <div className="flex items-center justify-between p-4 rounded-xl mb-4"
          style={{ background: '#faf8f4', border: '1px solid #e8e3db' }}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: sheetsOk ? '#52b87c' : '#dcdcdc' }}/>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#2c2c2c' }}>{sheetsOk ? 'Connected' : 'Not Connected'}</p>
              <p className="text-[11px]" style={{ color: '#a8a8a8' }}>{sheetsOk ? 'Call results sync automatically' : 'Connect to sync results'}</p>
            </div>
          </div>
          <button onClick={() => { setSheetsOk(true); toast.success('Sheets connected!') }}
            className={sheetsOk ? 'btn-secondary' : 'btn-primary'}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {sheetsOk ? <><Check size={13}/> Connected</> : 'Connect'}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: '#a8a8a8' }}>Each call adds: Phone · Name · Outcome · Language · Duration · Collected data · Time</p>
      </Section>

      {/* ── Notifications ────────────────────────────────────── */}
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
              <button onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                className="relative rounded-full transition-all duration-200 flex-shrink-0"
                style={{ background: notifs[key] ? '#1a1a1a' : '#e8e3db', width: '42px', height: '24px' }}>
                <div className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: notifs[key] ? '21px' : '3px' }}/>
              </button>
            </div>
          ))}
        </div>
      </Section>

    </div>
  )
}
