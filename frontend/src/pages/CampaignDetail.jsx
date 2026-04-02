import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import toast from 'react-hot-toast'
import {
  Play, Pause, Phone, ArrowLeft, Users, Download,
  MessageSquare, Mic, Edit2, X, Check, ChevronDown,
  ChevronUp, RefreshCw, Rocket, Loader2, BarChart2
} from 'lucide-react'

const BRAND = '#FF6B35'
const GRAD  = 'linear-gradient(135deg,#FF8C42,#FF6B35,#E63946)'

const OUTCOME_META = {
  completed:   { label:'Completed',   c:'#10B981', bg:'#ECFDF5' },
  rescheduled: { label:'Rescheduled', c:'#6B7280', bg:'#F9FAFB' },
  busy:        { label:'Busy',        c:'#F59E0B', bg:'#FFFBEB' },
  no_answer:   { label:'No Answer',   c:'#9CA3AF', bg:'#F9FAFB' },
  transferred: { label:'Transferred', c:'#8B5CF6', bg:'#F5F3FF' },
  failed:      { label:'Failed',      c:'#EF4444', bg:'#FEF2F2' },
  in_progress: { label:'Calling',     c:'#3B82F6', bg:'#EFF6FF' },
  dnc:         { label:'DNC',         c:'#9CA3AF', bg:'#F9FAFB' },
  pending:     { label:'Pending',     c:'#9CA3AF', bg:'#F9FAFB' },
  calling:     { label:'Calling',     c:'#3B82F6', bg:'#EFF6FF' },
}
const STATUS_META = {
  active:    { label:'Live',      c:'#10B981', pulse:true  },
  completed: { label:'Completed', c:'#9CA3AF', pulse:false },
  paused:    { label:'Paused',    c:'#F59E0B', pulse:false },
  draft:     { label:'Draft',     c:'#D1D5DB', pulse:false },
}
const LANG_NAMES = { gu:'Gujarati', hi:'Hindi', en:'English' }

function getContactName(vars, fallback='Unknown') {
  try {
    const v = typeof vars==='string' ? JSON.parse(vars) : (vars||{})
    return v.name||v.Name||v.driver_name||v['Driver Name']||v.contact_name||fallback
  } catch { return fallback }
}

function pct(n, total) { return total>0 ? Math.round((n/total)*100) : 0 }

function ProgressBar({ value, color='#10B981' }) {
  return (
    <div style={{ height:6, background:'#F3F4F6', borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:6, width:`${Math.min(value,100)}%`, background:color===BRAND?GRAD:color, borderRadius:99, transition:'width .7s' }}/>
    </div>
  )
}

function StatPill({ label, value, color='#9CA3AF' }) {
  return (
    <div style={{ padding:'12px 16px', borderRadius:14, background:color+'12', border:`1px solid ${color}25`, textAlign:'center', minWidth:80 }}>
      <p style={{ fontSize:22, fontWeight:900, color, margin:0, letterSpacing:'-0.03em' }}>{value}</p>
      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color, margin:'3px 0 0', opacity:.8 }}>{label}</p>
    </div>
  )
}

function Spinner() {
  return <div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }}/>
}

function Btn({ children, onClick, disabled, loading, variant='primary', icon:Icon, size='md' }) {
  const sizes = { sm:{padding:'7px 14px',fontSize:12}, md:{padding:'10px 18px',fontSize:13} }
  const variants = {
    primary: { background:GRAD, color:'#fff', border:'none', boxShadow:'0 3px 14px rgba(255,107,53,.25)' },
    outline: { background:'#fff', color:'#374151', border:'1.5px solid #E5E7EB', boxShadow:'none' },
    green:   { background:'#10B981', color:'#fff', border:'none', boxShadow:'0 3px 14px rgba(16,185,129,.25)' },
    danger:  { background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', boxShadow:'none' },
  }
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{ display:'inline-flex', alignItems:'center', gap:7, borderRadius:10, fontWeight:700, fontFamily:'inherit', cursor:loading||disabled?'not-allowed':'pointer', opacity:disabled&&!loading?0.5:1, transition:'all .15s', ...sizes[size], ...variants[variant] }}>
      {loading ? <Spinner/> : Icon ? <Icon size={14}/> : null}
      {children}
    </button>
  )
}

// Results summary component
function ResultsSummary({ calls, campaign, stats }) {
  if (!calls?.length) return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'52px 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:14 }}>📊</div>
      <p style={{ fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>No results yet</p>
      <p style={{ fontSize:13, color:'#9CA3AF', margin:0 }}>Results will appear here as calls complete</p>
    </div>
  )

  const total      = calls.length
  const completed  = calls.filter(c=>c.outcome==='completed').length
  const rescheduled= calls.filter(c=>c.outcome==='rescheduled').length
  const busy       = calls.filter(c=>c.outcome==='busy').length
  const noAnswer   = calls.filter(c=>c.outcome==='no_answer'||c.outcome==='failed').length
  const acknowledged = calls.filter(c=>c.acknowledged===true).length
  const needFollowUp = calls.filter(c=>c.confusion_count>=2||(c.acknowledged===false&&c.outcome==='completed'))
  const isAnnouncement = campaign?.campaign_type==='announcement'||campaign?.campaign_type==='reminder'

  const allFields = {}
  calls.forEach(c => {
    const cd = typeof c.collected_data==='string' ? JSON.parse(c.collected_data||'{}') : (c.collected_data||{})
    Object.entries(cd).forEach(([k,v]) => { if(!allFields[k]) allFields[k]=[]; if(v) allFields[k].push(String(v)) })
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Hero stats */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'20px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
        {[
          { emoji:'📞', label:'Total', value:total, c:'#374151' },
          { emoji:'✅', label:'Answered', value:completed, c:'#10B981' },
          { emoji:'📵', label:'No Answer', value:noAnswer, c:'#9CA3AF' },
          { emoji:'📳', label:'Busy', value:busy, c:'#F59E0B' },
          { emoji:'🔄', label:'Callback', value:rescheduled, c:'#3B82F6' },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center', padding:'14px 8px', borderRadius:12, background:s.c+'10' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{s.emoji}</div>
            <p style={{ fontSize:24, fontWeight:900, color:s.c, margin:0, letterSpacing:'-0.03em' }}>{s.value}</p>
            <p style={{ fontSize:10, color:s.c, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'3px 0 0' }}>{s.label}</p>
            <p style={{ fontSize:10, color:'#9CA3AF', margin:'2px 0 0' }}>{pct(s.value,total)}%</p>
          </div>
        ))}
      </div>

      {/* Acknowledgement (announcement campaigns) */}
      {isAnnouncement && acknowledged > 0 && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'20px' }}>
          <h3 style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', margin:'0 0 14px' }}>Message Confirmation</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <div style={{ padding:'16px', borderRadius:12, background:'#ECFDF5', textAlign:'center' }}>
              <p style={{ fontSize:28, fontWeight:900, color:'#10B981', margin:0 }}>{acknowledged}</p>
              <p style={{ fontSize:12, fontWeight:700, color:'#065F46', margin:'4px 0 2px' }}>✅ Confirmed</p>
              <p style={{ fontSize:11, color:'#6EE7B7', margin:0 }}>Understood the message</p>
            </div>
            <div style={{ padding:'16px', borderRadius:12, background:'#FFFBEB', textAlign:'center' }}>
              <p style={{ fontSize:28, fontWeight:900, color:'#F59E0B', margin:0 }}>{completed-acknowledged}</p>
              <p style={{ fontSize:12, fontWeight:700, color:'#92400E', margin:'4px 0 2px' }}>❓ Unclear</p>
              <p style={{ fontSize:11, color:'#FCD34D', margin:0 }}>May need follow-up</p>
            </div>
          </div>
          <ProgressBar value={pct(acknowledged,completed||1)} color="#10B981"/>
          <p style={{ fontSize:11, color:'#9CA3AF', margin:'6px 0 0' }}>{pct(acknowledged,total)}% confirmed · {pct(completed-acknowledged,total)}% unclear</p>
        </div>
      )}

      {/* Survey data */}
      {!isAnnouncement && Object.keys(allFields).length > 0 && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'20px' }}>
          <h3 style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', margin:'0 0 16px' }}>Collected Data</h3>
          {Object.entries(allFields).map(([field,values]) => {
            const counts = {}
            values.forEach(v => { counts[v]=(counts[v]||0)+1 })
            const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1])
            return (
              <div key={field} style={{ marginBottom:18 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8, textTransform:'capitalize' }}>{field.replace(/_/g,' ')}</p>
                {sorted.slice(0,5).map(([val,count]) => (
                  <div key={val} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ flex:1, height:6, background:'#F3F4F6', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:6, width:`${pct(count,values.length)}%`, background:GRAD, borderRadius:99 }}/>
                    </div>
                    <span style={{ fontSize:12, color:'#374151', minWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0f0f0f', minWidth:24, textAlign:'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Follow-up needed */}
      {needFollowUp.length > 0 && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #FDE68A', padding:'20px' }}>
          <h3 style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#92400E', margin:'0 0 4px' }}>⚠️ Needs Follow-up ({needFollowUp.length})</h3>
          <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 14px' }}>These contacts were confused or didn't confirm</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {needFollowUp.slice(0,10).map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'#FFFBEB', border:'1px solid #FDE68A' }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'#FEF9C3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#92400E', flexShrink:0 }}>
                  {getContactName(c)[0]?.toUpperCase()||'?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#374151', margin:0 }}>{getContactName(c)}</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', margin:0 }}>{c.phone}</p>
                </div>
                <span style={{ fontSize:11, color:'#F59E0B', fontWeight:600 }}>{c.confusion_count>=2?`${c.confusion_count} confusions`:'No confirmation'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CampaignDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [campaign,      setCampaign]      = useState(null)
  const [stats,         setStats]         = useState(null)
  const [calls,         setCalls]         = useState([])
  const [contacts,      setContacts]      = useState([])
  const [contactTotal,  setContactTotal]  = useState(0)
  const [expandedCall,  setExpandedCall]  = useState(null)
  const [activeTab,     setActiveTab]     = useState('calls')
  const [loading,       setLoading]       = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      const [campRes, callsRes] = await Promise.all([campaignApi.get(id), campaignApi.calls(id)])
      setCampaign(campRes.data.campaign)
      setStats(campRes.data.stats)
      setCalls(callsRes.data.logs||[])
    } catch { toast.error('Failed to load campaign') }
    finally { setLoading(false) }
  }, [id])

  const loadContacts = useCallback(async () => {
    try {
      const res = await campaignApi.getContacts(id)
      setContacts(res.data.contacts||[])
      setContactTotal(res.data.total||0)
    } catch { toast.error('Failed to load contacts') }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { if (activeTab==='contacts') loadContacts() }, [activeTab, loadContacts])
  useEffect(() => {
    if (campaign?.status!=='active') return
    const t = setInterval(loadAll, 8000)
    return () => clearInterval(t)
  }, [campaign?.status, loadAll])

  async function toggleCampaign() {
    setActionLoading(true)
    try {
      if (campaign.status==='active') {
        await campaignApi.pause(id); toast.success('Campaign paused')
      } else {
        const res = await campaignApi.launch(id)
        toast.success(res.data.scheduled_at ? `Scheduled for ${new Date(res.data.scheduled_at).toLocaleString('en-IN')} 📅` : 'Campaign launched 🚀')
      }
      await loadAll()
    } catch (err) { toast.error(err.response?.data?.error||'Action failed') }
    finally { setActionLoading(false) }
  }

  function exportCSV() {
    const rows = calls.map(c => [c.phone, getContactName(c.variables,''), c.outcome, c.duration_sec||0, new Date(c.started_at).toLocaleString('en-IN')])
    const csv  = [['Phone','Name','Outcome','Duration(s)','Time'], ...rows].map(r=>r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`${campaign?.name}-calls.csv`; a.click()
  }

  if (loading) return (
    <div style={{ padding:'28px', display:'flex', justifyContent:'center', alignItems:'center', height:300 }}>
      <div style={{ width:32, height:32, border:'3px solid #F3F4F6', borderTop:`3px solid ${BRAND}`, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!campaign) return (
    <div style={{ padding:'28px', textAlign:'center' }}>
      <p style={{ fontSize:15, color:'#9CA3AF', marginBottom:16 }}>Campaign not found</p>
      <Link to="/dashboard/campaigns" style={{ color:BRAND, fontWeight:700, textDecoration:'none' }}>← Back to campaigns</Link>
    </div>
  )

  const total = campaign.total_contacts||0
  const done  = parseInt(stats?.completed||0) + parseInt(stats?.busy||0) + parseInt(stats?.no_answer||0) + parseInt(stats?.failed||0) + parseInt(stats?.rescheduled||0)
  const progress = total>0 ? Math.round((Math.min(done,total)/total)*100) : 0
  const sm = STATUS_META[campaign.status]||STATUS_META.draft

  const TABS = [
    { key:'results',  label:'Results',             count:calls.length },
    { key:'calls',    label:'Call Logs',            count:calls.length },
    { key:'contacts', label:'Contacts',             count:total        },
    { key:'settings', label:'Settings',             count:null         },
  ]

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:1200, margin:'0 auto' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes ping{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* Back */}
      <Link to="/dashboard/campaigns" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#9CA3AF', textDecoration:'none', marginBottom:20, fontWeight:600 }}
        onMouseEnter={e=>e.currentTarget.style.color=BRAND} onMouseLeave={e=>e.currentTarget.style.color='#9CA3AF'}>
        <ArrowLeft size={14}/> All Campaigns
      </Link>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f0f0f', margin:0, letterSpacing:'-0.025em' }}>{campaign.name}</h1>
            <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:20, background:sm.c+'15', color:sm.c }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:sm.c, animation:sm.pulse?'ping 1.5s ease-in-out infinite':'none' }}/>
              {sm.label}
            </span>
          </div>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:0 }}>
            {LANG_NAMES[campaign.language_priority]||'Gujarati'} · {campaign.persona_name} · <span style={{ textTransform:'capitalize' }}>{campaign.campaign_type}</span>
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Btn onClick={loadAll} variant="outline" size="sm" icon={RefreshCw}>Refresh</Btn>
          <Btn onClick={() => navigate(`/dashboard/campaigns/${id}/edit`)} variant="outline" size="sm" icon={Edit2}>Edit</Btn>
          <Btn onClick={exportCSV} variant="outline" size="sm" icon={Download}>Export</Btn>
          {campaign.status!=='completed' && (
            <Btn
              onClick={toggleCampaign} loading={actionLoading}
              variant={campaign.status==='active'?'outline':'green'}
              icon={campaign.status==='active'?Pause:Rocket}
              size="sm">
              {campaign.status==='active' ? 'Pause' : campaign.status==='draft' ? 'Launch' : 'Resume'}
            </Btn>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        {[
          { label:'Total',     value:total,                  c:'#374151' },
          { label:'Completed', value:stats?.completed||0,    c:'#10B981' },
          { label:'Pending',   value:stats?.pending||0,      c:BRAND     },
          { label:'Busy',      value:stats?.busy||0,         c:'#F59E0B' },
          { label:'No Answer', value:stats?.no_answer||0,    c:'#9CA3AF' },
          { label:'Failed',    value:stats?.failed||0,       c:'#EF4444' },
        ].map(s => <StatPill key={s.label} {...s}/>)}
      </div>

      {/* Progress */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'18px 22px', marginBottom:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#374151', margin:0 }}>Overall Progress</p>
          <span style={{ fontSize:20, fontWeight:900, color:'#0f0f0f', letterSpacing:'-0.03em' }}>{progress}%</span>
        </div>
        <ProgressBar value={progress} color="#10B981"/>
        {campaign.status==='active' && (
          <p style={{ fontSize:12, color:'#10B981', margin:'8px 0 0', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#10B981', display:'inline-block', animation:'ping 1.5s ease-in-out infinite' }}/>
            Calls running live — refreshing every 8 seconds
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #E5E7EB', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{
            padding:'12px 18px', fontSize:13, fontWeight:activeTab===t.key?700:500,
            color:activeTab===t.key?BRAND:'#6B7280',
            borderTop:'none', borderLeft:'none', borderRight:'none',
            borderBottom:activeTab===t.key?`2px solid ${BRAND}`:'2px solid transparent',
            background:'none', cursor:'pointer', transition:'all .15s',
            display:'flex', alignItems:'center', gap:7, fontFamily:'inherit',
          }}>
            {t.label}
            {t.count!==null && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:activeTab===t.key?BRAND+'15':'#F3F4F6', color:activeTab===t.key?BRAND:'#9CA3AF' }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Results tab */}
      {activeTab==='results' && <ResultsSummary calls={calls} campaign={campaign} stats={stats}/>}

      {/* Calls tab */}
      {activeTab==='calls' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden' }}>
          {calls.length===0 ? (
            <div style={{ padding:'52px 24px', textAlign:'center' }}>
              <div style={{ width:56, height:56, borderRadius:16, background:'#F9FAFB', border:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}><Phone size={24} color="#D1D5DB"/></div>
              <p style={{ fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>No calls yet</p>
              <p style={{ fontSize:13, color:'#9CA3AF', margin:0 }}>{campaign.status==='draft'||campaign.status==='paused'?'Launch the campaign to start making calls':'Calls will appear here as they complete'}</p>
            </div>
          ) : calls.map(call => {
            const oc = OUTCOME_META[call.outcome]||OUTCOME_META.completed
            const isExp = expandedCall===call.id
            const transcript = Array.isArray(call.transcript)?call.transcript:(()=>{try{return JSON.parse(call.transcript||'[]')}catch{return[]}})()
            const cd = (()=>{if(!call.collected_data)return{};if(typeof call.collected_data==='object')return call.collected_data;try{return JSON.parse(call.collected_data)}catch{return{}}})()
            const cName = getContactName(call.variables, null)
            return (
              <div key={call.id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                <button onClick={()=>setExpandedCall(isExp?null:call.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left', transition:'background .15s', fontFamily:'inherit' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F9FAFB'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{ width:38, height:38, borderRadius:11, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#6B7280', flexShrink:0 }}>
                    {(cName||call.phone||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#0f0f0f', margin:0 }}>{cName||call.phone||'Unknown'}</p>
                    <p style={{ fontSize:11, color:'#9CA3AF', margin:'2px 0 0' }}>{call.phone} · {call.duration_sec||0}s</p>
                  </div>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:oc.bg, color:oc.c, flexShrink:0 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:oc.c }}/>{oc.label}
                  </span>
                  <span style={{ fontSize:11, color:'#D1D5DB', display:'none' }} className="sm-show">{new Date(call.started_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                  {isExp ? <ChevronUp size={15} color="#9CA3AF"/> : <ChevronDown size={15} color="#9CA3AF"/>}
                </button>
                {isExp && (
                  <div style={{ margin:'0 20px 16px', padding:'18px', background:'#F9FAFB', borderRadius:12, border:'1px solid #F3F4F6' }}>
                    {transcript.length > 0 ? (
                      <div style={{ marginBottom:16 }}>
                        <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
                          <MessageSquare size={11}/> Transcript
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {transcript.map((t,i) => (
                            <div key={i} style={{ display:'flex', justifyContent:t.role==='assistant'?'flex-start':'flex-end' }}>
                              <div style={{ maxWidth:'80%', padding:'9px 13px', borderRadius:t.role==='assistant'?'4px 12px 12px 12px':'12px 4px 12px 12px', fontSize:13, lineHeight:1.5, background:t.role==='assistant'?'#fff':'#0f0f0f', color:t.role==='assistant'?'#374151':'#fff', border:t.role==='assistant'?'1px solid #E5E7EB':'none' }}>
                                <p style={{ fontSize:9, fontWeight:700, color:t.role==='assistant'?'#9CA3AF':'rgba(255,255,255,.5)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                  {t.role==='assistant'?'🤖 AI Agent':'👤 Contact'}
                                </p>
                                {t.content||t.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:7, color:'#D1D5DB', marginBottom:Object.keys(cd).length?16:0 }}>
                        <Mic size={13}/><span style={{ fontSize:12 }}>No transcript available</span>
                      </div>
                    )}
                    {Object.keys(cd).length > 0 && (
                      <div style={{ paddingTop:12, borderTop:'1px solid #E5E7EB' }}>
                        <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', margin:'0 0 10px' }}>Collected Data</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {Object.entries(cd).map(([k,v]) => (
                            <div key={k} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20, background:'#fff', border:'1px solid #E5E7EB', fontSize:12 }}>
                              <span style={{ color:'#9CA3AF', fontWeight:600 }}>{k}:</span>
                              <span style={{ color:'#0f0f0f', fontWeight:700 }}>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Contacts tab */}
      {activeTab==='contacts' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 22px', borderBottom:'1px solid #F3F4F6' }}>
            <div>
              <h3 style={{ fontSize:14, fontWeight:700, color:'#0f0f0f', margin:0 }}>Contact List</h3>
              <p style={{ fontSize:11, color:'#9CA3AF', margin:'3px 0 0' }}>{contactTotal.toLocaleString('en-IN')} total contacts</p>
            </div>
          </div>
          {contacts.length===0 ? (
            <div style={{ padding:'52px 24px', textAlign:'center' }}>
              <Users size={28} color="#D1D5DB" style={{ display:'block', margin:'0 auto 14px' }}/>
              <p style={{ fontSize:14, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>No contacts yet</p>
              <p style={{ fontSize:13, color:'#9CA3AF', margin:0 }}>Upload a CSV file to add contacts</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #F3F4F6' }}>
                    {['#','Phone','Name','Status','Calls','Last Outcome'].map(h => (
                      <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c,i) => {
                    const oc = OUTCOME_META[c.status]||OUTCOME_META.pending
                    return (
                      <tr key={c.id} style={{ borderBottom:'1px solid #F9FAFB', transition:'background .15s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#F9FAFB'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={{ padding:'12px 18px', color:'#D1D5DB', fontSize:11 }}>{i+1}</td>
                        <td style={{ padding:'12px 18px', fontWeight:600, color:'#0f0f0f' }}>{c.phone}</td>
                        <td style={{ padding:'12px 18px', color:'#6B7280' }}>{getContactName(c.variables,'—')}</td>
                        <td style={{ padding:'12px 18px' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:oc.bg, color:oc.c }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background:oc.c }}/>{oc.label}
                          </span>
                        </td>
                        <td style={{ padding:'12px 18px', color:'#6B7280' }}>{c.call_count||0}</td>
                        <td style={{ padding:'12px 18px', color:'#9CA3AF' }}>{c.last_outcome||'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {activeTab==='settings' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', padding:'20px 22px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f0f0f', margin:0 }}>Campaign Settings</h3>
            <Btn onClick={() => navigate(`/dashboard/campaigns/${id}/edit`)} variant="outline" size="sm" icon={Edit2}>Edit</Btn>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
            {[
              ['Campaign Name',   campaign.name],
              ['Language',        LANG_NAMES[campaign.language_priority]||'Gujarati'],
              ['Agent Name',      campaign.persona_name||'—'],
              ['Agent Tone',      campaign.persona_tone||'—'],
              ['Campaign Type',   campaign.campaign_type],
              ['Concurrent Calls',campaign.max_concurrent_calls||5],
              ['Max Retries',     campaign.max_retries||2],
              ['Calling Hours',   `${campaign.calling_hours_start||'09:00'} – ${campaign.calling_hours_end||'21:00'}`],
              ['Total Contacts',  campaign.total_contacts||0],
              ['Created',         new Date(campaign.created_at).toLocaleDateString('en-IN')],
            ].map(([l,v]) => (
              <div key={l} style={{ padding:'14px 16px', background:'#F9FAFB', borderRadius:12, border:'1px solid #F3F4F6' }}>
                <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', margin:'0 0 5px' }}>{l}</p>
                <p style={{ fontSize:14, fontWeight:600, color:'#0f0f0f', margin:0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
