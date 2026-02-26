import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import { Phone, Users, CheckCircle, TrendingUp, Plus, ArrowUpRight, Activity, Zap, ChevronRight } from 'lucide-react'

const statusStyle = {
  active:    { badge: 'badge-active',    dot: '#52b87c', label: 'Active',    pulse: true  },
  completed: { badge: 'badge-completed', dot: '#a8a8a8', label: 'Completed', pulse: false },
  paused:    { badge: 'badge-paused',    dot: '#f9bc30', label: 'Paused',    pulse: false },
  draft:     { badge: 'badge-draft',     dot: '#dcdcdc', label: 'Draft',     pulse: false },
}
const langLabel = { gu: 'ગુજ', hi: 'हिं', en: 'EN' }

function StatCard({ label, value, icon: Icon, accent, delay }) {
  return (
    <div className="card p-5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent + '18' }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-[28px] font-bold leading-none mb-1.5" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>{value}</p>
      <p className="text-[13px]" style={{ color: '#8a8a8a' }}>{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    campaignApi.list()
      .then(r => setCampaigns(r.data.campaigns || []))
      .catch(err => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const totalContacts  = campaigns.reduce((a, c) => a + (c.total_contacts  || 0), 0)
  const totalCompleted = campaigns.reduce((a, c) => a + (c.completed_calls || 0), 0)
  const activeCount    = campaigns.filter(c => c.status === 'active').length
  const successRate    = totalContacts > 0 ? Math.round((totalCompleted / totalContacts) * 100) : 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <p className="text-sm mb-1" style={{ color: '#a8a8a8' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-3xl" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>
            {greeting()}, {user.company_name || 'there'} 👋
          </h1>
        </div>
        <Link to="/dashboard/campaigns/new" className="btn-primary flex-shrink-0">
          <Plus size={15} /> New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Campaigns"  value={campaigns.length}                       icon={Phone}       accent="#f5a623" delay={0}   />
        <StatCard label="Total Contacts"   value={totalContacts.toLocaleString('en-IN')}  icon={Users}       accent="#8b5cf6" delay={60}  />
        <StatCard label="Calls Completed"  value={totalCompleted.toLocaleString('en-IN')} icon={CheckCircle} accent="#2fa05c" delay={120} />
        <StatCard label="Success Rate"     value={`${successRate}%`}                      icon={TrendingUp}  accent="#f5a623" delay={180} />
      </div>

      {/* Active banner */}
      {activeCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-4 animate-fade-up"
          style={{ background: 'linear-gradient(135deg, #fef3d0, #fffbf0)', border: '1px solid #fde59a' }}>
          <div className="flex items-center gap-1.5 text-[#e08c10]">
            {[...Array(5)].map((_, i) => <span key={i} className="wave-bar" />)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#8f540f' }}>
              {activeCount} campaign{activeCount > 1 ? 's' : ''} are live right now
            </p>
          </div>
          <Link to="/dashboard/campaigns" className="text-xs font-semibold flex items-center gap-1" style={{ color: '#b86f0e' }}>
            View <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Campaigns */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f5f1ea' }}>
          <h2 className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>Recent Campaigns</h2>
          <Link to="/dashboard/campaigns" className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-70" style={{ color: '#f5a623' }}>
            View all <ArrowUpRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3" style={{ color: '#a8a8a8' }}>
            <div className="w-5 h-5 border-2 border-[#e8e3db] border-t-[#f5a623] rounded-full animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#faf8f4' }}>
              <Zap size={26} style={{ color: '#d0c9be' }} />
            </div>
            <p className="font-semibold text-base mb-1" style={{ color: '#3d3d3d', fontFamily: '"DM Serif Display",serif' }}>No campaigns yet</p>
            <p className="text-sm mb-5" style={{ color: '#a8a8a8' }}>Create your first AI voice campaign</p>
            <Link to="/dashboard/campaigns/new" className="btn-primary inline-flex">
              <Plus size={14} /> Create Campaign
            </Link>
          </div>
        ) : (
          <div>
            {campaigns.slice(0, 6).map((c, i) => {
              const total = c.total_contacts  || 0
              const done  = c.completed_calls || 0
              const pct   = total > 0 ? Math.round((done / total) * 100) : 0
              const st    = statusStyle[c.status] || statusStyle.draft
              return (
                <Link key={c.id} to={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-all hover:bg-[#fdfcfa] group animate-fade-up"
                  style={{ borderBottom: '1px solid #f5f1ea', animationDelay: `${i*50}ms` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#faf8f4' }}>
                    <Phone size={14} style={{ color: '#a8a8a8' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>{c.name}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#fef3d0', color: '#b86f0e' }}>
                        {langLabel[c.language_priority] || 'gu'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="progress-bar flex-1 max-w-[120px]">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px]" style={{ color: '#a8a8a8' }}>{done}/{total}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${st.badge}`}>
                    {st.label}
                  </span>
                  <ChevronRight size={14} className="flex-shrink-0 transition-transform group-hover:translate-x-1" style={{ color: '#d0c9be' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
