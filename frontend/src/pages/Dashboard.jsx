import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../hooks/useApi'
import { mockCampaigns } from '../hooks/mockData'
import {
  Phone, Users, CheckCircle, Clock, Plus, ArrowUpRight,
  TrendingUp, Activity, Zap, ChevronRight
} from 'lucide-react'

// Megaphone not in this version of lucide — use Phone as fallback
function Megaphone(props) { return <Phone {...props} /> }

const DEMO = localStorage.getItem('demo_mode')

function StatCard({ label, value, icon: Icon, color, change, delay }) {
  const colors = {
    indigo: 'from-ink-500 to-ink-600',
    orange: 'from-saffron-400 to-saffron-500',
    green: 'from-jade-400 to-jade-600',
    purple: 'from-purple-400 to-purple-600',
  }
  return (
    <div className="bg-white rounded-2xl p-6 border border-ink-100/60 card-hover animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
        {change && (
          <div className="flex items-center gap-1 text-jade-600 bg-jade-50 px-2 py-1 rounded-lg text-xs font-semibold">
            <TrendingUp size={11} />
            {change}
          </div>
        )}
      </div>
      <p className="text-3xl font-display font-bold text-ink-900 mb-1">{value}</p>
      <p className="text-sm text-ink-400">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    if (DEMO) {
      setCampaigns(mockCampaigns)
      setLoading(false)
      return
    }
    campaignApi.list()
      .then(r => setCampaigns(r.data.campaigns))
      .catch(() => setCampaigns(mockCampaigns))
      .finally(() => setLoading(false))
  }, [])

  const totalContacts = campaigns.reduce((a, c) => a + (c.total_contacts || 0), 0)
  const totalCompleted = campaigns.reduce((a, c) => a + (c.completed_calls || 0), 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const successRate = totalContacts > 0 ? Math.round((totalCompleted / totalContacts) * 100) : 0

  const statusMeta = {
    active: { label: 'Active', dot: 'bg-jade-400', text: 'text-jade-700', bg: 'bg-jade-50', pulse: true },
    completed: { label: 'Completed', dot: 'bg-ink-400', text: 'text-ink-600', bg: 'bg-ink-50', pulse: false },
    paused: { label: 'Paused', dot: 'bg-saffron-400', text: 'text-saffron-700', bg: 'bg-saffron-50', pulse: false },
    draft: { label: 'Draft', dot: 'bg-gray-300', text: 'text-gray-500', bg: 'bg-gray-50', pulse: false },
  }

  const langLabel = { gu: 'ગુજ', hi: 'हिं', en: 'EN' }
  const langColor = { gu: 'bg-saffron-100 text-saffron-700', hi: 'bg-ink-100 text-ink-700', en: 'bg-jade-100 text-jade-700' }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-in">
        <div>
          <p className="text-ink-400 text-sm font-medium mb-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-display font-bold text-3xl text-ink-900">
            નમસ્તે, {user.company_name || 'Welcome'} 👋
          </h1>
        </div>
        <Link to="/campaigns/new"
          className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-800 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-ink-200 group">
          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
          New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Campaigns" value={campaigns.length} icon={Megaphone || Phone} color="indigo" change="+2 this week" delay={0} />
        <StatCard label="Total Contacts" value={totalContacts.toLocaleString('en-IN')} icon={Users} color="purple" change="+148" delay={50} />
        <StatCard label="Calls Completed" value={totalCompleted.toLocaleString('en-IN')} icon={CheckCircle} color="green" change="+86" delay={100} />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={TrendingUp} color="orange" delay={150} />
      </div>

      {/* Active campaigns banner */}
      {activeCampaigns.length > 0 && (
        <div className="mb-8 p-5 bg-gradient-to-r from-ink-900 to-ink-800 rounded-2xl flex items-center gap-4 animate-slide-up border border-ink-700">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">
              {activeCampaigns.length} campaign{activeCampaigns.length > 1 ? 's' : ''} running live
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-ink-300">
                {activeCampaigns.map(c => c.name).join(' · ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-saffron-400">
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
          </div>
        </div>
      )}

      {/* Campaigns list */}
      <div className="bg-white rounded-3xl border border-ink-100/60 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-ink-50">
          <h2 className="font-display font-bold text-lg text-ink-900">Recent Campaigns</h2>
          <Link to="/campaigns" className="flex items-center gap-1 text-ink-500 hover:text-ink-800 text-sm font-medium transition-colors">
            View all <ArrowUpRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-ink-200 border-t-ink-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-ink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-ink-300" />
            </div>
            <p className="font-display font-bold text-ink-600 text-lg mb-2">No campaigns yet</p>
            <p className="text-ink-400 text-sm mb-6">Create your first AI voice campaign</p>
            <Link to="/campaigns/new"
              className="inline-flex items-center gap-2 bg-ink-900 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-ink-800 transition-colors">
              <Plus size={15} /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-ink-50">
            {campaigns.slice(0, 5).map((c, i) => {
              const total = c.total_contacts || 0
              const done = c.completed_calls || 0
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              const meta = statusMeta[c.status] || statusMeta.draft
              return (
                <Link key={c.id} to={`/campaigns/${c.id}`}
                  className="flex items-center gap-5 px-7 py-5 hover:bg-ink-50/50 transition-colors group animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  {/* Icon */}
                  <div className="w-10 h-10 bg-ink-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-ink-100 transition-colors">
                    <Phone size={16} className="text-ink-500" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-ink-900 text-sm truncate">{c.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${langColor[c.language_priority]}`}>
                        {langLabel[c.language_priority]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden max-w-[140px]">
                        <div className="h-full bg-gradient-to-r from-ink-500 to-saffron-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-ink-400">{done}/{total}</span>
                    </div>
                  </div>
                  {/* Status */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${meta.bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'status-active' : ''}`} />
                    <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-ink-300 group-hover:text-ink-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
