import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import { Phone, Users, CheckCircle, TrendingUp, Plus, ArrowUpRight, Activity, Zap, ChevronRight } from 'lucide-react'

const statusMeta = {
  active:    { label: 'Active',    dot: 'bg-jade-400',   text: 'text-jade-700',   bg: 'bg-jade-50',   pulse: true  },
  completed: { label: 'Completed', dot: 'bg-navy-400',   text: 'text-navy-600',   bg: 'bg-navy-50',   pulse: false },
  paused:    { label: 'Paused',    dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', pulse: false },
  draft:     { label: 'Draft',     dot: 'bg-gray-300',   text: 'text-gray-500',   bg: 'bg-gray-50',   pulse: false },
}
const langLabel = { gu: 'ગુજ', hi: 'हिं', en: 'EN' }
const langColor  = { gu: 'bg-orange-100 text-orange-700', hi: 'bg-navy-100 text-navy-700', en: 'bg-jade-100 text-jade-700' }

function StatCard({ label, value, icon: Icon, color, delay }) {
  const colors = { indigo: 'from-navy-500 to-navy-600', orange: 'from-orange-400 to-orange-500', green: 'from-jade-400 to-jade-600', purple: 'from-purple-400 to-purple-600' }
  return (
    <div className="bg-white rounded-2xl p-6 border border-navy-100/60 card-hover animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-sm mb-4`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="text-3xl font-display font-bold text-navy-900 mb-1">{value}</p>
      <p className="text-sm text-navy-400">{label}</p>
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
      .catch(err => setError(err.response?.data?.error || 'Failed to load campaigns'))
      .finally(() => setLoading(false))
  }, [])

  const totalContacts   = campaigns.reduce((a, c) => a + (c.total_contacts  || 0), 0)
  const totalCompleted  = campaigns.reduce((a, c) => a + (c.completed_calls || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const successRate     = totalContacts > 0 ? Math.round((totalCompleted / totalContacts) * 100) : 0

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-in">
        <div>
          <p className="text-navy-400 text-sm font-medium mb-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display font-bold text-3xl text-navy-900">
            નમસ્તે, {user.company_name || 'Welcome'} 👋
          </h1>
        </div>
        <Link to="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all hover:shadow-lg group">
          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
          New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Campaigns" value={campaigns.length}                       icon={Phone}       color="indigo" delay={0}   />
        <StatCard label="Total Contacts"  value={totalContacts.toLocaleString('en-IN')}  icon={Users}       color="purple" delay={50}  />
        <StatCard label="Calls Completed" value={totalCompleted.toLocaleString('en-IN')} icon={CheckCircle} color="green"  delay={100} />
        <StatCard label="Success Rate"    value={`${successRate}%`}                      icon={TrendingUp}  color="orange" delay={150} />
      </div>

      {/* Active campaigns banner */}
      {activeCampaigns.length > 0 && (
        <div className="mb-8 p-5 bg-gradient-to-r from-navy-900 to-navy-800 rounded-2xl flex items-center gap-4 animate-slide-up border border-navy-700">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{activeCampaigns.length} campaign{activeCampaigns.length > 1 ? 's' : ''} running live</p>
            <p className="text-xs text-navy-300 mt-1">{activeCampaigns.map(c => c.name).join(' · ')}</p>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            {[...Array(5)].map((_, i) => <span key={i} className="wave-bar" />)}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Campaigns list */}
      <div className="bg-white rounded-3xl border border-navy-100/60 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-navy-50">
          <h2 className="font-display font-bold text-lg text-navy-900">Recent Campaigns</h2>
          <Link to="/dashboard/campaigns" className="flex items-center gap-1 text-navy-500 hover:text-navy-800 text-sm font-medium transition-colors">
            View all <ArrowUpRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-navy-400">
            <div className="w-5 h-5 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-navy-300" />
            </div>
            <p className="font-display font-bold text-navy-600 text-lg mb-2">No campaigns yet</p>
            <p className="text-navy-400 text-sm mb-6">Create your first AI voice campaign to get started</p>
            <Link to="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 bg-navy-900 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-navy-800 transition-colors">
              <Plus size={15} /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-navy-50">
            {campaigns.slice(0, 5).map((c, i) => {
              const total = c.total_contacts  || 0
              const done  = c.completed_calls || 0
              const pct   = total > 0 ? Math.round((done / total) * 100) : 0
              const meta  = statusMeta[c.status] || statusMeta.draft
              return (
                <Link key={c.id} to={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center gap-5 px-7 py-5 hover:bg-navy-50/50 transition-colors group"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-navy-100 transition-colors">
                    <Phone size={16} className="text-navy-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-navy-900 text-sm truncate">{c.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${langColor[c.language_priority]}`}>
                        {langLabel[c.language_priority]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-navy-100 rounded-full overflow-hidden max-w-[140px]">
                        <div className="h-full bg-gradient-to-r from-navy-500 to-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-navy-400">{done}/{total} calls</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${meta.bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'status-active' : ''}`} />
                    <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-navy-300 group-hover:text-navy-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
