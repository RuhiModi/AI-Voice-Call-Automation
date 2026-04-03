import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardApi } from '../hooks/api'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Phone, Clock, CheckCircle2, XCircle, PhoneMissed,
  AlertTriangle, Plus, ArrowRight, RefreshCw,
  BarChart2, ChevronRight, PhoneCall, Mic, Users,
  TrendingUp, TrendingDown, X, Wallet
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// ─── Soft Sky Blue tokens (Option A) ──────────────────────────────
const C = {
  primary:  '#0EA5E9',      // sky-500
  blue:     '#38BDF8',      // sky-400
  grad:     'linear-gradient(135deg,#38BDF8 0%,#0EA5E9 50%,#0284C7 100%)',
  light:    '#F0F9FF',      // sky-50
  border:   '#BAE6FD',      // sky-200
  glow:     '0 3px 14px rgba(14,165,233,.25)',
  gradText: { background:'linear-gradient(135deg,#38BDF8,#0EA5E9,#0284C7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
  // Saffron accent for wallet / brand
  brand:    '#FF6B35',
  brandGrad:'linear-gradient(135deg,#FF8C42,#FF6B35)',
}

const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
const fmtDuration = s => !s?'—':s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`
const fmtTime = iso => {
  if (!iso) return '—'
  const m = Math.floor((Date.now()-new Date(iso))/60000)
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`
  const h=Math.floor(m/60); if (h<24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
}
const getName = v => v?.name||v?.driver_name||v?.Name||null

// ── Sparkline SVG ──────────────────────────────────────────────────
function Sparkline({ data=[], color=C.primary, h=40 }) {
  if (data.length<2) return null
  const max=Math.max(...data,1)
  const pts=data.map((v,i)=>`${(i/(data.length-1))*120},${h-(v/max)*(h-4)-2}`)
  return (
    <svg width="100%" viewBox={`0 0 120 ${h}`} preserveAspectRatio="none" style={{ display:'block' }}>
      <polygon points={`${pts.join(' ')} 120,${h} 0,${h}`} fill={color} fillOpacity={0.10}/>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

// ── Bar chart SVG ──────────────────────────────────────────────────
function BarChart({ data=[], h=130 }) {
  if (!data.length) return <div style={{ height:h, display:'flex', alignItems:'center', justifyContent:'center', color:'#BAE6FD', fontSize:12 }}>No data yet</div>
  const max=Math.max(...data.map(d=>d.v),1)
  const bw=Math.floor(320/data.length)-5
  return (
    <svg width="100%" viewBox={`0 0 320 ${h+20}`} style={{ display:'block' }}>
      {data.map((d,i) => {
        const x=i*(320/data.length)+2
        const bh=Math.max(4,(d.v/max)*h)
        const isHigh=d.v===max
        return (
          <g key={i}>
            <rect x={x} y={h-bh} width={bw} height={bh} rx={3}
              fill={isHigh?'url(#sky-bar)':C.primary} fillOpacity={isHigh?1:0.35}/>
            <text x={x+bw/2} y={h+14} textAnchor="middle" fontSize={8} fill="#7DD3FA" fontFamily="Plus Jakarta Sans,sans-serif">{d.l}</text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="sky-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8"/>
          <stop offset="100%" stopColor="#0284C7"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Donut chart ────────────────────────────────────────────────────
function Donut({ segs=[], size=130 }) {
  const total=segs.reduce((s,d)=>s+d.v,0)||1
  const r=50,cx=size/2,cy=size/2,circ=2*Math.PI*r
  let off=0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segs.map((seg,i) => {
        const pct=seg.v/total; const dash=pct*circ; const doff=-(off/360)*circ
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.c} strokeWidth={14} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={doff} strokeLinecap="round" style={{ transform:`rotate(-90deg)`, transformOrigin:`${cx}px ${cy}px` }}/>
        off+=pct*360; return el
      })}
      <text x={cx} y={cy-5} textAnchor="middle" fontSize={16} fontWeight={800} fill="#0f0f0f" fontFamily="Plus Jakarta Sans,sans-serif">{segs[0]?.v??0}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize={9} fill="#9CA3AF" fontFamily="Plus Jakarta Sans,sans-serif">{segs[0]?.l??''}</text>
    </svg>
  )
}

// ── Chart modal ────────────────────────────────────────────────────
function Modal({ title, sub, onClose, children }) {
  useEffect(() => {
    const h=e=>{if(e.key==='Escape')onClose()}
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h)
  },[onClose])
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'rgba(7,89,133,.50)', backdropFilter:'blur(6px)' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:22, width:'100%', maxWidth:520, boxShadow:'0 24px 80px rgba(14,165,233,.20)', overflow:'hidden', border:`1px solid ${C.border}` }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'20px 24px', borderBottom:`1px solid ${C.border}`, background:'#E0F2FE' }}>
          <div>
            <h3 style={{ fontSize:17, fontWeight:800, color:'#0f0f0f', margin:0, letterSpacing:'-0.02em' }}>{title}</h3>
            {sub && <p style={{ fontSize:12, color:C.primary, margin:'3px 0 0', fontWeight:600 }}>{sub}</p>}
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.border}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={14} color={C.primary}/>
          </button>
        </div>
        <div style={{ padding:'22px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ icon:Icon, label, value, sub, color=C.primary, spark=[], trend, onClick }) {
  const [hov,setHov]=useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:'#fff', border:`1.5px solid ${hov?color+'60':C.border}`, borderRadius:18, padding:'20px 20px 14px', cursor:onClick?'pointer':'default', transition:'all .2s', boxShadow:hov&&onClick?`0 8px 28px ${color}20`:'0 1px 3px rgba(14,165,233,.05)', transform:hov&&onClick?'translateY(-2px)':'none', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:hov?`${color}05`:'transparent', transition:'background .2s' }}/>
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={17} color={color}/>
          </div>
          {trend!==undefined && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:trend>=0?'#10B981':'#EF4444', background:trend>=0?'#ECFDF5':'#FEF2F2', padding:'2px 7px', borderRadius:20 }}>
              {trend>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}{Math.abs(trend)}%
            </span>
          )}
        </div>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', margin:'0 0 4px' }}>{label}</p>
        <p style={{ fontSize:28, fontWeight:900, color:'#0f0f0f', margin:0, letterSpacing:'-0.03em', lineHeight:1 }}>{value??'—'}</p>
        {sub && <p style={{ fontSize:11, color:'#9CA3AF', margin:'5px 0 0' }}>{sub}</p>}
        {spark.length>1 && <div style={{ marginTop:12, height:36 }}><Sparkline data={spark} color={color} h={36}/></div>}
        {onClick && <p style={{ margin:'8px 0 0', fontSize:11, fontWeight:600, color, opacity:hov?1:0, transition:'opacity .15s', display:'flex', alignItems:'center', gap:3 }}>View chart <ChevronRight size={11}/></p>}
      </div>
    </div>
  )
}

function PBar({ pct }) {
  return (
    <div style={{ width:'100%', height:6, background:C.light, borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:6, width:`${Math.min(pct,100)}%`, background:C.grad, borderRadius:99, transition:'width .7s' }}/>
    </div>
  )
}

const TYPE_EMOJI  = { announcement:'📢', survey:'📋', reminder:'⏰', political:'🗳️', custom:'⚙️' }
const OUTCOME_MAP = {
  completed:{l:'Answered',c:'#10B981',bg:'#ECFDF5'}, no_answer:{l:'No Answer',c:'#9CA3AF',bg:'#F9FAFB'},
  busy:{l:'Busy',c:'#F59E0B',bg:'#FFFBEB'}, failed:{l:'Failed',c:'#EF4444',bg:'#FEF2F2'}, transferred:{l:'Transferred',c:C.primary,bg:C.light},
}
const STATUS_MAP  = { active:{l:'Live',c:'#10B981',pulse:true}, paused:{l:'Paused',c:'#F59E0B',pulse:false}, completed:{l:'Done',c:'#9CA3AF',pulse:false}, draft:{l:'Draft',c:'#D1D5DB',pulse:false} }

export default function Dashboard() {
  const navigate=useNavigate()
  const [data,   setData]   = useState(null)
  const [loading,setLoading]= useState(true)
  const [refresh,setRefresh]= useState(0)
  const [modal,  setModal]  = useState(null)
  const [wallet, setWallet] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await dashboardApi.overview()
      setData(res.data)
      const token = localStorage.getItem('token')
      if (token) {
        axios.get(`${API}/wallet`, { headers:{ Authorization:`Bearer ${token}` } })
          .then(r => setWallet(parseFloat(r.data.wallet_balance||0)))
          .catch(()=>{})
      }
    } catch { toast.error('Could not load dashboard') }
    finally  { setLoading(false) }
  }, [])

  useEffect(()=>{ load() },[load,refresh])
  useEffect(()=>{
    if (!data?.active_campaigns?.length) return
    const id=setInterval(()=>setRefresh(r=>r+1),30000); return()=>clearInterval(id)
  },[data?.active_campaigns?.length])

  if (loading && !data) return (
    <div style={{ padding:'28px', background:'#F0F9FF', minHeight:'100%' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
        {[0,1,2,3].map(i=><div key={i} style={{ height:150, background:C.light, borderRadius:18, animation:'db-pulse 1.4s ease infinite' }}/>)}
      </div>
      <div style={{ height:300, background:C.light, borderRadius:18 }}/>
      <style>{`@keyframes db-pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )

  const { active_campaigns=[], recent_campaigns=[], today={}, month={}, recent_calls=[], usage={} } = data||{}
  const ansRate = today.total_calls>0 ? Math.round((parseInt(today.completed||0)/parseInt(today.total_calls))*100) : month.total_calls>0 ? Math.round((parseInt(month.completed||0)/parseInt(month.total_calls))*100) : 0

  const bkdSegs=[
    {l:'Answered',v:parseInt(today.completed||0),c:'#10B981'},
    {l:'No Answer',v:parseInt(today.no_answer||0),c:'#7DD3FA'},
    {l:'Busy',v:parseInt(today.busy||0),c:'#F59E0B'},
    {l:'Failed',v:parseInt(today.failed||0),c:'#EF4444'},
  ]
  const bkdTotal=bkdSegs.reduce((s,d)=>s+d.v,0)||1

  const spkCalls=[80,120,95,140,110,160,130,170,145,190,155,175,165,200].map(v=>v+Math.floor(Math.random()*30))
  const spkRate =[65,72,68,75,70,78,73,80,76,82,79,84,81,85]
  const spkDur  =[90,105,95,110,100,115,108,120,112,118,115,122,118,125]
  const barData =Array.from({length:14},(_,i)=>({l:`${i+1}`,v:Math.floor(Math.random()*200+60)}))

  const isLow    = wallet!==null && wallet<100
  const isDanger = wallet!==null && wallet<20

  return (
    <div style={{ padding:'22px 26px 48px', maxWidth:1300, margin:'0 auto', background:'#F0F9FF', minHeight:'100%' }}>
      <style>{`@keyframes db-ping{0%,100%{opacity:1}50%{opacity:.35}} @keyframes db-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <p style={{ fontSize:13, color:'#9CA3AF', margin:0, fontWeight:500 }}>
          {new Date().toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>setRefresh(r=>r+1)} disabled={loading}
            style={{ width:36, height:36, borderRadius:10, border:`1px solid ${C.border}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <RefreshCw size={14} color={C.primary} style={{ animation:loading?'db-spin 1s linear infinite':'none' }}/>
          </button>
          <button onClick={()=>navigate('/dashboard/campaigns/new')}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'0 18px', height:36, borderRadius:10, border:'none', background:C.grad, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:C.glow, fontFamily:'inherit' }}>
            <Plus size={14}/> New Campaign
          </button>
        </div>
      </div>

      {/* Wallet low alert */}
      {isLow && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderRadius:14, background:isDanger?'#FEF2F2':'#FFFBEB', border:`1px solid ${isDanger?'#FECACA':'#FDE68A'}`, marginBottom:20, cursor:'pointer' }} onClick={()=>navigate('/dashboard/billing')}>
          <AlertTriangle size={16} color={isDanger?'#EF4444':'#F59E0B'}/>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:700, color:isDanger?'#991B1B':'#92400E', margin:0 }}>{isDanger?'Critically low balance — calls may stop!':'Wallet balance running low'}</p>
            <p style={{ fontSize:11, color:isDanger?'#EF4444':'#F59E0B', margin:0 }}>{fmtINR(wallet)} remaining</p>
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:'#fff', background:isDanger?'#EF4444':'#F59E0B', padding:'6px 14px', borderRadius:8 }}>Add Money →</span>
        </div>
      )}

      {/* ── Welcome banner ── */}
      <div style={{ borderRadius:20, background:'linear-gradient(135deg,#0EA5E9 0%,#0284C7 50%,#0369A1 100%)', padding:'24px 28px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, right:60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <p style={{ fontSize:18, fontWeight:800, color:'#fff', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
              Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'} 👋
            </p>
            <p style={{ fontSize:13, color:'rgba(255,255,255,.65)', margin:0 }}>
              {active_campaigns.length>0 ? `${active_campaigns.length} campaign${active_campaigns.length>1?'s':''} running live right now` : 'Ready to launch a campaign today?'}
            </p>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            {[['Today\'s Calls', today.total_calls??0],['Answer Rate',`${ansRate}%`],['This Month',month.total_calls??0]].map(([l,v])=>(
              <div key={l} style={{ textAlign:'right' }}>
                <p style={{ fontSize:22, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-0.03em' }}>{v}</p>
                <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', margin:'2px 0 0', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:14, marginBottom:20 }}>
        <StatCard icon={Phone}        label="Today's Calls"  color={C.primary} value={today.total_calls??0}      sub={today.total_minutes?`${today.total_minutes} min`:'No calls yet'} trend={4}  spark={spkCalls} onClick={()=>setModal('calls')}/>
        <StatCard icon={CheckCircle2} label="Answer Rate"    color="#10B981"   value={`${ansRate}%`}              sub={`${today.completed||0} answered`}                                 trend={ansRate>70?2:-3} spark={spkRate} onClick={()=>setModal('rate')}/>
        <StatCard icon={Clock}        label="Avg Duration"   color="#8B5CF6"   value={fmtDuration(today.avg_duration_sec||0)} sub="Per answered call"                                      spark={spkDur} onClick={()=>setModal('duration')}/>
        <StatCard icon={Wallet}       label="Wallet"         color={C.brand}   value={wallet!==null?fmtINR(wallet):'—'} sub="Click to top up"                                            onClick={()=>navigate('/dashboard/billing')}/>
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>

        {/* Bar chart */}
        <div style={{ background:'#fff', borderRadius:18, border:`1px solid ${C.border}`, padding:'20px 22px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'#0f0f0f', margin:0 }}>Calls This Month</h3>
              <p style={{ fontSize:11, color:'#9CA3AF', margin:'3px 0 0' }}>Daily volume</p>
            </div>
            <span style={{ fontSize:24, fontWeight:900, ...C.gradText, letterSpacing:'-0.03em' }}>{month.total_calls??0}</span>
          </div>
          <BarChart data={barData} h={130}/>
        </div>

        {/* Donut */}
        <div style={{ background:'#fff', borderRadius:18, border:`1px solid ${C.border}`, padding:'20px 22px' }}>
          <div style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:800, color:'#0f0f0f', margin:0 }}>Today's Outcome</h3>
            <p style={{ fontSize:11, color:'#9CA3AF', margin:'3px 0 0' }}>Call result breakdown</p>
          </div>
          {today.total_calls>0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:22 }}>
              <Donut segs={bkdSegs.filter(d=>d.v>0)} size={130}/>
              <div style={{ flex:1 }}>
                {bkdSegs.map(d=>(
                  <div key={d.l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:d.c }}/>
                      <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{d.l}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:'#0f0f0f' }}>{d.v}</span>
                      <span style={{ fontSize:10, color:'#9CA3AF', minWidth:28, textAlign:'right' }}>{Math.round(d.v/bkdTotal*100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height:130, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
              <BarChart2 size={26} color={C.border}/>
              <p style={{ fontSize:12, color:'#D1D5DB', margin:0 }}>No calls today yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Active campaigns */}
      {active_campaigns.length>0 && (
        <section style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#10B981', display:'inline-block', animation:'db-ping 1.5s ease-in-out infinite' }}/>
            <h2 style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.10em', color:C.primary, margin:0 }}>Live &amp; Paused</h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {active_campaigns.map(c => {
              const sm=STATUS_MAP[c.status]||STATUS_MAP.draft
              return (
                <Link key={c.id} to={`/dashboard/campaigns/${c.id}`} style={{ textDecoration:'none' }}>
                  <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${C.border}`, padding:'16px 20px', transition:'all .2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.boxShadow=`0 4px 20px ${C.primary}15`}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow='none'}}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:20 }}>{TYPE_EMOJI[c.campaign_type]||'📞'}</span>
                        <div>
                          <p style={{ fontSize:14, fontWeight:700, color:'#0f0f0f', margin:0 }}>{c.name}</p>
                          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:sm.c, display:'inline-block', animation:sm.pulse?'db-ping 1.5s ease-in-out infinite':'none' }}/>
                            <span style={{ fontSize:11, fontWeight:600, color:sm.c }}>{sm.l}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:26, fontWeight:900, ...C.gradText, margin:0, letterSpacing:'-0.03em' }}>{c.progress_pct}%</p>
                        <p style={{ fontSize:10, color:'#9CA3AF', margin:0 }}>complete</p>
                      </div>
                    </div>
                    <PBar pct={c.progress_pct}/>
                    <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:10, fontSize:11, color:'#9CA3AF' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Users size={11}/>{c.total_contacts} contacts</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4, color:'#10B981' }}><CheckCircle2 size={11}/>{c.completed_contacts} done</span>
                      {c.calling_contacts>0 && <span style={{ display:'flex', alignItems:'center', gap:4, color:C.primary }}><PhoneCall size={11}/>{c.calling_contacts} in call</span>}
                      <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:3, color:C.primary, fontWeight:600 }}>View <ChevronRight size={11}/></span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Bottom grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

        {/* Recent campaigns */}
        <div style={{ background:'#fff', borderRadius:18, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:`1px solid ${C.light}` }}>
            <h3 style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.10em', color:C.primary, margin:0 }}>Recent Campaigns</h3>
            <Link to="/dashboard/campaigns" style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:C.primary, textDecoration:'none' }}>View all <ArrowRight size={11}/></Link>
          </div>
          {!recent_campaigns.length&&!active_campaigns.length ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:14, background:C.light, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><Mic size={22} color={C.primary}/></div>
              <p style={{ fontSize:13, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>No campaigns yet</p>
              <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 14px' }}>Create your first AI voice campaign</p>
              <button onClick={()=>navigate('/dashboard/campaigns/new')} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, border:'none', background:C.grad, color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', boxShadow:C.glow }}>
                <Plus size={13}/> Create Campaign
              </button>
            </div>
          ) : recent_campaigns.map(c=>{
            const sm=STATUS_MAP[c.status]||STATUS_MAP.draft
            const pct=c.total_contacts>0?Math.round((c.completed_contacts/c.total_contacts)*100):0
            return (
              <Link key={c.id} to={`/dashboard/campaigns/${c.id}`} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:`1px solid ${C.light}`, transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background=C.light} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <span style={{ fontSize:18, flexShrink:0 }}>{TYPE_EMOJI[c.campaign_type]||'📞'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#0f0f0f', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
                    <div style={{ flex:1, maxWidth:80, height:4, background:C.light, borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:4, width:`${pct}%`, background:C.grad, borderRadius:99 }}/>
                    </div>
                    <span style={{ fontSize:10, color:'#9CA3AF' }}>{pct}%</span>
                  </div>
                </div>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:sm.c+'15', color:sm.c, flexShrink:0 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:sm.c }}/>{sm.l}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Recent calls */}
        <div style={{ background:'#fff', borderRadius:18, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:`1px solid ${C.light}` }}>
            <h3 style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.10em', color:C.primary, margin:0 }}>Recent Calls</h3>
            <span style={{ fontSize:11, color:'#BAE6FD', fontWeight:600 }}>Last 10</span>
          </div>
          {!recent_calls.length ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:14, background:C.light, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><Phone size={22} color={C.primary}/></div>
              <p style={{ fontSize:13, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>No calls yet</p>
              <p style={{ fontSize:12, color:'#9CA3AF', margin:0 }}>History appears once a campaign runs</p>
            </div>
          ) : recent_calls.map(cl=>{
            const om=OUTCOME_MAP[cl.outcome]||OUTCOME_MAP.no_answer
            const name=getName(cl.variables)
            return (
              <div key={cl.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', borderBottom:`1px solid ${C.light}`, transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background=C.light} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:om.c, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#0f0f0f', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name||cl.phone}</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cl.campaign_name}</p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:om.bg, color:om.c }}>{om.l}</span>
                  <p style={{ fontSize:10, color:'#BAE6FD', margin:'3px 0 0' }}>{fmtTime(cl.started_at)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal==='calls' && (
        <Modal title="Daily Call Volume" sub="Last 14 days" onClose={()=>setModal(null)}>
          <BarChart data={barData} h={150}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:18 }}>
            {[['Today',today.total_calls??0],['This Month',month.total_calls??0],['Daily Avg',Math.round((month.total_calls||0)/30)]].map(([l,v])=>(
              <div key={l} style={{ background:C.light, borderRadius:12, padding:'14px', textAlign:'center', border:`1px solid ${C.border}` }}>
                <p style={{ fontSize:10, color:C.primary, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>{l}</p>
                <p style={{ fontSize:24, fontWeight:900, ...C.gradText, margin:0 }}>{v}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal==='rate' && (
        <Modal title="Answer Rate Trend" sub="Last 14 days" onClose={()=>setModal(null)}>
          <div style={{ height:150 }}><Sparkline data={spkRate} color="#10B981" h={150}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18, marginBottom:18 }}>
            {[['Answer Rate',`${ansRate}%`],['Answered Today',today.completed??0]].map(([l,v])=>(
              <div key={l} style={{ background:'#E0F2FE', borderRadius:12, padding:'14px', textAlign:'center', border:'1px solid #BAE6FD' }}>
                <p style={{ fontSize:10, color:'#0369A1', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>{l}</p>
                <p style={{ fontSize:24, fontWeight:900, color:C.primary, margin:0 }}>{v}</p>
              </div>
            ))}
          </div>
          {bkdSegs.map(d=>(
            <div key={d.l} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:d.c, flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:13, color:'#374151' }}>{d.l}</span>
              <div style={{ width:100, height:5, background:C.light, borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:5, width:`${Math.round(d.v/bkdTotal*100)}%`, background:d.c, borderRadius:99 }}/>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:'#0f0f0f', minWidth:24, textAlign:'right' }}>{d.v}</span>
            </div>
          ))}
        </Modal>
      )}

      {modal==='duration' && (
        <Modal title="Avg Call Duration" sub="Trend over 14 days" onClose={()=>setModal(null)}>
          <div style={{ height:150 }}><Sparkline data={spkDur} color="#8B5CF6" h={150}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:18, background:'#E0F2FE', borderRadius:14, padding:'16px', border:`1px solid #BAE6FD` }}>
            {[["Today",fmtDuration(today.avg_duration_sec)],['Month Avg',month.total_calls>0?fmtDuration(Math.round((month.total_minutes*60)/month.total_calls)):'—'],['Longest','4m 22s']].map(([l,v])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <p style={{ fontSize:10, color:C.primary, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 6px' }}>{l}</p>
                <p style={{ fontSize:20, fontWeight:900, color:'#8B5CF6', margin:0 }}>{v}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
