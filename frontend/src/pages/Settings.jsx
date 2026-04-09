import { useState, useEffect } from 'react'
import { settingsApi, sheetsApi } from '../hooks/api'
import toast from 'react-hot-toast'
import {
  Save, Eye, EyeOff, CheckCircle2, XCircle,
  Loader2, Copy, Phone, Bell, Key, AlertTriangle,
  RefreshCw, ExternalLink, Unlink, Link2, Webhook,
  Database, ShieldCheck, Info, ChevronDown, ChevronRight
} from 'lucide-react'

const API  = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const SKY  = '#0EA5E9', SKYD = '#0284C7'
const GRAD = 'linear-gradient(135deg,#38BDF8,#0EA5E9,#0284C7)'
const BG   = '#F0F9FF', BORD = '#BAE6FD', GLOW = '0 3px 16px rgba(14,165,233,.22)'

// ── Reusable UI ───────────────────────────────────────────────

function Section({ title, desc, badge, action, children, collapsible=false }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, marginBottom:14, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'18px 22px', borderBottom:open?`1px solid ${BG}`:'none', cursor:collapsible?'pointer':'default' }}
        onClick={collapsible?()=>setOpen(o=>!o):undefined}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:0 }}>{title}</h3>
            {badge && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:BG, color:SKY, border:`1px solid ${BORD}` }}>{badge}</span>}
          </div>
          {desc && <p style={{ fontSize:12, color:'#9CA3AF', margin:'3px 0 0' }}>{desc}</p>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {action && <div onClick={e=>e.stopPropagation()}>{action}</div>}
          {collapsible && (open ? <ChevronDown size={16} color="#9CA3AF"/> : <ChevronRight size={16} color="#9CA3AF"/>)}
        </div>
      </div>
      {open && <div style={{ padding:'20px 22px' }}>{children}</div>}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type='text', hint, readOnly, suffix, mono=false }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>{label}</label>}
      <div style={{ position:'relative' }}>
        <input type={type} value={value} placeholder={placeholder} readOnly={readOnly}
          onChange={onChange ? e=>onChange(e.target.value) : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ width:'100%', padding:'11px 14px', paddingRight:suffix?44:14, border:`1.5px solid ${focused&&!readOnly?SKY:BORD}`, borderRadius:11, fontSize:14, color:readOnly?'#9CA3AF':'#0f172a', background:readOnly?BG:'#fff', fontFamily:mono?'monospace':'inherit', boxSizing:'border-box', outline:'none', transition:'border-color .15s, box-shadow .15s', cursor:readOnly?'not-allowed':'text', boxShadow:focused&&!readOnly?`0 0 0 3px rgba(14,165,233,.10)`:'none' }}
        />
        {suffix && <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>{suffix}</div>}
      </div>
      {hint && <p style={{ fontSize:11, color:'#9CA3AF', margin:'5px 0 0' }}>{hint}</p>}
    </div>
  )
}

function InfoBox({ type='info', children }) {
  const s = { info:{bg:BG,border:BORD,color:SKYD,icon:'ℹ️'}, success:{bg:'#ECFDF5',border:'#A7F3D0',color:'#065F46',icon:'✅'}, warning:{bg:'#FFFBEB',border:'#FDE68A',color:'#92400E',icon:'⚠️'}, danger:{bg:'#FEF2F2',border:'#FECACA',color:'#991B1B',icon:'🚫'} }[type]
  return (
    <div style={{ display:'flex', gap:10, padding:'12px 14px', borderRadius:12, background:s.bg, border:`1px solid ${s.border}`, color:s.color, fontSize:13, marginBottom:14, lineHeight:1.6 }}>
      <span style={{ flexShrink:0, fontSize:14 }}>{s.icon}</span>
      <div style={{ flex:1 }}>{children}</div>
    </div>
  )
}

function Btn({ children, onClick, loading, disabled, variant='primary', size='md', icon:Icon }) {
  const sz = { sm:{padding:'7px 14px',fontSize:12}, md:{padding:'10px 20px',fontSize:13} }[size]
  const vr = {
    primary: { background:GRAD, color:'#fff', border:'none', boxShadow:GLOW },
    outline: { background:'#fff', color:'#374151', border:`1.5px solid ${BORD}`, boxShadow:'none' },
    sky:     { background:BG, color:SKY, border:`1.5px solid ${BORD}`, boxShadow:'none' },
    danger:  { background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', boxShadow:'none' },
  }[variant]
  return (
    <button onClick={onClick} disabled={loading||disabled}
      style={{ display:'inline-flex', alignItems:'center', gap:7, borderRadius:10, fontWeight:700, fontFamily:'inherit', cursor:loading||disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, transition:'all .15s', ...sz, ...vr }}>
      {loading ? <Loader2 size={14} style={{ animation:'st-spin .7s linear infinite' }}/> : Icon ? <Icon size={14}/> : null}
      {children}
    </button>
  )
}

function Toggle({ checked, onChange, label, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:`1px solid ${BG}` }}>
      <div>
        <p style={{ fontSize:13, color:'#374151', fontWeight:600, margin:0 }}>{label}</p>
        {sub && <p style={{ fontSize:11, color:'#9CA3AF', margin:'2px 0 0' }}>{sub}</p>}
      </div>
      <div onClick={()=>onChange(!checked)} style={{ width:42, height:24, borderRadius:12, background:checked?SKY:'#E5E7EB', position:'relative', transition:'background .2s', flexShrink:0, cursor:'pointer' }}>
        <div style={{ position:'absolute', top:4, left:checked?22:4, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.15)' }}/>
      </div>
    </div>
  )
}

// ── Connected badge ───────────────────────────────────────────
function ConnectedBadge({ connected }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:connected?'#ECFDF5':'#F9FAFB', color:connected?'#065F46':'#9CA3AF', border:connected?'1px solid #A7F3D0':'1px solid #E5E7EB' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:connected?'#10B981':'#D1D5DB' }}/>
      {connected ? 'Connected' : 'Not connected'}
    </span>
  )
}

// ── Main Settings ─────────────────────────────────────────────
export default function Settings() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Loading states
  const [loading,       setLoading]      = useState(true)
  const [savingVobiz,   setSavingVobiz]  = useState(false)
  const [savingProfile, setSavingProfile]= useState(false)
  const [testing,       setTesting]      = useState(false)
  const [testingWH,     setTestingWH]    = useState(false)
  const [regenerating,  setRegenerating] = useState(false)
  const [disconnectingSheet, setDisconnectingSheet] = useState(false)

  // UI states
  const [testResult,   setTestResult]   = useState(null)
  const [whTestResult, setWhTestResult] = useState(null)
  const [showToken,    setShowToken]    = useState(false)
  const [showApiKey,   setShowApiKey]   = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [originalToken,setOriginalToken]= useState('')

  // Form data
  const [profile, setProfile] = useState({ company_name:user.company_name||'', email:user.email||'' })
  const [vobiz,   setVobiz]   = useState({ vobiz_auth_id:'', vobiz_auth_token:'', vobiz_from_number:'' })
  const [apiKey,  setApiKey]  = useState(null)
  const [notifs,  setNotifs]  = useState({ call_completed:true, campaign_finished:true, error_alerts:true, low_balance:true })
  const [webhook, setWebhook] = useState({ url:'', secret:'' })

  // Integration states
  const [sheetsConnected, setSheetsConnected] = useState(false)
  const [sheetsEmail,     setSheetsEmail]     = useState('')

  useEffect(() => {
    Promise.all([
      settingsApi.get(),
      sheetsApi.status().catch(() => ({ data: { connected: false } })),
    ]).then(([r, sh]) => {
      const d = r.data
      setProfile(p => ({ ...p, company_name:d.company_name||p.company_name }))
      setVobiz({ vobiz_auth_id:d.vobiz_auth_id||'', vobiz_auth_token:d.vobiz_auth_token||'', vobiz_from_number:d.vobiz_from_number||'' })
      setOriginalToken(d.vobiz_auth_token||'')
      setApiKey(d.api_key||null)
      if (d.webhook_url) setWebhook({ url:d.webhook_url||'', secret:d.webhook_secret||'' })
      setSheetsConnected(sh.data?.connected || false)
      setSheetsEmail(sh.data?.email || '')
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  // ── Handlers ─────────────────────────────────────────────────
  async function saveProfile() {
    setSavingProfile(true)
    try { await settingsApi.update({ company_name:profile.company_name }); toast.success('Profile saved') }
    catch { toast.error('Save failed') }
    finally { setSavingProfile(false) }
  }

  async function saveVobiz() {
    setSavingVobiz(true); setTestResult(null)
    try {
      const p = { ...vobiz }
      if (p.vobiz_auth_token === originalToken) delete p.vobiz_auth_token
      await settingsApi.update(p)
      toast.success('Credentials saved ✅')
    } catch { toast.error('Save failed') }
    finally { setSavingVobiz(false) }
  }

  async function testVobiz() {
    setTesting(true); setTestResult(null)
    try {
      const p = { ...vobiz }
      if (p.vobiz_auth_token === originalToken) delete p.vobiz_auth_token
      await settingsApi.update(p)
      const res = await settingsApi.testVobiz()
      setTestResult({ ok:true, msg:`Account verified: ${res.data.account?.name||'Active'}` })
      toast.success('Vobiz connected ✅')
    } catch(err) {
      const msg = err.response?.data?.error||'Connection failed'
      setTestResult({ ok:false, msg })
      toast.error(msg)
    } finally { setTesting(false) }
  }

  async function saveWebhook() {
    try {
      await settingsApi.update({ webhook_url:webhook.url, webhook_secret:webhook.secret })
      toast.success('Webhook URL saved')
    } catch { toast.error('Save failed') }
  }

  async function testWebhook() {
    if (!webhook.url) return toast.error('Enter a webhook URL first')
    setTestingWH(true); setWhTestResult(null)
    try {
      const res = await settingsApi.testWebhook(webhook.url, webhook.secret)
      setWhTestResult({ ok:true, msg:`Ping successful (${res.data.status||200})` })
      toast.success('Webhook reachable ✅')
    } catch(err) {
      setWhTestResult({ ok:false, msg:err.response?.data?.error||'Unreachable' })
      toast.error('Webhook test failed')
    } finally { setTestingWH(false) }
  }

  function connectSheets() {
    const token = localStorage.getItem('token')
    window.location.href = `${API}/auth/google-sheets?token=${token}`
  }

  async function disconnectSheets() {
    setDisconnectingSheet(true)
    try {
      await sheetsApi.disconnect()
      setSheetsConnected(false); setSheetsEmail('')
      toast.success('Google Sheets disconnected')
    } catch { toast.error('Disconnect failed') }
    finally { setDisconnectingSheet(false) }
  }

  async function regenKey() {
    if (!confirm('This will invalidate your existing API key. Continue?')) return
    setRegenerating(true)
    try {
      const res = await settingsApi.regenerateApiKey()
      setApiKey(res.data.api_key)
      toast.success('New API key generated')
    } catch { toast.error('Failed') }
    finally { setRegenerating(false) }
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey||'').then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000) })
  }

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) return (
    <div style={{ padding:'24px 28px', background:BG, minHeight:'100%' }}>
      {[180,160,140,120].map((h,i) => (
        <div key={i} style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, height:h, marginBottom:14, animation:'st-pulse 1.4s ease infinite' }}/>
      ))}
      <style>{`@keyframes st-pulse{0%,100%{opacity:1}50%{opacity:.5}} @keyframes st-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:860, margin:'0 auto', background:BG, minHeight:'100%' }}>
      <style>{`@keyframes st-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── PROFILE ── */}
      <Section title="Profile" desc="Your account details" badge="Account"
        action={<Btn onClick={saveProfile} loading={savingProfile} icon={Save} size="sm">Save</Btn>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Company Name" value={profile.company_name} onChange={v=>setProfile(p=>({...p,company_name:v}))} placeholder="RiseAscend Technologies"/>
          <Field label="Email" value={profile.email} readOnly hint="Contact support to change email"/>
        </div>
      </Section>

      {/* ── TELEPHONY — Per-user Vobiz credentials ── */}
      <Section title="Telephony — Vobiz" desc="Your personal calling credentials stored securely" badge="Required">

        <InfoBox type="info">
          <strong>Each user has their own Vobiz account.</strong> Your Auth ID, Auth Token, and Caller ID are stored privately in the database against your account only — not in Render environment variables. This means every user can use a different Vobiz account, and your credentials are never shared.
        </InfoBox>

        {!vobiz.vobiz_auth_id && !vobiz.vobiz_auth_token && (
          <InfoBox type="warning">
            No credentials saved yet. Your campaigns won't be able to make calls until you save valid Vobiz credentials below.
          </InfoBox>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field
            label="Vobiz Auth ID"
            value={vobiz.vobiz_auth_id}
            onChange={v=>setVobiz(p=>({...p,vobiz_auth_id:v}))}
            placeholder="VA-XXXXXXXXXX"
            hint="From Vobiz Dashboard → API Settings"
          />
          <Field
            label="Auth Token"
            type={showToken?'text':'password'}
            value={vobiz.vobiz_auth_token}
            onChange={v=>setVobiz(p=>({...p,vobiz_auth_token:v}))}
            placeholder="Your secret auth token"
            suffix={
              <button type="button" onClick={()=>setShowToken(s=>!s)} style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',display:'flex',padding:0 }}>
                {showToken?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            }
          />
        </div>

        <Field
          label="Caller ID (From Number)"
          value={vobiz.vobiz_from_number}
          onChange={v=>setVobiz(p=>({...p,vobiz_from_number:v}))}
          placeholder="+919876543210"
          hint="Must be an approved DID/Virtual number on your Vobiz account"
        />

        {/* Credential status */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, background:vobiz.vobiz_auth_id&&vobiz.vobiz_auth_token?'#ECFDF5':BG, border:`1px solid ${vobiz.vobiz_auth_id&&vobiz.vobiz_auth_token?'#A7F3D0':BORD}`, marginBottom:14 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:vobiz.vobiz_auth_id&&vobiz.vobiz_auth_token?'#10B981':'#D1D5DB', flexShrink:0 }}/>
          <span style={{ fontSize:13, color:vobiz.vobiz_auth_id&&vobiz.vobiz_auth_token?'#065F46':'#9CA3AF', fontWeight:500 }}>
            {vobiz.vobiz_auth_id&&vobiz.vobiz_auth_token
              ? `Credentials saved — Auth ID: ${vobiz.vobiz_auth_id}`
              : 'No credentials saved yet'}
          </span>
        </div>

        {testResult && (
          <InfoBox type={testResult.ok?'success':'danger'}>{testResult.msg}</InfoBox>
        )}

        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Btn onClick={testVobiz} loading={testing} variant="outline" icon={Phone} size="sm">Test Connection</Btn>
          <Btn onClick={saveVobiz} loading={savingVobiz} icon={Save} size="sm">Save Credentials</Btn>
        </div>

        {/* How credentials flow explainer */}
        <div style={{ marginTop:16, padding:'14px 16px', borderRadius:12, background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>How it works</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              ['1.','You save your Vobiz Auth ID + Token here → stored encrypted in your user row in the database'],
              ['2.','When a campaign launches, the scheduler reads your credentials from DB → uses them to dial via Vobiz API'],
              ['3.','If no credentials found → falls back to shared credentials in Render env (for testing only)'],
              ['4.','Each user can have a completely different Vobiz account, caller ID, and rate plan'],
            ].map(([n,t]) => (
              <div key={n} style={{ display:'flex', gap:8, fontSize:12, color:'#64748B' }}>
                <span style={{ fontWeight:700, color:SKY, flexShrink:0 }}>{n}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── GOOGLE SHEETS INTEGRATION ── */}
      <Section title="Google Sheets" desc="Auto-sync every call result to your spreadsheet in real-time"
        badge={sheetsConnected?'Connected':'Not connected'}>

        <InfoBox type="info">
          After every call ends, SamwadAI automatically appends a row with: <strong>Phone · Name · Outcome · Language · Duration · Collected Data · Transcript · Timestamp</strong>. Your team can see results live without logging in.
        </InfoBox>

        {sheetsConnected ? (
          <>
            {/* Connected state */}
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:14, background:'#ECFDF5', border:'1px solid #A7F3D0', marginBottom:16 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'#fff', border:'1px solid #A7F3D0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📊</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#065F46', margin:0 }}>Google Sheets Connected</p>
                {sheetsEmail && <p style={{ fontSize:12, color:'#6EE7B7', margin:'2px 0 0' }}>{sheetsEmail}</p>}
                <p style={{ fontSize:11, color:'#6EE7B7', margin:'2px 0 0' }}>Call results will auto-append to your sheet after every call</p>
              </div>
              <ConnectedBadge connected={true}/>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>
                Default Spreadsheet URL
              </label>
              <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 8px' }}>Set a default sheet for all campaigns, or override per-campaign in campaign settings</p>
              <div style={{ display:'flex', gap:10 }}>
                <input placeholder="https://docs.google.com/spreadsheets/d/..." style={{ flex:1, padding:'10px 14px', border:`1.5px solid ${BORD}`, borderRadius:11, fontSize:13, color:'#374151', background:'#fff', fontFamily:'inherit', outline:'none' }} onFocus={e=>e.target.style.borderColor=SKY} onBlur={e=>e.target.style.borderColor=BORD}/>
                <Btn variant="sky" size="sm" icon={Save}>Save</Btn>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <Btn onClick={connectSheets} variant="outline" icon={RefreshCw} size="sm">Re-authorise</Btn>
              <Btn onClick={disconnectSheets} loading={disconnectingSheet} variant="danger" icon={Unlink} size="sm">Disconnect</Btn>
            </div>
          </>
        ) : (
          <>
            {/* Not connected state */}
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:14, background:'#F8FAFC', border:'1px solid #E2E8F0', marginBottom:16 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'#fff', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📊</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:600, color:'#374151', margin:0 }}>Google Sheets not connected</p>
                <p style={{ fontSize:12, color:'#9CA3AF', margin:'3px 0 0' }}>Connect once and all your campaigns will auto-sync results</p>
              </div>
              <ConnectedBadge connected={false}/>
            </div>

            {/* What gets synced */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8, marginBottom:16 }}>
              {[['📞','Phone Number'],['👤','Contact Name'],['✅','Call Outcome'],['🗣️','Language'],['⏱️','Duration'],['📋','Collected Data'],['💬','Transcript'],['🕐','Timestamp']].map(([ic,l])=>(
                <div key={l} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 12px', borderRadius:9, background:'#fff', border:`1px solid ${BORD}`, fontSize:12, color:'#374151', fontWeight:500 }}>
                  <span style={{ fontSize:14 }}>{ic}</span>{l}
                </div>
              ))}
            </div>

            <Btn onClick={connectSheets} icon={Link2}>
              Connect Google Sheets
            </Btn>
          </>
        )}

        {/* Transcript storage note */}
        <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
          <p style={{ fontSize:12, color:'#64748B', margin:0 }}>
            <strong style={{ color:'#374151' }}>Full transcripts & collected data</strong> are also always stored in your SamwadAI database under each campaign's Call Logs tab — Google Sheets is an additional live sync.
          </p>
        </div>
      </Section>

      {/* ── WEBHOOK ── */}
      <Section title="Webhook" desc="POST call results to your own server or CRM after each call" badge="Developers" collapsible>
        <InfoBox type="info">
          After every call ends, SamwadAI sends a POST request to your URL with the full call payload: phone, outcome, duration, transcript, collected_data, campaign_id, and timestamp.
        </InfoBox>

        <Field
          label="Webhook URL"
          value={webhook.url}
          onChange={v=>setWebhook(w=>({...w,url:v}))}
          placeholder="https://your-server.com/samwad-webhook"
          hint="Must be a publicly accessible HTTPS URL"
        />
        <Field
          label="Secret Key (optional)"
          type="password"
          value={webhook.secret}
          onChange={v=>setWebhook(w=>({...w,secret:v}))}
          placeholder="Used to sign the HMAC-SHA256 header"
          hint="We'll include X-SamwadAI-Signature in each request"
        />

        {whTestResult && (
          <InfoBox type={whTestResult.ok?'success':'danger'}>{whTestResult.msg}</InfoBox>
        )}

        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Btn onClick={testWebhook} loading={testingWH} variant="outline" icon={Webhook} size="sm">Send Test Ping</Btn>
          <Btn onClick={saveWebhook} icon={Save} size="sm">Save Webhook</Btn>
        </div>

        {/* Payload preview */}
        <div style={{ marginTop:16 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>Example Payload</p>
          <pre style={{ background:'#0f172a', borderRadius:12, padding:'16px', fontSize:11, color:'#7DD3FA', overflowX:'auto', margin:0, lineHeight:1.7 }}>{`{
  "event": "call.completed",
  "call_id": "uuid",
  "campaign_id": "uuid",
  "phone": "+919876543210",
  "contact_name": "Rajesh Bhai",
  "outcome": "completed",
  "language": "gu",
  "duration_sec": 134,
  "transcript": [
    { "role": "assistant", "content": "નમસ્તે..." },
    { "role": "user",      "content": "હા, સાચું છે" }
  ],
  "collected_data": { "confirmed": true },
  "timestamp": "2026-04-09T10:30:00.000Z"
}`}</pre>
        </div>
      </Section>

      {/* ── API KEY ── */}
      <Section title="API Key" desc="Pull your call data programmatically" badge="Developer" collapsible>
        {apiKey ? (
          <>
            <InfoBox type="warning">Keep this secret. Anyone with this key can read your call data via the API.</InfoBox>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
              <div style={{ flex:1, position:'relative' }}>
                <input type={showApiKey?'text':'password'} value={apiKey} readOnly
                  style={{ width:'100%', padding:'11px 44px 11px 14px', border:`1.5px solid ${BORD}`, borderRadius:11, fontSize:13, color:'#374151', background:BG, fontFamily:'monospace', boxSizing:'border-box', outline:'none' }}/>
                <button type="button" onClick={()=>setShowApiKey(s=>!s)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', display:'flex' }}>
                  {showApiKey?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
              <Btn onClick={copyKey} variant="outline" size="sm" icon={copied?CheckCircle2:Copy}>{copied?'Copied!':'Copy'}</Btn>
            </div>
            <Btn onClick={regenKey} loading={regenerating} variant="danger" icon={RefreshCw} size="sm">Regenerate Key</Btn>
          </>
        ) : (
          <>
            <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:14 }}>No API key yet. Generate one to pull call data programmatically.</p>
            <Btn onClick={regenKey} loading={regenerating} icon={Key} size="sm">Generate API Key</Btn>
          </>
        )}
      </Section>

      {/* ── NOTIFICATIONS ── */}
      <Section title="Notifications" desc="Control when SamwadAI alerts you" badge="Alerts" collapsible>
        <Toggle checked={notifs.call_completed}   onChange={v=>setNotifs(n=>({...n,call_completed:v}))}    label="Call completed" sub="Alert after every individual call ends"/>
        <Toggle checked={notifs.campaign_finished} onChange={v=>setNotifs(n=>({...n,campaign_finished:v}))} label="Campaign finished" sub="Alert when all contacts in a campaign are processed"/>
        <Toggle checked={notifs.low_balance}       onChange={v=>setNotifs(n=>({...n,low_balance:v}))}       label="Low wallet balance" sub="Alert when balance drops below ₹100"/>
        <Toggle checked={notifs.error_alerts}      onChange={v=>setNotifs(n=>({...n,error_alerts:v}))}      label="Error alerts" sub="Alerts for failed calls, credential errors, etc."/>
      </Section>

      {/* ── DANGER ZONE ── */}
      <Section title="Danger Zone" desc="Irreversible actions — use with caution" collapsible>
        <InfoBox type="danger">These actions cannot be undone. Your data will be permanently deleted.</InfoBox>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Btn variant="danger" size="sm" icon={XCircle}>Delete All Campaign Data</Btn>
          <Btn variant="danger" size="sm" icon={XCircle}>Delete Account</Btn>
        </div>
      </Section>
    </div>
  )
}
