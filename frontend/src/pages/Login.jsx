import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Phone, Eye, EyeOff, Mic, ArrowRight } from 'lucide-react'
import { authApi } from '../hooks/useApi'
import { mockUser } from '../hooks/mockData'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Demo mode — works without backend
  function demoLogin() {
    localStorage.setItem('demo_mode', 'true')
    localStorage.setItem('user', JSON.stringify(mockUser))
    toast.success('Demo mode — using mock data!')
    navigate('/dashboard')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.signup(email, password, company)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex overflow-hidden">

      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] p-14 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-ink-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-72 h-72 bg-saffron-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)'
            }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-ink-500 to-saffron-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Phone size={19} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">VoiceAI India</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display font-bold text-white text-5xl leading-[1.1] mb-4">
              AI Voice Calls
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-ink-400 to-saffron-400">
                ગુજરાતીમાં
              </span>
            </h2>
            <p className="text-ink-300 text-lg leading-relaxed">
              Bulk AI-powered voice campaigns in Gujarati, Hindi & English. Built for India.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { emoji: '🗣️', text: 'Gujarati first — auto-detect language' },
              { emoji: '📞', text: 'Bulk calling with personalized scripts' },
              { emoji: '🔄', text: 'Auto-reschedule busy/no-answer calls' },
              { emoji: '📊', text: 'Google Sheets + Database output' },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <span className="text-ink-200 text-[15px]">{text}</span>
              </div>
            ))}
          </div>

          {/* Cost badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-2 h-2 bg-jade-400 rounded-full status-active" />
            <span className="text-ink-200 text-sm">~₹1 per call · GPT-4o mini · Google STT/TTS</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-ink-500 text-sm">Made in India 🇮🇳 · TRAI Compliant</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8f7ff]">
        <div className="w-full max-w-[400px] animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-gradient-to-br from-ink-500 to-saffron-500 rounded-xl flex items-center justify-center">
              <Phone size={17} className="text-white" />
            </div>
            <span className="font-display font-bold text-ink-900 text-xl">VoiceAI India</span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-ink-100/50 p-8 border border-ink-100/50">
            <h3 className="font-display font-bold text-2xl text-ink-900 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h3>
            <p className="text-ink-400 text-sm mb-7">
              {mode === 'login' ? 'Sign in to your dashboard' : 'Start your free account today'}
            </p>

            {/* Toggle */}
            <div className="flex gap-1 mb-6 bg-ink-50 p-1 rounded-2xl">
              {[
                { key: 'login', label: 'Login' },
                { key: 'signup', label: 'Sign Up' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setMode(key)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${mode === key
                      ? 'bg-white text-ink-800 shadow-sm font-semibold'
                      : 'text-ink-400 hover:text-ink-600'}`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1.5">Company Name</label>
                  <input value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="Your company or org name"
                    className="w-full bg-ink-50 border border-ink-100 rounded-2xl px-4 py-3 text-sm text-ink-800 placeholder-ink-300 transition-all" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className="w-full bg-ink-50 border border-ink-100 rounded-2xl px-4 py-3 text-sm text-ink-800 placeholder-ink-300 transition-all" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters" required minLength={6}
                    className="w-full bg-ink-50 border border-ink-100 rounded-2xl px-4 py-3 pr-11 text-sm text-ink-800 placeholder-ink-300 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-800 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-all duration-200 mt-2 group">
                {loading ? 'Please wait...' : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-ink-100" />
              <span className="text-xs text-ink-300">or</span>
              <div className="flex-1 h-px bg-ink-100" />
            </div>

            {/* Demo mode button */}
            <button onClick={demoLogin}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-saffron-200 hover:border-saffron-400 text-saffron-600 hover:text-saffron-700 font-medium py-3 rounded-2xl transition-all text-sm group">
              <Mic size={16} className="group-hover:scale-110 transition-transform" />
              Try Demo (no backend needed)
            </button>
          </div>

          <p className="text-center text-xs text-ink-400 mt-6">
            By signing up you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}
