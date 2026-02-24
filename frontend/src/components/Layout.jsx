import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../hooks/useApi'
import { Phone } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.signup(email, password, company)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Phone className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VoiceAI India</h1>
            <p className="text-sm text-gray-500">AI Voice Call Automation</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-all
                ${mode === m ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {m === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <input value={company} onChange={e => setCompany(e.target.value)}
              placeholder="Company Name"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required minLength={6}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Gujarati · Hindi · English · AI-Powered Voice Calls
        </p>
      </div>
    </div>
  )
}
