import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import { Plus, Search, ChevronRight, Radio } from 'lucide-react'

const SKY  = '#0EA5E9', SKYD = '#0284C7', GRAD = 'linear-gradient(135deg,#38BDF8,#0EA5E9,#0284C7)'
const BG   = '#F0F9FF', BORD = '#BAE6FD', GLOW = '0 3px 16px rgba(14,165,233,.22)'

const STATUS_TABS  = ['all','active','paused','completed','draft']
const TYPE_FILTERS = ['all','reminder','survey','announcement','political','custom']

const SM = {
  active:    { label:'Live',      c:'#10B981', bg:'#ECFDF5', pulse:true  },
  completed: { label:'Done',      c:'#9CA3AF', bg:'#F9FAFB', pulse:false },
  paused:    { label:'Paused',    c:'#F59E0B', bg:'#FFFBEB', pulse:false },
  draft:     { label:'Draft',     c:'#D1D5DB', bg:'#F9FAFB', pulse:false },
}
const TE = { announcement:'📢', survey:'📋', reminder:'⏰', political:'🗳️', custom:'⚙️' }
const LL = { gu:'ગુજ', hi:'हिं', en:'EN' }

function PBar({ pct }) {
  return (
    <div style={{ height:4, background:BG, borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:4, width:`${Math.min(pct,100)}%`, background:GRAD, borderRadius:99, transition:'width .7s' }}/>
    </div>
  )
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [tab,       setTab]       = useState('all')
  const [typeF,     setTypeF]     = useState('all')

  useEffect(() => {
    campaignApi.list()
      .then(r => setCampaigns(r.data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  const counts = STATUS_TABS.reduce((a, s) => {
    a[s] = s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length
    return a
  }, {})

  const filtered = campaigns.filter(c => {
    const q = search.toLowerCase()
    return (
      (c.name.toLowerCase().includes(q) || (c.description||'').toLowerCase().includes(q)) &&
      (tab   === 'all' || c.status        === tab) &&
      (typeF === 'all' || c.campaign_type === typeF)
    )
  })

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:1280, margin:'0 auto', background:BG, minHeight:'100%' }}>
      <style>{`@keyframes pg-pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes pg-ping{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.025em' }}>Campaigns</h1>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0' }}>{campaigns.length} total · {counts.active||0} live now</p>
        </div>
        <button onClick={() => navigate('/dashboard/campaigns/new')}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:GLOW, fontFamily:'inherit' }}>
          <Plus size={14}/> New Campaign
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search campaigns..."
            style={{ width:'100%', padding:'9px 14px 9px 34px', border:`1.5px solid ${BORD}`, borderRadius:10, fontSize:13, color:'#374151', background:'#fff', fontFamily:'inherit', boxSizing:'border-box', outline:'none', transition:'border-color .15s' }}
            onFocus={e=>e.target.style.borderColor=SKY} onBlur={e=>e.target.style.borderColor=BORD}
          />
        </div>
        <select value={typeF} onChange={e=>setTypeF(e.target.value)}
          style={{ padding:'9px 32px 9px 12px', border:`1.5px solid ${BORD}`, borderRadius:10, fontSize:13, color:'#374151', background:'#fff', cursor:'pointer', fontFamily:'inherit', outline:'none', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%230EA5E9' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center' }}>
          {TYPE_FILTERS.map(t => <option key={t} value={t}>{t==='all'?'All Types':t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
      </div>

      {/* Status tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, overflowX:'auto', paddingBottom:2 }}>
        {STATUS_TABS.map(s => {
          const active = tab === s
          return (
            <button key={s} onClick={() => setTab(s)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10,
              fontSize:12, fontWeight:active?700:500, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s',
              background:active?GRAD:'#fff', color:active?'#fff':'#6B7280',
              border:active?'none':`1px solid ${BORD}`,
              boxShadow:active?GLOW:'none', fontFamily:'inherit',
            }}>
              {s==='all'?'All':s.charAt(0).toUpperCase()+s.slice(1)}
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:active?'rgba(255,255,255,.25)':BG, color:active?'#fff':SKY }}>
                {counts[s]||0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height:180, background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, animation:'pg-pulse 1.4s ease infinite' }}/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:18, border:`1px solid ${BORD}`, padding:'52px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:BG, border:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Radio size={24} color={SKY}/>
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>
            {search ? `No results for "${search}"` : 'No campaigns yet'}
          </p>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'0 0 20px' }}>Create your first AI voice campaign</p>
          <button onClick={() => navigate('/dashboard/campaigns/new')}
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', boxShadow:GLOW }}>
            <Plus size={14}/> Create Campaign
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {filtered.map(c => {
            const total = c.total_contacts  || 0
            const done  = c.completed_calls || 0
            const pct   = total > 0 ? Math.round((done/total)*100) : 0
            const sm    = SM[c.status] || SM.draft
            return (
              <Link key={c.id} to={`/dashboard/campaigns/${c.id}`} style={{ textDecoration:'none', display:'block' }}>
                <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, padding:'20px', transition:'all .2s', height:'100%', boxSizing:'border-box' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=SKY;e.currentTarget.style.boxShadow=`0 6px 24px rgba(14,165,233,.12)`;e.currentTarget.style.transform='translateY(-2px)'}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=BORD;e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none'}}>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:38, height:38, borderRadius:11, background:BG, border:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {TE[c.campaign_type]||'📞'}
                      </div>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:sm.bg, color:sm.c }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:sm.c, animation:sm.pulse?'pg-ping 1.5s ease-in-out infinite':'none' }}/>
                        {sm.label}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:8, background:BG, color:SKY, border:`1px solid ${BORD}` }}>
                        {LL[c.language_priority]||'gu'}
                      </span>
                      <ChevronRight size={14} color={BORD}/>
                    </div>
                  </div>

                  <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:'0 0 4px', lineHeight:1.3 }}>{c.name}</p>
                  {c.description && <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 14px', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{c.description}</p>}

                  <div style={{ marginTop:'auto', paddingTop:14, borderTop:`1px solid ${BG}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:7 }}>
                      <span style={{ color:'#9CA3AF' }}>{done.toLocaleString('en-IN')} / {total.toLocaleString('en-IN')} calls</span>
                      <span style={{ fontWeight:700, color:pct>0?SKY:'#D1D5DB' }}>{pct}%</span>
                    </div>
                    <PBar pct={pct}/>
                  </div>

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
