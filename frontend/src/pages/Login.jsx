// src/pages/Login.jsx
// Handles: login · signup · forgot-password
// Auth methods: Email/password · Google OAuth · Phone/OTP (UI ready)
// Tab controllable via URL: /login?tab=signup

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Zap, Shield, Phone, Mail, ChevronLeft } from 'lucide-react'
import { authApi, passwordApi } from '../hooks/api'
import Logo from '../components/Logo'

// ─── Brand ──────────────────────────────────────────────────────
const B = {
  primary:  '#FF6B35',
  grad:     'linear-gradient(135deg,#FF8C42 0%,#FF6B35 50%,#E63946 100%)',
  glow:     '0 4px 24px rgba(255,107,53,.35)',
  glowHover:'0 8px 36px rgba(255,107,53,.50)',
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// Floating label input
function Input({ label, type = 'text', value, onChange, placeholder, autoComplete, suffix }) {
  const [focused, setFocused] = useState(false)
  const active = focused || !!value
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <label style={{
        position: 'absolute', left: 14,
        top: active ? 7 : '50%',
        transform: active ? 'none' : 'translateY(-50%)',
        fontSize: active ? 10 : 14,
        fontWeight: active ? 700 : 400,
        color: active ? B.primary : '#9CA3AF',
        transition: 'all .15s', pointerEvents: 'none', zIndex: 1,
        letterSpacing: active ? '0.04em' : 0,
        textTransform: active ? 'uppercase' : 'none',
      }}>{label}</label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={focused ? placeholder : ''}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          padding: active ? '22px 14px 8px' : '14px',
          paddingRight: suffix ? 44 : 14,
          border: `1.5px solid ${focused ? B.primary : '#E5E7EB'}`,
          borderRadius: 12, fontSize: 14, color: '#0f0f0f',
          background: '#fff', boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 3px rgba(255,107,53,.10)' : 'none',
          transition: 'all .15s', outline: 'none',
          fontFamily: '"Plus Jakarta Sans","DM Sans",sans-serif',
        }}
      />
      {suffix && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{suffix}</div>
      )}
    </div>
  )
}

function SocialBtn({ icon, label, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '11px 16px', borderRadius: 12,
        border: `1.5px solid ${hover ? '#D1D5DB' : '#E5E7EB'}`,
        background: hover ? '#F9FAFB' : '#fff',
        cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
        transition: 'all .15s', fontFamily: '"Plus Jakarta Sans","DM Sans",sans-serif',
      }}>
      {icon}{label}
    </button>
  )
}

function Divider({ label = 'or continue with email' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
    </div>
  )
}

function BrandPanel({ view }) {
  const txt = {
    login:  ['Welcome back', 'Your campaigns are waiting for you.'],
    signup: ['Start calling smarter', 'First campaign ready in under 5 minutes.'],
    forgot: ["No worries, we've got you", 'A reset link is on its way.'],
  }[view] || ['Welcome','']

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '60px 56px', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg,#0f0f0f 0%,#1a0805 55%,#200c08 100%)',
    }}>
      {/* spinning rings */}
      {[200,320,440].map((sz,i) => (
        <div key={i} style={{
          position: 'absolute', top: '38%', left: '44%',
          transform: 'translate(-50%,-50%)',
          width: sz, height: sz, borderRadius: '50%',
          border: `1px solid rgba(255,107,53,${0.13 - i*0.03})`,
          animation: `lp-spin ${16+i*5}s linear infinite${i%2?' reverse':''}`,
          pointerEvents: 'none',
        }} />
      ))}
      <div style={{ position:'absolute', top:'38%', left:'44%', transform:'translate(-50%,-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,53,.08) 0%,transparent 65%)', pointerEvents:'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 400 }}>
        <Logo dark size="md" />
        <h2 style={{ fontSize: 'clamp(22px,2.8vw,36px)', fontWeight: 800, color: '#fff', marginTop: 36, marginBottom: 12, lineHeight: 1.15, letterSpacing: '-0.025em' }}>{txt[0]}</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,.4)', lineHeight: 1.7, marginBottom: 36 }}>{txt[1]}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['🗣️','Gujarati, Hindi & English AI'],['📞','Bulk campaigns — thousands of calls'],['📊','Live dashboard & transcripts'],['💰','Pay-per-minute, no subscription']].map(([icon,label]) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{icon}</div>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.5)', fontWeight:500 }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:28, marginTop:40, paddingTop:32, borderTop:'1px solid rgba(255,255,255,.07)' }}>
          {[['1M+','Calls Made'],['98%','Uptime'],['₹1/min','Starting at']].map(([v,l]) => (
            <div key={l}>
              <p style={{ fontSize:21, fontWeight:900, color:B.primary, margin:0, letterSpacing:'-0.02em' }}>{v}</p>
              <p style={{ fontSize:9, color:'rgba(255,255,255,.22)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes lp-spin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────
export default function Login() {
  const navigate   = useNavigate()
  const [params]   = useSearchParams()

  const [view,      setView]      = useState(params.get('tab') || 'login')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [company,   setCompany]   = useState('')
  const [phone,     setPhone]     = useState('')
  const [otp,       setOtp]       = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [method,    setMethod]    = useState('email')
  const [otpSent,   setOtpSent]   = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => { const t = params.get('tab'); if (t) setView(t) }, [params])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return toast.error('Email is required')
    if (view === 'forgot') {
      setLoading(true)
      try {
        await passwordApi.forgot(email)
        toast.success('Reset link sent! Check your inbox.')
        setView('login')
      } catch (err) { toast.error(err.response?.data?.error || 'Failed to send reset link') }
      finally { setLoading(false) }
      return
    }
    if (!password) return toast.error('Password is required')
    if (view === 'signup' && !company) return toast.error('Company name is required')
    if (view === 'signup' && password.length < 8) return toast.error('Minimum 8 characters')
    setLoading(true)
    try {
      if (view === 'login') {
        const res = await authApi.login(email, password)
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user',  JSON.stringify(res.data.user))
        toast.success('Welcome back! 👋')
        navigate('/dashboard')
      } else {
        await authApi.signup(email, password, company)
        toast.success('Account created! Please sign in.')
        setView('login'); setPassword('')
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Something went wrong') }
    finally { setLoading(false) }
  }

  function handleGoogle() {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    window.location.href = `${API}/auth/google`
  }

  async function handleSendOtp() {
    if (phone.replace(/\D/g,'').length < 10) return toast.error('Enter a valid 10-digit number')
    setLoading(true)
    try {
      toast.success(`OTP sent to ${phone}`)
      setOtpSent(true); setCountdown(30)
    } finally { setLoading(false) }
  }

  const switchView = view === 'login' ? 'signup' : 'login'
  const switchLabel = view === 'login' ? 'Create one free' : 'Sign in'
  const btnLabel = view === 'login' ? <><Zap size={16}/>Sign In</> : view === 'signup' ? <><ArrowRight size={16}/>Create Account</> : 'Send Reset Link'

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'"Plus Jakarta Sans","DM Sans",sans-serif', background:'#F7F8FA' }}>

      {/* Brand panel */}
      <div className="hidden lg:flex" style={{ width:'46%', flexShrink:0 }}>
        <BrandPanel view={view} />
      </div>

      {/* Form panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 32px', background:'#fff', overflowY:'auto', boxShadow:'-1px 0 20px rgba(0,0,0,.04)' }}>

        <div className="lg:hidden" style={{ marginBottom:28 }}><Logo size="md" /></div>

        <div style={{ maxWidth:420, width:'100%', margin:'0 auto' }}>

          {/* Back button */}
          {view === 'forgot' && (
            <button onClick={() => setView('login')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0, fontFamily:'inherit' }}>
              <ChevronLeft size={16}/> Back to sign in
            </button>
          )}

          {/* Title */}
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:26, fontWeight:800, color:'#0f0f0f', marginBottom:6, letterSpacing:'-0.025em', lineHeight:1.2 }}>
              {view === 'login'  ? 'Sign in to SamwadAI' :
               view === 'signup' ? 'Create your account' :
               'Reset your password'}
            </h1>
            {view !== 'forgot' && (
              <p style={{ fontSize:14, color:'#9CA3AF' }}>
                {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => setView(switchView)} style={{ color:B.primary, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit' }}>{switchLabel}</button>
              </p>
            )}
          </div>

          {/* Social buttons */}
          {view !== 'forgot' && (
            <>
              <div style={{ display:'flex', gap:10 }}>
                <SocialBtn icon={<GoogleIcon/>} label="Google" onClick={handleGoogle} />
                <SocialBtn
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="#374151" strokeWidth="1.8"/><circle cx="12" cy="17" r="1" fill="#374151"/></svg>}
                  label="Phone OTP"
                  onClick={() => setMethod(m => m==='phone'?'email':'phone')}
                />
              </div>
              <p style={{ fontSize:10, color:'#D1D5DB', textAlign:'center', margin:'8px 0 0', fontWeight:600 }}>Google & Phone require backend integration</p>
              <Divider />
            </>
          )}

          {/* Phone OTP form */}
          {method === 'phone' && view !== 'forgot' ? (
            <div>
              <Input label="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel"
                suffix={!otpSent && <button type="button" onClick={handleSendOtp} disabled={loading||countdown>0} style={{ fontSize:11, fontWeight:700, color:B.primary, background:'none', border:'none', cursor:'pointer', padding:0 }}>{countdown>0?`${countdown}s`:loading?'...':'Send OTP'}</button>}
              />
              {otpSent && <Input label="OTP Code" type="text" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit code" autoComplete="one-time-code"/>}
              <button type="button" onClick={() => toast.error('Phone OTP login coming soon — please use email')} disabled={loading}
                style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:B.grad, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:B.glow, fontFamily:'inherit' }}>
                Verify & Sign In
              </button>
              <button type="button" onClick={() => {setMethod('email');setOtpSent(false)}} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', margin:'14px auto 0', padding:0, fontFamily:'inherit' }}>
                <Mail size={14}/> Use email instead
              </button>
            </div>

          ) : (
            /* Email form */
            <form onSubmit={handleSubmit}>
              {view === 'signup' && (
                <Input label="Company Name" value={company} onChange={e=>setCompany(e.target.value)} placeholder="RiseAscend Technologies" autoComplete="organization"/>
              )}
              <Input label="Email Address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"/>
              {view !== 'forgot' && (
                <Input label="Password" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder={view==='signup'?'At least 8 characters':'Your password'}
                  autoComplete={view==='signup'?'new-password':'current-password'}
                  suffix={<button type="button" onClick={()=>setShowPass(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, display:'flex', lineHeight:0 }}>{showPass?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
                />
              )}
              {view === 'login' && (
                <div style={{ textAlign:'right', marginBottom:18, marginTop:-8 }}>
                  <button type="button" onClick={()=>setView('forgot')} style={{ fontSize:12, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>Forgot password?</button>
                </div>
              )}
              {view === 'signup' && (
                <p style={{ fontSize:11, color:'#9CA3AF', marginBottom:16, lineHeight:1.5 }}>
                  By signing up you agree to our <a href="#" style={{ color:B.primary, textDecoration:'none', fontWeight:600 }}>Terms</a> & <a href="#" style={{ color:B.primary, textDecoration:'none', fontWeight:600 }}>Privacy Policy</a>.
                </p>
              )}
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:loading?'#F3F4F6':B.grad, color:loading?'#9CA3AF':'#fff', fontSize:15, fontWeight:800, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':B.glow, transition:'all .2s', fontFamily:'inherit' }}
                onMouseEnter={e=>{if(!loading)e.currentTarget.style.boxShadow=B.glowHover}}
                onMouseLeave={e=>{if(!loading)e.currentTarget.style.boxShadow=B.glow}}>
                {loading ? 'Please wait...' : btnLabel}
              </button>
            </form>
          )}

          {/* Trust row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, marginTop:26, paddingTop:20, borderTop:'1px solid #F3F4F6', flexWrap:'wrap' }}>
            {[[<Shield size={12} color="#10B981"/>,'Encrypted'],[<Phone size={12} color="#3B82F6"/>,'Indian numbers'],[<Zap size={12} color={B.primary}/>,'TRAI compliant']].map(([icon,text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:5 }}>
                {icon}<span style={{ fontSize:11, color:'#9CA3AF', fontWeight:500 }}>{text}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:'#D1D5DB', textAlign:'center', marginTop:14 }}>© 2026 RiseAscend Technologies · SamwadAI</p>
        </div>
      </div>
    </div>
  )
}
