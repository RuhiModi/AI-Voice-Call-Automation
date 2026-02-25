import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import { Plus, Search, Phone, ChevronRight, Clock, CheckCircle, PauseCircle, FileEdit } from 'lucide-react'

const STATUS_FILTERS = ['all', 'active', 'completed', 'paused', 'draft']
const TYPE_FILTERS   = ['all', 'reminder', 'survey', 'political', 'custom']

const statusMeta = {
  active:    { label: 'Active',    dot: 'bg-jade-400',   text: 'text-jade-700',   bg: 'bg-jade-50',   pulse: true  },
  completed: { label: 'Completed', dot: 'bg-navy-400',   text: 'text-navy-600',   bg: 'bg-navy-50',   pulse: false },
  paused:    { label: 'Paused',    dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', pulse: false },
  draft:     { label: 'Draft',     dot: 'bg-gray-300',   text: 'text-gray-500',   bg: 'bg-gray-50',   pulse: false },
}
const langLabel = { gu: 'ગુજ', hi: 'हिं', en: 'EN' }
const langColor = {
  gu: 'bg-orange-100 text-orange-700 border-orange-200',
  hi: 'bg-navy-100 text-navy-700 border-navy-200',
  en: 'bg-jade-100 text-jade-700 border-jade-200',
}

export default function Campaigns() {
  const [campaigns,    setCampaigns]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter,   setTypeFilter]   = useState('all')

  useEffect(() => {
    campaignApi.list()
      .then(r => setCampaigns(r.data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchType   = typeFilter   === 'all' || c.campaign_type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length
    return acc
  }, {})

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="font-display font-bold text-3xl text-navy-900">Campaigns</h1>
          <p className="text-navy-400 text-sm mt-1">{campaigns.length} total · {counts.active || 0} active</p>
        </div>
        <Link to="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition-all hover:shadow-lg group">
          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
          New Campaign
        </Link>
      </div>

      {/* Search + Type */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..."
            className="w-full bg-white border border-navy-100 rounded-2xl pl-10 pr-4 py-3 text-sm text-navy-800 placeholder-navy-300 focus:border-navy-300 focus:outline-none transition-all" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-white border border-navy-100 rounded-2xl px-4 py-3 text-sm text-navy-700 cursor-pointer focus:border-navy-300 focus:outline-none">
          {TYPE_FILTERS.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${statusFilter === s ? 'bg-navy-900 text-white shadow-sm' : 'bg-white border border-navy-100 text-navy-500 hover:border-navy-200 hover:text-navy-700'}`}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className={`text-xs px-1.5 py-0.5 rounded-lg font-semibold ${statusFilter === s ? 'bg-white/20 text-white' : 'bg-navy-50 text-navy-500'}`}>
              {counts[s] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-navy-100 p-6 animate-pulse">
              <div className="h-4 bg-navy-100 rounded mb-3 w-3/4" />
              <div className="h-3 bg-navy-50 rounded mb-6 w-1/2" />
              <div className="h-2 bg-navy-50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-navy-100 p-16 text-center">
          <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-navy-300" />
          </div>
          <p className="font-display font-bold text-navy-600 text-lg mb-2">No campaigns found</p>
          <p className="text-navy-400 text-sm mb-6">
            {search ? `No results for "${search}"` : 'Create your first campaign'}
          </p>
          <Link to="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 bg-navy-900 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-navy-800 transition-colors">
            <Plus size={15} /> Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c, i) => {
            const total = c.total_contacts  || 0
            const done  = c.completed_calls || 0
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0
            const meta  = statusMeta[c.status] || statusMeta.draft
            return (
              <Link key={c.id} to={`/dashboard/campaigns/${c.id}`}
                className="bg-white rounded-2xl border border-navy-100 p-6 card-hover group animate-slide-up transition-all"
                style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${meta.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'status-active' : ''}`} />
                      <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${langColor[c.language_priority] || langColor.gu}`}>
                      {langLabel[c.language_priority] || 'gu'}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-navy-300 group-hover:text-navy-600 group-hover:translate-x-1 transition-all mt-1" />
                </div>

                <h3 className="font-display font-bold text-navy-900 text-[15px] mb-1 leading-snug">{c.name}</h3>
                {c.description && <p className="text-navy-400 text-xs mb-4 line-clamp-1">{c.description}</p>}

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-navy-400">{done} / {total} calls</span>
                    <span className="text-xs font-semibold text-navy-600">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-navy-50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-navy-500 to-orange-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-navy-50">
                  <div className="w-7 h-7 bg-gradient-to-br from-navy-100 to-orange-100 rounded-lg flex items-center justify-center text-xs font-display font-bold text-navy-600">
                    {(c.persona_name || 'P')[0]}
                  </div>
                  <span className="text-xs text-navy-400">Agent: {c.persona_name || 'Priya'}</span>
                  <span className="text-navy-200 text-xs">·</span>
                  <span className="text-xs text-navy-400 capitalize">{c.campaign_type || 'custom'}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
