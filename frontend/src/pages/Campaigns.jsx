import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import { Plus, Search, Phone, ChevronRight } from 'lucide-react'

const STATUS_FILTERS = ['all', 'active', 'completed', 'paused', 'draft']
const TYPE_FILTERS   = ['all', 'reminder', 'survey', 'political', 'custom']

const statusStyle = {
  active:    { badge: 'badge-active',    dot: '#52b87c', label: 'Active',    pulse: true  },
  completed: { badge: 'badge-completed', dot: '#a8a8a8', label: 'Completed', pulse: false },
  paused:    { badge: 'badge-paused',    dot: '#f9bc30', label: 'Paused',    pulse: false },
  draft:     { badge: 'badge-draft',     dot: '#dcdcdc', label: 'Draft',     pulse: false },
}
const langLabel = { gu: 'ગુજ', hi: 'हिं', en: 'EN' }

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
    const q = search.toLowerCase()
    return (
      (c.name.toLowerCase().includes(q) || (c.description||'').toLowerCase().includes(q)) &&
      (statusFilter === 'all' || c.status === statusFilter) &&
      (typeFilter   === 'all' || c.campaign_type === typeFilter)
    )
  })

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length
    return acc
  }, {})

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>Campaigns</h1>
          <p className="text-sm mt-1" style={{ color: '#8a8a8a' }}>{campaigns.length} total · {counts.active || 0} active</p>
        </div>
        <Link to="/dashboard/campaigns/new" className="btn-primary flex-shrink-0">
          <Plus size={15} /> New Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#c4c4c4' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="input-field pl-10" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="input-field" style={{ width: 'auto', cursor: 'pointer' }}>
          {TYPE_FILTERS.map(t => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all"
            style={statusFilter === s
              ? { background: '#1a1a1a', color: '#fff' }
              : { background: '#fff', border: '1px solid #e8e3db', color: '#6b6b6b' }}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="text-[11px] px-1.5 py-0.5 rounded-md font-semibold"
              style={statusFilter === s ? { background: 'rgba(255,255,255,0.2)', color: '#fff' } : { background: '#f5f1ea', color: '#8a8a8a' }}>
              {counts[s] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-5">
              <div className="skeleton h-3 w-3/4 mb-3" />
              <div className="skeleton h-3 w-1/2 mb-6" />
              <div className="skeleton h-1.5 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#faf8f4' }}>
            <Search size={24} style={{ color: '#d0c9be' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: '#3d3d3d', fontFamily: '"DM Serif Display",serif' }}>
            {search ? `No results for "${search}"` : 'No campaigns yet'}
          </p>
          <p className="text-sm mb-5" style={{ color: '#a8a8a8' }}>Create your first campaign to get started</p>
          <Link to="/dashboard/campaigns/new" className="btn-primary inline-flex">
            <Plus size={14} /> Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const total = c.total_contacts  || 0
            const done  = c.completed_calls || 0
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0
            const st    = statusStyle[c.status] || statusStyle.draft
            return (
              <Link key={c.id} to={`/dashboard/campaigns/${c.id}`}
                className="card card-lift p-5 group animate-fade-up"
                style={{ animationDelay: `${i*40}ms`, textDecoration: 'none' }}>

                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${st.badge}`}>{st.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: '#fef3d0', color: '#b86f0e' }}>
                      {langLabel[c.language_priority] || 'gu'}
                    </span>
                    <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" style={{ color: '#d0c9be' }} />
                  </div>
                </div>

                <p className="font-semibold text-[14px] leading-snug mb-1" style={{ color: '#1a1a1a' }}>{c.name}</p>
                {c.description && <p className="text-[12px] mb-4 line-clamp-1" style={{ color: '#a8a8a8' }}>{c.description}</p>}

                <div className="mt-auto pt-4" style={{ borderTop: '1px solid #f5f1ea' }}>
                  <div className="flex justify-between text-[11px] mb-2" style={{ color: '#a8a8a8' }}>
                    <span>{done} / {total} calls</span>
                    <span className="font-semibold" style={{ color: '#6b6b6b' }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #f5a623, #e08c10)' }}>
                    {(c.persona_name || 'P')[0]}
                  </div>
                  <span className="text-[11px]" style={{ color: '#a8a8a8' }}>
                    {c.persona_name || 'Priya'} · <span className="capitalize">{c.campaign_type || 'custom'}</span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
