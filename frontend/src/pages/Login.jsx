import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Phone, Zap, Shield } from 'lucide-react'
import { authApi, passwordApi } from '../hooks/api'
import Logo from '../components/Logo'

// ── Mini feature pill ───────────────────────────────────────────
function FeaturePill({ icon, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 20,
      background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.18)',
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#FF6B35' }}>{label}</span>
    </div>
  )
}

// ── Input field ─────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, right }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.01em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          style={{
            width: '100%', padding: '11px 14px',
            paddingRight: right ? 44 : 14,
            border: '1.5px solid #E5E7EB', borderRadius: 12,
            fontSize: 14, color: '#0f0f0f', background: '#fff',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = '#FF6B35'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,53,0.12)' }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
        />
        {right && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {right}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Login() {
  const navigate  = useNavigate()
  const [view,     setView]     = useState('login')   // login | signup | forgot
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [company,  setCompany]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill all fields')
    setLoading(true)
    try {
      if (view === 'login') {
        const res = await authApi.login({ email, password })
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user',  JSON.stringify(res.data.user))
        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        if (!company) return toast.error('Company name required')
        await authApi.signup({ email, password, company_name: company })
        toast.success('Account created! Please log in.')
        setView('login')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally { setLoading(false) }
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email) return toast.error('Enter your email')
    setLoading(true)
    try {
      await passwordApi.forgotPassword(email)
      toast.success('Reset link sent to your email')
      setView('login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset link')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", sans-serif', background: '#F7F8FA' }}>

      {/* ── Left panel — branding ── */}
      <div style={{
        display: 'none', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '60px 80px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #0f0f0f 0%, #1a0a05 60%, #2d1008 100%)',
      }} className="lg:flex">

        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -120, left: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,140,66,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 480, position: 'relative', zIndex: 1 }}>
          <Logo dark size="lg" />

          <h1 style={{
            fontSize: 42, fontWeight: 800, color: '#fff', marginTop: 40, marginBottom: 16,
            lineHeight: 1.15, letterSpacing: '-0.03em',
          }}>
            Voice AI that speaks<br />
            <span style={{ background: 'linear-gradient(135deg, #FF8C42, #FF6B35, #E63946)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              your customers' language
            </span>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 36 }}>
            Automate outbound calls in Gujarati, Hindi & English. Bulk campaigns, AI scripting, live results — all in one platform.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 48 }}>
            <FeaturePill icon="🗣️" label="Gujarati-First AI" />
            <FeaturePill icon="📞" label="Bulk Calling" />
            <FeaturePill icon="📊" label="Live Dashboard" />
            <FeaturePill icon="🔄" label="Auto Retry" />
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32 }}>
            {[
              { val: '1M+', label: 'Calls Made' },
              { val: '98%', label: 'Uptime' },
              { val: '3 Lang', label: 'Supported' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#FF8C42', margin: 0, letterSpacing: '-0.03em' }}>{s.val}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '40px 32px', background: '#fff',
        boxShadow: '-1px 0 20px rgba(0,0,0,0.04)',
        overflowY: 'auto',
      }} className="lg:max-w-[480px]">

        {/* Mobile logo */}
        <div style={{ marginBottom: 32 }} className="lg:hidden">
          <Logo size="md" />
        </div>

        {/* Form header */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f0f0f', marginBottom: 6, letterSpacing: '-0.025em' }}>
            {view === 'login'  ? 'Welcome back' :
             view === 'signup' ? 'Create your account' :
             'Reset your password'}
          </h2>
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>
            {view === 'login'  ? "Don't have an account? " :
             view === 'signup' ? 'Already have an account? ' : 'Remembered it? '}
            <button
              onClick={() => setView(view === 'login' ? 'signup' : 'login')}
              style={{ color: '#FF6B35', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
            >
              {view === 'login' ? 'Sign up free' : view === 'signup' ? 'Log in' : 'Log in'}
            </button>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={view === 'forgot' ? handleForgot : handleSubmit}>

          {view === 'signup' && (
            <Field
              label="Company Name"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="RiseAscend Technologies"
            />
          )}

          <Field
            label="Email Address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
          />

          {view !== 'forgot' && (
            <Field
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              right={
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          )}

          {view === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: 20, marginTop: -6 }}>
              <button type="button" onClick={() => setView('forgot')}
                style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? '#F3F4F6' : 'linear-gradient(135deg, #FF8C42, #FF6B35, #E63946)',
              color: loading ? '#9CA3AF' : '#fff',
              fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.35)',
              transition: 'all 0.2s', fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            {loading ? 'Please wait...' :
             view === 'login'  ? <><Zap size={16} /> Sign In</> :
             view === 'signup' ? <><ArrowRight size={16} /> Create Account</> :
             'Send Reset Link'}
          </button>
        </form>

        {/* Trust badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 28, paddingTop: 24, borderTop: '1px solid #F3F4F6' }}>
          {[
            { icon: <Shield size={12} color="#10B981" />, text: 'Secure & encrypted' },
            { icon: <Phone size={12} color="#3B82F6" />, text: 'Indian phone numbers' },
          ].map(b => (
            <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {b.icon}
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{b.text}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'center', marginTop: 20 }}>
          © 2025 RiseAscend Technologies · SamwadAI
        </p>
      </div>
    </div>
  )
}
