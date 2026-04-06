import { useState, useEffect } from 'react'
import { settingsApi } from '../hooks/api'
import toast from 'react-hot-toast'
import { Save, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Copy, Phone, Bell, Key, AlertTriangle } from 'lucide-react'

const SKY  = '#0EA5E9', SKYD = '#0284C7'
const GRAD = 'linear-gradient(135deg,#38BDF8,#0EA5E9,#0284C7)'
const BG   = '#F0F9FF', BORD = '#BAE6FD', GLOW = '0 3px 16px rgba(14,165,233,.22)'

function Section({ title, desc, badge, action, children }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, marginBottom:14, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'18px 22px', borderBottom:`1px solid ${BG}` }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:0 }}>{title}</h3>
            {badge && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:BG, color:SKY, border:`1px solid ${BORD}` }}>{badge}</span>}
          </div>
          {desc && <p style={{ fontSize:12, color:'#9CA3AF', margin:'3px 0 0' }}>{desc}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding:'20px 22px' }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type='text', hint, readOnly, suffix }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>{label}</label>}
      <div style={{ position:'relative' }}>
        <input type={type} value={value} placeholder={placeholder} readOnly={readOnly}
          onChange={onChange ? e=>onChange(e.target.value) : undefined}
          style={{ width:'100%', padding:'11px 14px', paddingRight:suffix?44:14, border:`1.5px solid ${BORD}`, borderRadius:11, fontSize:14, color:readOnly?'#9CA3AF':'#0f172a', background:readOnly?BG:'#fff', fontFamily:'inherit', boxSizing:'border-box', outline:'none', transition:'border-color .15s, box-shadow .15s', cursor:readOnly?'not-allowed':'text' }}
          onFocus={e=>{if(!readOnly){e.target.style.borderColor=SKY;e.target.style.boxShadow=`0 0 0 3px rgba(14,165,233,.10)`}}}
          onBlur={e=>{e.target.style.borderColor=BORD;e.target.style.boxShadow='none'}}
        />
        {suffix && <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>{suffix}</div>}
      </div>
      {hint && <p style={{ fontSize:11, color:'#9CA3AF', margin:'5px 0 0' }}>{hint}</p>}
    </div>
  )
}

function Alert({ type='info', children }) {
  const s = { info:{bg:BG,border:BORD,color:SKYD}, success:{bg:'#ECFDF5',border:'#A7F3D0',color:'#065F46'}, warning:{bg:'#FFFBEB',border:'#FDE68A',color:'#92400E'}, danger:{bg:'#FEF2F2',border:'#FECACA',color:'#991B1B'} }[type]
  return <div style={{ padding:'12px 16px', borderRadius:12, background:s.bg, border:`1px solid ${s.border}`, color:s.color, fontSize:13, marginBottom:14, lineHeight:1.6 }}>{children}</div>
}

function Btn({ children, onClick, loading, disabled, variant='primary', size='md', icon:Icon }) {
  const sz = { sm:{padding:'7px 14px',fontSize:12}, md:{padding:'10px 20px',fontSize:13} }[size]
  const vr = {
    primary: { background:GRAD, color:'#fff', border:'none', boxShadow:GLOW },
    outline: { background:'#fff', color:'#374151', border:`1.5px solid ${BORD}`, boxShadow:'none' },
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

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'10px 0', borderBottom:`1px solid ${BG}` }}>
      <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{label}</span>
      <div onClick={()=>onChange(!checked)} style={{ width:40, height:22, borderRadius:11, background:checked?SKY:'#E5E7EB', position:'relative', transition:'background .2s', flexShrink:0, cursor:'pointer' }}>
        <div style={{ position:'absolute', top:3, left:checked?20:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.15)' }}/>
      </div>
    </label>
  )
}

export default function Settings() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [loading,        setLoading]       = useState(true)
  const [savingVobiz,    setSavingVobiz]   = useState(false)
  const [savingProfile,  setSavingProfile] = useState(false)
  const [testing,        setTesting]       = useState(false)
  const [testResult,     setTestResult]    = useState(null)
  const [showToken,      setShowToken]     = useState(false)
  const [showApiKey,     setShowApiKey]    = useState(false)
  const [copied,         setCopied]        = useState(false)
  const [originalToken,  setOriginalToken] = useState('')
  const [profile,  setProfile] = useState({ company_name:user.company_name||'', email:user.email||'' })
  const [vobiz,    setVobiz]   = useState({ vobiz_auth_id:'', vobiz_auth_token:'', vobiz_from_number:'' })
  const [apiKey,   setApiKey]  = useState(null)
  const [notifs,   setNotifs]  = useState({ call_completed:true, campaign_finished:true, error_alerts:true })

  useEffect(() => {
    settingsApi.get()
      .then(r => {
        const d = r.data
        setProfile(p => ({ ...p, company_name:d.company_name||p.company_name }))
        setVobiz({ vobiz_auth_id:d.vobiz_auth_id||'', vobiz_auth_token:d.vobiz_auth_token||'', vobiz_from_number:d.vobiz_from_number||'' })
        setOriginalToken(d.vobiz_auth_token||'')
        setApiKey(d.api_key||null)
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

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
      await settingsApi.update(p); toast.success('Credentials saved')
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
      setTestResult({ success:true, account:res.data.account }); toast.success('Connected ✅')
    } catch(err) {
      const msg = err.response?.data?.error||'Connection failed'
      setTestResult({ success:false, error:msg }); toast.error(msg)
    } finally { setTesting(false) }
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey||'').then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000) })
  }

  if (loading) return (
    <div style={{ padding:'24px 28px', background:BG, minHeight:'100%' }}>
      {[1,2,3].map(i => <div key={i} style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, padding:22, marginBottom:14, height:160, animation:'st-pulse 1.4s ease infinite' }}/>)}
      <style>{`@keyframes st-pulse{0%,100%{opacity:1}50%{opacity:.5}} @keyframes st-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:860, margin:'0 auto', background:BG, minHeight:'100%' }}>
      <style>{`@keyframes st-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Profile */}
      <Section title="Profile" desc="Your account details" badge="Account"
        action={<Btn onClick={saveProfile} loading={savingProfile} icon={Save} size="sm">Save</Btn>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Company Name" value={profile.company_name} onChange={v=>setProfile(p=>({...p,company_name:v}))} placeholder="RiseAscend Technologies"/>
          <Field label="Email" value={profile.email} readOnly hint="Contact support to change email"/>
        </div>
      </Section>

      {/* Telephony */}
      <Section title="Telephony" desc="Configure your calling credentials" badge="Required">
        <Alert type="info">
          Get your Auth ID and Token from <strong>Telephony Dashboard → API Settings</strong>. Your caller ID must be approved before use.
        </Alert>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Auth ID" value={vobiz.vobiz_auth_id} onChange={v=>setVobiz(p=>({...p,vobiz_auth_id:v}))} placeholder="VA-XXXXXXXXXX"/>
          <Field label="Auth Token" type={showToken?'text':'password'} value={vobiz.vobiz_auth_token}
            onChange={v=>setVobiz(p=>({...p,vobiz_auth_token:v}))} placeholder="Your secret token"
            suffix={<button type="button" onClick={()=>setShowToken(s=>!s)} style={{ background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',display:'flex',padding:0 }}>{showToken?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
          />
        </div>
        <Field label="Caller ID" value={vobiz.vobiz_from_number} onChange={v=>setVobiz(p=>({...p,vobiz_from_number:v}))} placeholder="+919876543210" hint="Must be an approved DID number on your account"/>
        {testResult && (
          <Alert type={testResult.success?'success':'danger'}>
            {testResult.success ? `✅ Connected! Account: ${testResult.account||'Active'}` : `❌ ${testResult.error}`}
          </Alert>
        )}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Btn onClick={testVobiz} loading={testing} variant="outline" icon={Phone} size="sm">Test Connection</Btn>
          <Btn onClick={saveVobiz} loading={savingVobiz} icon={Save} size="sm">Save Credentials</Btn>
        </div>
      </Section>

      {/* API Key */}
      <Section title="API Key" desc="Integrate SamwadAI with your own systems" badge="Developer">
        {apiKey ? (
          <>
            <Alert type="warning">Keep your API key secret. Never expose it in frontend code.</Alert>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ flex:1, position:'relative' }}>
                <input type={showApiKey?'text':'password'} value={apiKey} readOnly
                  style={{ width:'100%', padding:'11px 44px 11px 14px', border:`1.5px solid ${BORD}`, borderRadius:11, fontSize:13, color:'#374151', background:BG, fontFamily:'monospace', boxSizing:'border-box', outline:'none' }}/>
                <button type="button" onClick={()=>setShowApiKey(s=>!s)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', display:'flex' }}>
                  {showApiKey?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
              <Btn onClick={copyKey} variant="outline" size="sm" icon={copied?CheckCircle2:Copy}>{copied?'Copied!':'Copy'}</Btn>
            </div>
          </>
        ) : (
          <p style={{ fontSize:13, color:'#9CA3AF' }}>No API key yet. Contact support to enable API access.</p>
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notifications" desc="Choose when to receive alerts" badge="Alerts">
        <Toggle checked={notifs.call_completed}   onChange={v=>setNotifs(n=>({...n,call_completed:v}))}   label="Notify when a call completes"/>
        <Toggle checked={notifs.campaign_finished} onChange={v=>setNotifs(n=>({...n,campaign_finished:v}))} label="Notify when a campaign finishes"/>
        <Toggle checked={notifs.error_alerts}      onChange={v=>setNotifs(n=>({...n,error_alerts:v}))}      label="Error and failure alerts"/>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone" desc="These actions cannot be undone">
        <Alert type="danger">Irreversible actions. Please be absolutely certain before proceeding.</Alert>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <Btn variant="danger" size="sm" icon={XCircle}>Delete All Campaign Data</Btn>
          <Btn variant="danger" size="sm" icon={XCircle}>Delete Account</Btn>
        </div>
      </Section>
    </div>
  )
}
