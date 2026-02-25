import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Phone, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authApi } from '../hooks/api'

export default function Login() {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [company,  setCompany]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.signup(email, password, company)

      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user',  JSON.stringify(res.data.user))
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created! 🎉')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex overflow-hidden">

      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] p-14 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-navy-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-72 h-72 bg-orange-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-navy-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Phone size={19} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">VoiceAI India</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display font-bold text-white text-5xl leading-[1.1] mb-4">
              AI Voice Calls<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-400 to-orange-400">
                ગુજરાતીમાં
              </span>
            </h2>
            <p className="text-navy-300 text-lg leading-relaxed">
              Bulk AI-powered voice campaigns in Gujarati, Hindi & English.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { emoji: '🗣️', text: 'Gujarati first — auto-detect language' },
              { emoji: '📞', text: 'Bulk calling with personalised scripts' },
              { emoji: '🔄', text: 'Auto-reschedule busy/no-answer calls' },
              { emoji: '📊', text: 'Google Sheets + live dashboard' },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{emoji}</span>
                <span className="text-navy-200 text-[15px]">{text}</span>
              </div>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-2 h-2 bg-jade-400 rounded-full status-active" />
            <span className="text-navy-200 text-sm">~₹0.96 per call · Groq · Sarvam AI</span>
          </div>
        </div>

        <p className="relative z-10 text-navy-500 text-sm">Made in India 🇮🇳 · TRAI Compliant</p>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8f7ff]">
        <div className="w-full max-w-[400px] animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-gradient-to-br from-navy-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Phone size={17} className="text-white" />
            </div>
            <span className="font-display font-bold text-navy-900 text-xl">VoiceAI India</span>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-navy-100/50 p-8 border border-navy-100/50">
            <h3 className="font-display font-bold text-2xl text-navy-900 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h3>
            <p className="text-navy-400 text-sm mb-7">
              {mode === 'login' ? 'Sign in to your dashboard' : 'Start your free account today'}
            </p>

            {/* Toggle */}
            <div className="flex gap-1 mb-6 bg-navy-50 p-1 rounded-2xl">
              {[{ key: 'login', label: 'Login' }, { key: 'signup', label: 'Sign Up' }].map(({ key, label }) => (
                <button key={key} onClick={() => setMode(key)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${mode === key ? 'bg-white text-navy-800 shadow-sm font-semibold' : 'text-navy-400 hover:text-navy-600'}`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1.5">Company Name</label>
                  <input
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="Your company or org name"
                    className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-400 focus:outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full bg-navy-50 border border-navy-100 rounded-2xl px-4 py-3 pr-11 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-400 focus:outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-navy-400 hover:text-navy-600">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-all duration-200 mt-2 group"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Please wait...</>
                  : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                }
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-navy-400 mt-6">
            By signing up you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}
