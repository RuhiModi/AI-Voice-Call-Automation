import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import { Plus, Radio, ChevronRight, Filter } from 'lucide-react'
import { B } from '../components/ui'

const BRAND = '#FF6B35'
const GRAD  = 'linear-gradient(135deg,#FF8C42,#FF6B35,#E63946)'

const STATUS_TABS = ['all','active','paused','completed','draft']
const TYPE_FILTERS = ['all','reminder','survey','announcement','political','custom']

const STATUS_META = {
  active:    { label:'Live',      bg:'#ECFDF5', color:'#065F46', dot:'#10B981', pulse:true  },
  completed: { label:'Done',      bg:'#F9FAFB', color:'#374151', dot:'#9CA3AF', pulse:false },
  paused:    { label:'Paused',    bg:'#FFFBEB', color:'#92400E', dot:'#F59E0B', pulse:false },
  draft:     { label:'Draft',     bg:'#F9FAFB', color:'#9CA3AF', dot:'#D1D5DB', pulse:false },
}

const TYPE_EMOJI = { announcement:'📢', survey:'📋', reminder:'⏰', political:'🗳️', custom:'⚙️' }
const LANG_LABEL = { gu:'ગુજ', hi:'हिं', en:'EN' }

function ProgressBar({ pct }) {
  return (
    <div style={{ height:4, background:'#F3F4F6', borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:4, width:`${Math.min(pct,100)}%`, background:GRAD, borderRadius:99, transition:'width .7s' }}/>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'20px' }}>
      <div style={{ height:12, width:'60%', background:'#F3F4F6', borderRadius:6, marginBottom:10, animation:'pulse 1.4s ease infinite' }}/>
      <div style={{ height:10, width:'40%', background:'#F3F4F6', borderRadius:6, marginBottom:20, animation:'pulse 1.4s ease infinite' }}/>
      <div style={{ height:4, background:'#F3F4F6', borderRadius:99, animation:'pulse 1.4s ease infinite' }}/>
    </div>
  )
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns,    setCampaigns]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusTab,    setStatusTab]    = useState('all')
  const [typeFilter,   setTypeFilter]   = useState('all')

  useEffect(() => {
    campaignApi.list()
      .then(r => setCampaigns(r.data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  const counts = STATUS_TABS.reduce((acc, s) => {
    acc[s] = s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length
    return acc
  }, {})

  const filtered = campaigns.filter(c => {
    const q = search.toLowerCase()
    return (
      (c.name.toLowerCase().includes(q) || (c.description||'').toLowerCase().includes(q)) &&
      (statusTab  === 'all' || c.status === statusTab) &&
      (typeFilter === 'all' || c.campaign_type === typeFilter)
    )
  })

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:1280, margin:'0 auto' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}} @keyframes ping{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f0f0f', margin:0, letterSpacing:'-0.025em' }}>Campaigns</h1>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0' }}>{campaigns.length} total · {counts.active || 0} live now</p>
        </div>
        <button onClick={() => navigate('/dashboard/campaigns/new')} style={{
          display:'flex', alignItems:'center', gap:7, padding:'10px 20px',
          borderRadius:10, border:'none', background:GRAD, color:'#fff',
          fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 3px 14px rgba(255,107,53,.30)',
          fontFamily:'inherit',
        }}>
          <Plus size={14}/> New Campaign
        </button>
      </div>

      {/* Filters row */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search campaigns..."
            style={{ width:'100%', padding:'9px 14px 9px 36px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:13, color:'#374151', background:'#fff', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color .15s' }}
            onFocus={e=>e.target.style.borderColor=BRAND} onBlur={e=>e.target.style.borderColor='#E5E7EB'}
          />
        </div>
        {/* Type filter */}
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          style={{ padding:'9px 32px 9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:13, color:'#374151', background:'#fff', cursor:'pointer', fontFamily:'inherit', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239CA3AF' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center' }}>
          {TYPE_FILTERS.map(t => <option key={t} value={t}>{t==='all'?'All Types':t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
      </div>

      {/* Status tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, overflowX:'auto', paddingBottom:2 }}>
        {STATUS_TABS.map(s => {
          const active = statusTab === s
          return (
            <button key={s} onClick={() => setStatusTab(s)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
              borderRadius:10, fontSize:12, fontWeight:active?700:500,
              cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s',
              background: active ? GRAD : '#fff',
              color: active ? '#fff' : '#6B7280',
              border: active ? 'none' : '1px solid #E5E7EB',
              boxShadow: active ? '0 3px 10px rgba(255,107,53,.25)' : 'none',
              fontFamily:'inherit',
            }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}
              <span style={{
                fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20,
                background: active ? 'rgba(255,255,255,.25)' : '#F3F4F6',
                color: active ? '#fff' : '#9CA3AF',
              }}>{counts[s] || 0}</span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E5E7EB', padding:'52px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'#F9FAFB', border:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:24 }}>
            <Radio size={24} color="#D1D5DB"/>
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>
            {search ? `No results for "${search}"` : 'No campaigns yet'}
          </p>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'0 0 20px' }}>Create your first AI voice campaign to get started</p>
          <button onClick={() => navigate('/dashboard/campaigns/new')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            <Plus size={14}/> Create Campaign
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {filtered.map((c, i) => {
            const total = c.total_contacts  || 0
            const done  = c.completed_calls || 0
            const pct   = total > 0 ? Math.round((done/total)*100) : 0
            const sm    = STATUS_META[c.status] || STATUS_META.draft
            return (
              <Link key={c.id} to={`/dashboard/campaigns/${c.id}`}
                style={{ textDecoration:'none', display:'block', animationDelay:`${i*30}ms` }}>
                <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'20px', transition:'all .2s', height:'100%' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#D1D5DB'; e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,.07)'; e.currentTarget.style.transform='translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>

                  {/* Top row */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:38, height:38, borderRadius:11, background:'#F9FAFB', border:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {TYPE_EMOJI[c.campaign_type] || '📞'}
                      </div>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:sm.bg, color:sm.color }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:sm.dot, animation:sm.pulse?'ping 1.5s ease-in-out infinite':'none' }}/>
                        {sm.label}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:8, background:'#FFF4F0', color:BRAND }}>
                        {LANG_LABEL[c.language_priority] || 'gu'}
                      </span>
                      <ChevronRight size={14} color="#D1D5DB"/>
                    </div>
                  </div>

                  {/* Name & desc */}
                  <p style={{ fontSize:14, fontWeight:700, color:'#0f0f0f', margin:'0 0 4px', lineHeight:1.3 }}>{c.name}</p>
                  {c.description && <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 14px', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{c.description}</p>}

                  {/* Progress */}
                  <div style={{ marginTop:'auto', paddingTop:14, borderTop:'1px solid #F3F4F6' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:8 }}>
                      <span style={{ color:'#9CA3AF' }}>{done.toLocaleString('en-IN')} / {total.toLocaleString('en-IN')} calls</span>
                      <span style={{ fontWeight:700, color:pct>0?BRAND:'#D1D5DB' }}>{pct}%</span>
                    </div>
                    <ProgressBar pct={pct}/>
                  </div>

                  {/* Agent */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
                    <div style={{ width:22, height:22, borderRadius:7, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff' }}>
                      {(c.persona_name||'P')[0]}
                    </div>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>
                      {c.persona_name||'Priya'} · <span style={{ textTransform:'capitalize' }}>{c.campaign_type||'custom'}</span>
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
