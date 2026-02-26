import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, Mic2 } from 'lucide-react'
import { authApi, passwordApi } from '../hooks/api'

// ── Social button ──────────────────────────────────────────────
function SocialBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} type="button"
      className="flex-1 flex items-center justify-center gap-2.5 h-11 bg-white border border-[#e8e3db] rounded-xl text-sm font-medium text-[#3d3d3d] hover:border-[#d0c9be] hover:bg-[#faf8f4] transition-all active:scale-[0.98]">
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ── Google SVG ──────────────────────────────────────────────────
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

// ── Apple SVG ───────────────────────────────────────────────────
function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.9 1 711.2 1 636c0-144.1 91.8-220.5 181.7-220.5 47.6 0 87.5 31.2 117.4 31.2s77.4-33.1 133.2-33.1c21.4 0 108.2 1.9 164.6 83.3zm-166.5-142c-2.6-15.4-7.1-34.6-21.1-55.2-20.1-29.9-58.5-56.5-100.7-56.5-1.3 0-2.6 0-3.8.1 1.3 16.7 5.8 35.9 16.6 56.5 14.1 27.5 51.5 55.2 109 55.1z"/>
    </svg>
  )
}

export default function Login() {
  const [view,     setView]     = useState('login') // 'login' | 'signup' | 'forgot'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [company,  setCompany]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = view === 'login'
        ? await authApi.login(email, password)
        : await authApi.signup(email, password, company)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user',  JSON.stringify(res.data.user))
      toast.success(view === 'login' ? 'Welcome back!' : 'Account created!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email) { toast.error('Enter your email address'); return }
    setLoading(true)
    try {
      await passwordApi.forgotPassword(email)
      toast.success('Reset link sent if this email is registered!')
      setView('login')
    } catch {
      toast.error('Failed to send reset email. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSocialAuth(provider) {
    // OAuth flow — redirect to backend which handles the provider
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    toast(`${provider} login coming soon!`, { icon: '🔜' })
    // Uncomment when backend OAuth is set up:
    // window.location.href = `${base}/auth/${provider.toLowerCase()}`
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#fdfcfa' }}>

      {/* ── Left panel — only desktop ── */}
      <div className="hidden lg:flex flex-col w-[460px] relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1a1a1a 0%, #2c2c2c 60%, #3d2600 100%)' }}>

        {/* Texture overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        {/* Glow */}
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f5a623 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#f5a623' }}>
              <Mic2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-[15px] leading-none">VoiceAI India</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#8a8a8a' }}>by Rise Ascend Tech</p>
            </div>
          </div>

          {/* Main copy */}
          <div className="mb-auto mt-20">
            <h1 className="text-white leading-[1.1] mb-5" style={{ fontSize: '40px', fontFamily: '"DM Serif Display", serif' }}>
              Speak to your<br />
              <span style={{ color: '#f5a623' }}>customers</span><br />
              at scale.
            </h1>
            <p style={{ color: '#8a8a8a', fontSize: '15px', lineHeight: '1.7' }}>
              AI-powered voice campaigns in Gujarati, Hindi & English. Built for Indian businesses.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3 mb-12">
            {[
              { icon: '🗣️', text: 'Auto-detects Gujarati, Hindi, English' },
              { icon: '📞', text: 'Personalised scripts per contact' },
              { icon: '📊', text: 'Real-time dashboard & call logs' },
              { icon: '🔄', text: 'Auto-reschedule busy / no-answer' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm" style={{ color: '#c4c4c4' }}>{f.text}</span>
              </div>
            ))}
          </div>

          <p className="text-xs" style={{ color: '#525252' }}>🇮🇳 Made in India · TRAI Compliant</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px] animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f5a623' }}>
              <Mic2 size={16} className="text-white" />
            </div>
            <span className="font-semibold text-[#2c2c2c] text-lg">VoiceAI India</span>
          </div>

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === 'forgot' ? (
            <div>
              <h2 className="text-2xl text-[#1a1a1a] mb-1" style={{ fontFamily: '"DM Serif Display",serif' }}>Reset password</h2>
              <p className="text-sm text-[#8a8a8a] mb-8">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" required className="input-field" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                    : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => setView('login')} className="mt-5 w-full text-center text-sm text-[#8a8a8a] hover:text-[#2c2c2c] transition-colors">
                ← Back to sign in
              </button>
            </div>

          ) : (
            /* ── LOGIN / SIGNUP VIEW ── */
            <div>
              <h2 className="text-2xl text-[#1a1a1a] mb-1" style={{ fontFamily: '"DM Serif Display",serif' }}>
                {view === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm text-[#8a8a8a] mb-7">
                {view === 'login' ? 'Sign in to your dashboard' : 'Start your free account today'}
              </p>

              {/* Social buttons */}
              <div className="flex gap-3 mb-6">
                <SocialBtn icon={<GoogleIcon />} label="Google" onClick={() => handleSocialAuth('Google')} />
                <SocialBtn icon={<AppleIcon />}  label="Apple"  onClick={() => handleSocialAuth('Apple')}  />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{ background: '#e8e3db' }} />
                <span className="text-xs text-[#a8a8a8] font-medium">or continue with email</span>
                <div className="flex-1 h-px" style={{ background: '#e8e3db' }} />
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {view === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider mb-1.5">Company Name</label>
                    <input value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="Your company or org name" className="input-field" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" required className="input-field" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Password</label>
                    {view === 'login' && (
                      <button type="button" onClick={() => setView('forgot')}
                        className="text-xs text-[#8a8a8a] hover:text-[#f5a623] transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 characters" required minLength={6}
                      className="input-field pr-11" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#a8a8a8] hover:text-[#6b6b6b] transition-colors">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center" style={{ marginTop: '8px' }}>
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Please wait...</>
                    : <>{view === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>
                  }
                </button>
              </form>

              {/* Toggle mode */}
              <p className="text-center text-sm text-[#8a8a8a] mt-6">
                {view === 'login' ? "Don't have an account?" : 'Already have an account?'}
                {' '}
                <button onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                  className="font-semibold text-[#2c2c2c] hover:text-[#f5a623] transition-colors">
                  {view === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
