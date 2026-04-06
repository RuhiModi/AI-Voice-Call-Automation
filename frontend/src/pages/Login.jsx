import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, ChevronLeft, Shield, Zap } from 'lucide-react'
import { authApi, passwordApi } from '../hooks/api'
import Logo from '../components/Logo'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ── Sky Blue tokens ───────────────────────────────────────────
const SKY  = '#0EA5E9'
const GRAD = 'linear-gradient(135deg,#38BDF8 0%,#0EA5E9 50%,#0284C7 100%)'
const BG   = '#F0F9FF'
const BORD = '#BAE6FD'
const GLOW = '0 4px 24px rgba(14,165,233,.30)'
const GLOW2= '0 8px 40px rgba(14,165,233,.45)'

// ── Google SVG ────────────────────────────────────────────────
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

// ── LinkedIn SVG ──────────────────────────────────────────────
function LinkedInIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

// ── Floating label input ──────────────────────────────────────
function FloatInput({ label, type = 'text', value, onChange, placeholder, autoComplete, suffix }) {
  const [focused, setFocused] = useState(false)
  const floated = focused || !!value
  return (
    <div style={{ position:'relative', marginBottom:16 }}>
      <label style={{
        position:'absolute', left:14, pointerEvents:'none', zIndex:1, transition:'all .15s',
        top: floated ? 8 : '50%',
        transform: floated ? 'none' : 'translateY(-50%)',
        fontSize: floated ? 10 : 14,
        fontWeight: floated ? 700 : 400,
        color: floated ? SKY : '#9CA3AF',
        letterSpacing: floated ? '0.06em' : 0,
        textTransform: floated ? 'uppercase' : 'none',
      }}>{label}</label>
      <input
        type={type} value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        placeholder={focused ? placeholder : ''}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width:'100%', boxSizing:'border-box',
          padding: floated ? '22px 14px 8px' : '14px',
          paddingRight: suffix ? 44 : 14,
          border: `1.5px solid ${focused ? SKY : BORD}`,
          borderRadius: 12, fontSize: 14, color: '#0f172a',
          background: '#fff', outline: 'none', fontFamily: 'inherit',
          boxShadow: focused ? `0 0 0 3px rgba(14,165,233,.10)` : 'none',
          transition: 'all .15s',
        }}
      />
      {suffix && (
        <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>
          {suffix}
        </div>
      )}
    </div>
  )
}

// ── Social button ─────────────────────────────────────────────
function SocialBtn({ icon, label, onClick, color }) {
  const [hov, setHov] = useState(false)
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
        border: `1.5px solid ${hov ? '#D1D5DB' : BORD}`,
        background: hov ? '#F8FAFC' : '#fff',
        fontSize: 13, fontWeight: 600, color: '#374151',
        transition: 'all .15s', fontFamily: 'inherit',
      }}>
      {icon}{label}
    </button>
  )
}

// ── Divider ───────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
      <div style={{ flex:1, height:1, background:BORD }}/>
      <span style={{ fontSize:11, color:'#9CA3AF', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>or continue with email</span>
      <div style={{ flex:1, height:1, background:BORD }}/>
    </div>
  )
}

// ── Left brand panel ──────────────────────────────────────────
function BrandPanel({ view }) {
  const headlines = {
    login:  ['Welcome back.', 'Pick up where you left off.'],
    signup: ['Get started free.', 'Your first campaign in under 5 minutes.'],
    forgot: ["No worries.", 'A reset link is on its way.'],
  }
  const [h1, h2] = headlines[view] || headlines.login

  const features = [
    { icon:'🗣️', label:'Gujarati, Hindi & English AI' },
    { icon:'📞', label:'Thousands of calls, one click'  },
    { icon:'📊', label:'Live transcripts & outcomes'    },
    { icon:'🔒', label:'TRAI compliant & secure'        },
  ]

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
      padding:'60px 52px', position:'relative', overflow:'hidden',
      background:'linear-gradient(160deg,#0c4a6e 0%,#0369A1 40%,#0EA5E9 85%,#38BDF8 100%)',
    }}>
      {/* Decorative rings */}
      {[200, 320, 440].map((sz, i) => (
        <div key={i} style={{
          position:'absolute', top:'40%', left:'45%',
          transform:'translate(-50%,-50%)',
          width:sz, height:sz, borderRadius:'50%',
          border:`1px solid rgba(255,255,255,${0.08 - i*0.02})`,
          animation:`li-spin ${16+i*5}s linear infinite${i%2?' reverse':''}`,
          pointerEvents:'none',
        }}/>
      ))}
      <div style={{ position:'absolute', top:'40%', left:'45%', transform:'translate(-50%,-50%)', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,.06) 0%,transparent 65%)', pointerEvents:'none' }}/>

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ marginBottom:48 }}>
          <Logo dark size="md"/>
        </div>

        {/* Headline */}
        <h2 style={{ fontSize:'clamp(22px,2.8vw,34px)', fontWeight:800, color:'#fff', margin:'0 0 10px', lineHeight:1.15, letterSpacing:'-0.025em' }}>
          {h1}
        </h2>
        <p style={{ fontSize:15, color:'rgba(255,255,255,.5)', margin:'0 0 44px', lineHeight:1.7 }}>
          {h2}
        </p>

        {/* Feature list */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {features.map(f => (
            <div key={f.label} style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                {f.icon}
              </div>
              <span style={{ fontSize:14, color:'rgba(255,255,255,.55)', fontWeight:500 }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes li-spin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}} @keyframes li-btn-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Login() {
  const navigate   = useNavigate()
  const [params]   = useSearchParams()
  const [view,      setView]     = useState(params.get('tab') || 'login')
  const [email,     setEmail]    = useState('')
  const [password,  setPassword] = useState('')
  const [company,   setCompany]  = useState('')
  const [showPass,  setShowPass] = useState(false)
  const [loading,   setLoading]  = useState(false)

  useEffect(() => {
    const t = params.get('tab')
    if (t) setView(t)
  }, [params])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return toast.error('Email is required')
    if (view === 'forgot') {
      setLoading(true)
      try { await passwordApi.forgot(email); toast.success('Reset link sent! Check your inbox.'); setView('login') }
      catch (err) { toast.error(err.response?.data?.error || 'Failed to send reset link') }
      finally { setLoading(false) }
      return
    }
    if (!password) return toast.error('Password is required')
    if (view === 'signup' && !company) return toast.error('Company name is required')
    if (view === 'signup' && password.length < 8) return toast.error('Password must be at least 8 characters')
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

  function handleGoogle()   { window.location.href = `${API}/auth/google`   }
  function handleLinkedIn() { window.location.href = `${API}/auth/linkedin` }

  const switchView  = view === 'login' ? 'signup' : 'login'
  const switchLabel = view === 'login' ? 'Create one free' : 'Sign in instead'

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'"Plus Jakarta Sans","DM Sans",sans-serif', background:BG }}>

      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex" style={{ width:'46%', flexShrink:0 }}>
        <BrandPanel view={view}/>
      </div>

      {/* Right form panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 32px', background:'#fff', overflowY:'auto', boxShadow:'-1px 0 20px rgba(14,165,233,.06)' }}>

        {/* Mobile logo */}
        <div className="lg:hidden" style={{ marginBottom:32 }}><Logo size="md"/></div>

        <div style={{ maxWidth:420, width:'100%', margin:'0 auto' }}>

          {/* Back button for forgot */}
          {view === 'forgot' && (
            <button onClick={() => setView('login')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', marginBottom:20, padding:0, fontFamily:'inherit', transition:'color .15s' }}
              onMouseEnter={e=>e.currentTarget.style.color=SKY} onMouseLeave={e=>e.currentTarget.style.color='#9CA3AF'}>
              <ChevronLeft size={16}/> Back to sign in
            </button>
          )}

          {/* Title */}
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', margin:'0 0 6px', letterSpacing:'-0.025em', lineHeight:1.2 }}>
              {view === 'login'  ? 'Sign in to SamwadAI' :
               view === 'signup' ? 'Create your account'  :
               'Reset your password'}
            </h1>
            {view !== 'forgot' && (
              <p style={{ fontSize:14, color:'#9CA3AF', margin:0 }}>
                {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => setView(switchView)} style={{ color:SKY, fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:14, padding:0, fontFamily:'inherit' }}>
                  {switchLabel}
                </button>
              </p>
            )}
          </div>

          {/* Social login */}
          {view !== 'forgot' && (
            <>
              <div style={{ display:'flex', gap:10, marginBottom:4 }}>
                <SocialBtn
                  icon={<GoogleIcon/>}
                  label="Google"
                  onClick={handleGoogle}
                />
                <SocialBtn
                  icon={<LinkedInIcon/>}
                  label="LinkedIn"
                  onClick={handleLinkedIn}
                />
              </div>
              <Divider/>
            </>
          )}

          {/* Email form */}
          <form onSubmit={handleSubmit}>
            {view === 'signup' && (
              <FloatInput
                label="Company Name"
                value={company}
                onChange={setCompany}
                placeholder="RiseAscend Technologies"
                autoComplete="organization"
              />
            )}
            <FloatInput
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              autoComplete="email"
            />
            {view !== 'forgot' && (
              <FloatInput
                label="Password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder={view === 'signup' ? 'At least 8 characters' : 'Your password'}
                autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                suffix={
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:0, display:'flex', lineHeight:0 }}>
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                }
              />
            )}

            {/* Forgot password link */}
            {view === 'login' && (
              <div style={{ textAlign:'right', marginBottom:18, marginTop:-8 }}>
                <button type="button" onClick={() => setView('forgot')}
                  style={{ fontSize:12, color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'color .15s' }}
                  onMouseEnter={e=>e.currentTarget.style.color=SKY} onMouseLeave={e=>e.currentTarget.style.color='#9CA3AF'}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Terms */}
            {view === 'signup' && (
              <p style={{ fontSize:11, color:'#9CA3AF', marginBottom:16, lineHeight:1.5 }}>
                By signing up you agree to our{' '}
                <a href="#" style={{ color:SKY, textDecoration:'none', fontWeight:600 }}>Terms of Service</a>
                {' '}&amp;{' '}
                <a href="#" style={{ color:SKY, textDecoration:'none', fontWeight:600 }}>Privacy Policy</a>.
              </p>
            )}

            {/* Submit button */}
            <button type="submit" disabled={loading}
              style={{
                width:'100%', padding:13, borderRadius:12, border:'none',
                background: loading ? '#F3F4F6' : GRAD,
                color: loading ? '#9CA3AF' : '#fff',
                fontSize:15, fontWeight:800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow: loading ? 'none' : GLOW,
                transition:'all .2s', fontFamily:'inherit',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = GLOW2 }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = GLOW  }}>
              {loading ? (
                <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'li-btn-spin .7s linear infinite' }}/>
              ) : view === 'login' ? (
                <><Zap size={16}/>Sign In</>
              ) : view === 'signup' ? (
                <><ArrowRight size={16}/>Create Account</>
              ) : 'Send Reset Link'}
            </button>
          </form>

          {/* Trust row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginTop:28, paddingTop:20, borderTop:`1px solid ${BORD}`, flexWrap:'wrap' }}>
            {[
              [<Shield size={12} color="#10B981"/>, 'SSL Encrypted'],
              [<Zap size={12} color={SKY}/>, 'TRAI Compliant'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:5 }}>
                {icon}
                <span style={{ fontSize:11, color:'#9CA3AF', fontWeight:500 }}>{text}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize:11, color:'#D1D5DB', textAlign:'center', marginTop:14 }}>
            © 2026 RiseAscend Technologies · SamwadAI
          </p>
        </div>
      </div>
    </div>
  )
}
