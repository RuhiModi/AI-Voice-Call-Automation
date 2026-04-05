import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Shield, ChevronLeft, Phone, Mail, Zap } from 'lucide-react'
import { authApi, passwordApi } from '../hooks/api'
import Logo from '../components/Logo'

const S = {
  primary: '#0EA5E9',
  dark:    '#0284C7',
  deep:    '#0369A1',
  grad:    'linear-gradient(135deg,#38BDF8 0%,#0EA5E9 50%,#0284C7 100%)',
  heroGrad:'linear-gradient(160deg,#0C4A6E 0%,#075985 30%,#0284C7 65%,#38BDF8 100%)',
  light:   '#F0F9FF',
  border:  '#BAE6FD',
  glow:    '0 4px 24px rgba(14,165,233,.35)',
  glowHov: '0 8px 36px rgba(14,165,233,.55)',
}

// LinkedIn icon
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077B5">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
    </svg>
  )
}

// Floating label input
function FloatInput({ label, type='text', value, onChange, placeholder, autoComplete, suffix }) {
  const [focused, setFocused] = useState(false)
  const active = focused || !!value
  return (
    <div style={{ position:'relative', marginBottom:16 }}>
      <label style={{
        position:'absolute', left:14,
        top: active ? 7 : '50%',
        transform: active ? 'none' : 'translateY(-50%)',
        fontSize: active ? 10 : 14, fontWeight: active ? 700 : 400,
        color: active ? S.primary : '#9CA3AF',
        transition:'all .15s', pointerEvents:'none', zIndex:1,
        letterSpacing: active ? '0.04em' : 0, textTransform: active ? 'uppercase' : 'none',
      }}>{label}</label>
      <input type={type} value={value} onChange={onChange}
        placeholder={focused ? placeholder : ''}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width:'100%', padding: active ? '22px 14px 8px' : '14px',
          paddingRight: suffix ? 44 : 14,
          border:`1.5px solid ${focused ? S.primary : S.border}`,
          borderRadius:12, fontSize:14, color:'#0f0f0f',
          background:'#fff', boxSizing:'border-box',
          boxShadow: focused ? `0 0 0 3px rgba(14,165,233,.10)` : 'none',
          transition:'all .15s', outline:'none',
          fontFamily:'"Plus Jakarta Sans","DM Sans",sans-serif',
        }}
      />
      {suffix && <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>{suffix}</div>}
    </div>
  )
}

function SocialBtn({ icon, label, onClick, fullWidth=false }) {
  const [hover, setHover] = useState(false)
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        flex: fullWidth ? 'none' : 1, width: fullWidth ? '100%' : undefined,
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        padding:'11px 16px', borderRadius:12,
        border:`1.5px solid ${hover ? S.primary : S.border}`,
        background: hover ? S.light : '#fff',
        cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151',
        transition:'all .15s', fontFamily:'inherit',
      }}>
      {icon} {label}
    </button>
  )
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'18px 0' }}>
      <div style={{ flex:1, height:1, background:S.border }}/>
      <span style={{ fontSize:11, color:'#9CA3AF', fontWeight:600, whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
      <div style={{ flex:1, height:1, background:S.border }}/>
    </div>
  )
}

// OTP input boxes
function OTPInput({ value, onChange, length=6 }) {
  const refs = Array.from({ length }, () => useRef())
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length)

  function handleChange(i, v) {
    const d = v.replace(/\D/g,'').slice(-1)
    const next = [...digits]
    next[i] = d
    onChange(next.join(''))
    if (d && i < length-1) refs[i+1].current?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i-1].current?.focus()
  }

  return (
    <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:20 }}>
      {digits.map((d, i) => (
        <input key={i} ref={refs[i]} type="tel" inputMode="numeric" maxLength={1}
          value={d} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          style={{
            width:48, height:52, textAlign:'center', fontSize:22, fontWeight:800,
            border:`2px solid ${d ? S.primary : S.border}`,
            borderRadius:12, color:'#0f0f0f', background: d ? S.light : '#fff',
            outline:'none', transition:'all .15s', fontFamily:'inherit',
            boxShadow: d ? `0 0 0 3px rgba(14,165,233,.12)` : 'none',
          }}
        />
      ))}
    </div>
  )
}

// Left brand panel
function BrandPanel({ view }) {
  const copy = {
    phone:  ['Verify in seconds', 'Just enter your phone number and you\'re in.'],
    login:  ['Welcome back', 'Your campaigns are ready and waiting.'],
    signup: ['Start for free', 'Set up your first campaign in under 5 minutes.'],
    forgot: ['No worries', 'We\'ll send a reset link to your inbox.'],
  }[view] || ['Welcome','']

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'52px 52px 40px', position:'relative', overflow:'hidden', background:S.heroGrad }}>
      {/* Spinning rings */}
      {[200,320,440].map((sz,i) => (
        <div key={i} style={{ position:'absolute', top:'40%', left:'44%', transform:'translate(-50%,-50%)', width:sz, height:sz, borderRadius:'50%', border:`1px solid rgba(186,230,253,${0.15-i*0.03})`, animation:`lp-spin ${16+i*5}s linear infinite${i%2?' reverse':''}`, pointerEvents:'none' }}/>
      ))}
      <div style={{ position:'absolute', top:'40%', left:'44%', transform:'translate(-50%,-50%)', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,.08) 0%,transparent 65%)', pointerEvents:'none' }}/>

      {/* Logo */}
      <div style={{ position:'relative', zIndex:1 }}>
        <Logo dark size="md"/>
      </div>

      {/* Main copy */}
      <div style={{ position:'relative', zIndex:1 }}>
        <h2 style={{ fontSize:'clamp(24px,3vw,38px)', fontWeight:800, color:'#fff', marginBottom:14, lineHeight:1.15, letterSpacing:'-0.025em' }}>{copy[0]}</h2>
        <p style={{ fontSize:15, color:'rgba(255,255,255,.50)', lineHeight:1.7, marginBottom:36 }}>{copy[1]}</p>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['📞','Phone OTP — instant, no password'],['🗣️','Gujarati, Hindi & English AI'],['💰','₹1/min wallet billing'],['📊','Live dashboard & transcripts']].map(([ic,tx]) => (
            <div key={tx} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:'rgba(186,230,253,.12)', border:'1px solid rgba(186,230,253,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{ic}</div>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.5)', fontWeight:500 }}>{tx}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ position:'relative', zIndex:1, display:'flex', gap:28, paddingTop:28, borderTop:'1px solid rgba(186,230,253,.12)' }}>
        {[['1M+','Calls Made'],['98%','Uptime'],['₹1/min','Starting at']].map(([v,l]) => (
          <div key={l}>
            <p style={{ fontSize:21, fontWeight:900, color:'#7DD3FA', margin:0, letterSpacing:'-0.02em' }}>{v}</p>
            <p style={{ fontSize:9, color:'rgba(255,255,255,.25)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>{l}</p>
          </div>
        ))}
      </div>

      <style>{`@keyframes lp-spin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}`}</style>
    </div>
  )
}

export default function Login() {
  const navigate  = useNavigate()
  const [params]  = useSearchParams()

  // Views: 'phone' | 'otp' | 'email' | 'signup' | 'forgot'
  const [view,     setView]     = useState(params.get('tab') === 'signup' ? 'signup' : 'phone')
  const [phone,    setPhone]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [company,  setCompany]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [countdown,setCountdown]= useState(0)
  const [otpSent,  setOtpSent]  = useState(false)

  const panelView = view === 'otp' ? 'phone' : view === 'email' ? 'login' : view

  useEffect(() => {
    const t = params.get('tab')
    if (t === 'signup') setView('signup')
  }, [params])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c-1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ── Phone OTP send ──────────────────────────────────────────────
  async function handleSendOtp(e) {
    e?.preventDefault()
    const cleaned = phone.replace(/\D/g,'')
    if (cleaned.length < 10) return toast.error('Enter a valid 10-digit number')
    setLoading(true)
    try {
      // await authApi.sendOtp(phone) — wire up when backend is ready
      await new Promise(r => setTimeout(r, 800)) // simulate API
      toast.success(`OTP sent to ${phone}`)
      setOtpSent(true)
      setView('otp')
      setCountdown(30)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  // ── OTP verify ──────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e?.preventDefault()
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP')
    setLoading(true)
    try {
      // const res = await authApi.verifyOtp(phone, otp)
      // localStorage.setItem('token', res.data.token)
      // localStorage.setItem('user', JSON.stringify(res.data.user))
      // navigate('/dashboard')
      toast.error('OTP login backend not yet wired — use email for now')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  // ── Email login / signup ─────────────────────────────────────────
  async function handleEmail(e) {
    e?.preventDefault()
    if (!email) return toast.error('Email is required')
    if (view === 'forgot') {
      setLoading(true)
      try { await passwordApi.forgot(email); toast.success('Reset link sent!'); setView('phone') }
      catch (err) { toast.error(err.response?.data?.error || 'Failed') }
      finally { setLoading(false) }
      return
    }
    if (!password) return toast.error('Password is required')
    if (view === 'signup' && !company) return toast.error('Company name required')
    if (view === 'signup' && password.length < 8) return toast.error('Minimum 8 characters')
    setLoading(true)
    try {
      if (view === 'email') {
        const res = await authApi.login(email, password)
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user',  JSON.stringify(res.data.user))
        toast.success('Welcome back! 👋')
        navigate('/dashboard')
      } else {
        await authApi.signup(email, password, company)
        toast.success('Account created! Please sign in.')
        setView('phone'); setPassword('')
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Something went wrong') }
    finally { setLoading(false) }
  }

  // ── LinkedIn OAuth ───────────────────────────────────────────────
  function handleLinkedIn() {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    window.location.href = `${API}/auth/linkedin`
  }

  const Spinner = () => (
    <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'li-spin .7s linear infinite' }}/>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'"Plus Jakarta Sans","DM Sans",sans-serif', background:S.light }}>
      <style>{`@keyframes li-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Brand panel — desktop */}
      <div className="hidden lg:flex" style={{ width:'46%', flexShrink:0 }}>
        <BrandPanel view={panelView}/>
      </div>

      {/* Form panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 32px', background:'#fff', overflowY:'auto', boxShadow:'-1px 0 20px rgba(14,165,233,.06)' }}>

        {/* Mobile logo */}
        <div className="lg:hidden" style={{ marginBottom:28 }}><Logo size="md"/></div>

        <div style={{ maxWidth:420, width:'100%', margin:'0 auto' }}>

          {/* ══ PHONE VIEW ══ */}
          {view === 'phone' && (
            <>
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:26, fontWeight:800, color:'#0f0f0f', marginBottom:6, letterSpacing:'-0.025em' }}>Sign in to SamwadAI</h1>
                <p style={{ fontSize:14, color:'#9CA3AF' }}>
                  No account? <button onClick={() => setView('signup')} style={{ color:S.primary, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit' }}>Create one free</button>
                </p>
              </div>

              {/* Phone OTP — PRIMARY */}
              <div style={{ background:S.light, border:`1.5px solid ${S.border}`, borderRadius:16, padding:'20px', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:S.grad, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Phone size={14} color="#fff"/>
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#0f0f0f', margin:0 }}>Phone OTP — Recommended</p>
                    <p style={{ fontSize:11, color:'#9CA3AF', margin:0 }}>Instant · No password needed</p>
                  </div>
                  <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:S.grad, color:'#fff' }}>FAST</span>
                </div>
                <form onSubmit={handleSendOtp}>
                  <div style={{ display:'flex', gap:10 }}>
                    <FloatInput label="Phone Number" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel"/>
                  </div>
                  <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:11, border:'none', background:loading?'#F3F4F6':S.grad, color:loading?'#9CA3AF':'#fff', fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':S.glow, transition:'all .2s', fontFamily:'inherit' }}>
                    {loading ? <Spinner/> : <><Zap size={15}/> Send OTP</>}
                  </button>
                </form>
              </div>

              <Divider label="or sign in with"/>

              {/* LinkedIn */}
              <SocialBtn
                icon={<LinkedInIcon/>}
                label="Continue with LinkedIn"
                onClick={handleLinkedIn}
                fullWidth
              />

              <Divider label="or use email"/>

              {/* Email */}
              <button onClick={() => setView('email')} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'11px 16px', borderRadius:12, border:`1.5px solid ${S.border}`, background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151', transition:'all .15s', fontFamily:'inherit' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=S.primary;e.currentTarget.style.background=S.light;e.currentTarget.style.color=S.primary}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=S.border;e.currentTarget.style.background='#fff';e.currentTarget.style.color='#374151'}}>
                <Mail size={15}/> Continue with Email & Password
              </button>
            </>
          )}

          {/* ══ OTP VIEW ══ */}
          {view === 'otp' && (
            <>
              <button onClick={() => setView('phone')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0, fontFamily:'inherit' }}>
                <ChevronLeft size={16}/> Back
              </button>
              <div style={{ marginBottom:28 }}>
                <div style={{ width:56, height:56, borderRadius:16, background:S.light, border:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:24 }}>📱</div>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#0f0f0f', marginBottom:8, letterSpacing:'-0.025em' }}>Enter your OTP</h1>
                <p style={{ fontSize:14, color:'#9CA3AF' }}>
                  Sent to <strong style={{ color:'#374151' }}>{phone}</strong>{' '}
                  <button onClick={() => setView('phone')} style={{ color:S.primary, fontWeight:600, background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit' }}>Change</button>
                </p>
              </div>

              <OTPInput value={otp} onChange={setOtp} length={6}/>

              <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6}
                style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:loading||otp.length<6?'#F3F4F6':S.grad, color:loading||otp.length<6?'#9CA3AF':'#fff', fontSize:15, fontWeight:800, cursor:loading||otp.length<6?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading||otp.length<6?'none':S.glow, fontFamily:'inherit', marginBottom:16 }}>
                {loading ? <Spinner/> : <><Zap size={16}/> Verify & Sign In</>}
              </button>

              <div style={{ textAlign:'center' }}>
                {countdown > 0 ? (
                  <p style={{ fontSize:13, color:'#9CA3AF' }}>Resend OTP in <strong>{countdown}s</strong></p>
                ) : (
                  <button onClick={handleSendOtp} disabled={loading} style={{ fontSize:13, color:S.primary, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                    Resend OTP
                  </button>
                )}
              </div>
            </>
          )}

          {/* ══ EMAIL VIEW ══ */}
          {view === 'email' && (
            <>
              <button onClick={() => setView('phone')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0, fontFamily:'inherit' }}>
                <ChevronLeft size={16}/> Back
              </button>
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#0f0f0f', marginBottom:6, letterSpacing:'-0.025em' }}>Sign in with Email</h1>
                <p style={{ fontSize:14, color:'#9CA3AF' }}>
                  <button onClick={() => setView('phone')} style={{ color:S.primary, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit' }}>← Use phone OTP instead</button>
                </p>
              </div>
              <form onSubmit={handleEmail}>
                <FloatInput label="Email Address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"/>
                <FloatInput label="Password" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password"
                  suffix={<button type="button" onClick={()=>setShowPass(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, display:'flex', lineHeight:0 }}>{showPass?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
                />
                <div style={{ textAlign:'right', marginBottom:18, marginTop:-8 }}>
                  <button type="button" onClick={() => setView('forgot')} style={{ fontSize:12, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>Forgot password?</button>
                </div>
                <button type="submit" disabled={loading}
                  style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:loading?'#F3F4F6':S.grad, color:loading?'#9CA3AF':'#fff', fontSize:15, fontWeight:800, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':S.glow, transition:'all .2s', fontFamily:'inherit' }}
                  onMouseEnter={e=>{if(!loading)e.currentTarget.style.boxShadow=S.glowHov}}
                  onMouseLeave={e=>{if(!loading)e.currentTarget.style.boxShadow=S.glow}}>
                  {loading ? <Spinner/> : <><Zap size={16}/> Sign In</>}
                </button>
              </form>
            </>
          )}

          {/* ══ SIGNUP VIEW ══ */}
          {view === 'signup' && (
            <>
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:26, fontWeight:800, color:'#0f0f0f', marginBottom:6, letterSpacing:'-0.025em' }}>Create your account</h1>
                <p style={{ fontSize:14, color:'#9CA3AF' }}>
                  Already have one? <button onClick={() => setView('phone')} style={{ color:S.primary, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit' }}>Sign in</button>
                </p>
              </div>

              {/* Social signup */}
              <div style={{ display:'flex', gap:10, marginBottom:4 }}>
                <SocialBtn icon={<LinkedInIcon/>} label="LinkedIn" onClick={handleLinkedIn}/>
                <SocialBtn icon={<Phone size={15} color={S.primary}/>} label="Phone OTP" onClick={() => setView('phone')}/>
              </div>
              <p style={{ fontSize:10, color:'#BAE6FD', textAlign:'center', margin:'6px 0 0', fontWeight:600 }}>LinkedIn & Phone require backend setup</p>

              <Divider label="or sign up with email"/>

              <form onSubmit={handleEmail}>
                <FloatInput label="Company Name" value={company} onChange={e=>setCompany(e.target.value)} placeholder="RiseAscend Technologies" autoComplete="organization"/>
                <FloatInput label="Email Address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"/>
                <FloatInput label="Password" type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"
                  suffix={<button type="button" onClick={()=>setShowPass(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, display:'flex', lineHeight:0 }}>{showPass?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
                />
                <p style={{ fontSize:11, color:'#9CA3AF', marginBottom:16, lineHeight:1.5 }}>
                  By signing up you agree to our <a href="#" style={{ color:S.primary, textDecoration:'none', fontWeight:600 }}>Terms</a> & <a href="#" style={{ color:S.primary, textDecoration:'none', fontWeight:600 }}>Privacy Policy</a>.
                </p>
                <button type="submit" disabled={loading}
                  style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:loading?'#F3F4F6':S.grad, color:loading?'#9CA3AF':'#fff', fontSize:15, fontWeight:800, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':S.glow, fontFamily:'inherit' }}>
                  {loading ? <Spinner/> : <><ArrowRight size={16}/> Create Account</>}
                </button>
              </form>
            </>
          )}

          {/* ══ FORGOT VIEW ══ */}
          {view === 'forgot' && (
            <>
              <button onClick={() => setView('email')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0, fontFamily:'inherit' }}>
                <ChevronLeft size={16}/> Back to sign in
              </button>
              <div style={{ marginBottom:28 }}>
                <div style={{ width:56, height:56, borderRadius:16, background:S.light, border:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:24 }}>🔑</div>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#0f0f0f', marginBottom:8 }}>Reset your password</h1>
                <p style={{ fontSize:14, color:'#9CA3AF' }}>Enter your email and we'll send a reset link.</p>
              </div>
              <form onSubmit={handleEmail}>
                <FloatInput label="Email Address" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"/>
                <button type="submit" disabled={loading}
                  style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:loading?'#F3F4F6':S.grad, color:loading?'#9CA3AF':'#fff', fontSize:15, fontWeight:800, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':S.glow, fontFamily:'inherit' }}>
                  {loading ? <Spinner/> : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {/* Trust row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, marginTop:24, paddingTop:20, borderTop:`1px solid ${S.light}`, flexWrap:'wrap' }}>
            {[[<Shield size={12} color="#10B981"/>,'Encrypted'],[<Phone size={12} color={S.primary}/>,'Indian numbers'],[<Zap size={12} color={S.primary}/>,'TRAI compliant']].map(([icon,text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:5 }}>
                {icon}<span style={{ fontSize:11, color:'#9CA3AF', fontWeight:500 }}>{text}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:S.border, textAlign:'center', marginTop:14 }}>© 2026 RiseAscend Technologies · SamwadAI</p>
        </div>
      </div>
    </div>
  )
}
