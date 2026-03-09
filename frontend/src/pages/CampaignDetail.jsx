import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { campaignApi } from '../hooks/api'
import toast from 'react-hot-toast'
import {
  Play, Pause, Phone, ArrowLeft, Users, Download,
  MessageSquare, Mic, Edit2, X, Check, ChevronDown,
  ChevronUp, Settings, RefreshCw, Rocket
} from 'lucide-react'

const outcomeConfig = {
  completed:   { label: 'Completed',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', dot: 'bg-green-500'  },
  rescheduled: { label: 'Rescheduled', color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200',  dot: 'bg-gray-400'   },
  busy:        { label: 'Busy',        color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200',dot: 'bg-yellow-500' },
  no_answer:   { label: 'No Answer',   color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',  dot: 'bg-gray-300'   },
  transferred: { label: 'Transferred', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200',dot: 'bg-purple-400' },
  failed:      { label: 'Failed',      color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-200',   dot: 'bg-red-400'    },
  in_progress: { label: 'Calling',     color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  dot: 'bg-blue-400'   },
  dnc:         { label: 'DNC',         color: 'text-gray-400',   bg: 'bg-gray-50',   border: 'border-gray-200',  dot: 'bg-gray-300'   },
  pending:     { label: 'Pending',     color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',  dot: 'bg-gray-300'   },
  calling:     { label: 'Calling',     color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',  dot: 'bg-blue-400'   },
}

const statusMeta = {
  active:    { label: 'Live',      dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  pulse: true  },
  completed: { label: 'Completed', dot: 'bg-gray-400',   text: 'text-gray-600',   bg: 'bg-gray-100',  pulse: false },
  paused:    { label: 'Paused',    dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', pulse: false },
  draft:     { label: 'Draft',     dot: 'bg-gray-300',   text: 'text-gray-500',   bg: 'bg-gray-50',   pulse: false },
}

const langNames = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }

function StatCard({ label, value, color }) {
  const colors = {
    green:  'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray:   'bg-gray-50 text-gray-600 border-gray-200',
    blue:   'bg-blue-50 text-blue-600 border-blue-200',
    red:    'bg-red-50 text-red-500 border-red-200',
  }
  return (
    <div className={`flex flex-col items-center px-3 py-3 rounded-xl border ${colors[color] || colors.gray}`}>
      <span className="font-bold text-xl">{value}</span>
      <span className="text-xs font-medium mt-0.5">{label}</span>
    </div>
  )
}

// Helper: extract name from contact variables (handles string JSON or object)
function getContactName(variables, fallback = 'Unknown') {
  try {
    const v = typeof variables === 'string' ? JSON.parse(variables) : (variables || {})
    return v.name || v.Name || v.contact_name || v['Contact Name'] || v.NAME || fallback
  } catch {
    return fallback
  }
}


// ── Plain-language Results Summary — designed for non-tech clients ──────────
function ResultsSummary({ calls, campaign, stats }) {
  if (!calls || calls.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="text-5xl mb-4">📊</div>
        <p className="font-semibold text-gray-500">No results yet</p>
        <p className="text-sm mt-1">Results will appear here as calls complete</p>
      </div>
    )
  }

  const isAnnouncement = campaign?.campaign_type === 'announcement' || campaign?.campaign_type === 'reminder'
  const total      = calls.length
  const completed  = calls.filter(c => c.outcome === 'completed').length
  const rescheduled= calls.filter(c => c.outcome === 'rescheduled').length
  const noAnswer   = calls.filter(c => c.outcome === 'no_answer' || c.outcome === 'failed').length
  const dnc        = calls.filter(c => c.outcome === 'dnc').length
  const acknowledged = calls.filter(c => c.acknowledged === true).length
  const notAcked   = calls.filter(c => c.acknowledged === false).length
  const pct = n => total ? Math.round((n / total) * 100) : 0

  // Parse collected_data per call
  const getCD = c => {
    if (!c.collected_data) return {}
    if (typeof c.collected_data === 'object') return c.collected_data
    try { return JSON.parse(c.collected_data) } catch { return {} }
  }

  // For survey campaigns — aggregate collected fields
  const allFields = {}
  calls.forEach(c => {
    const cd = getCD(c)
    Object.entries(cd).forEach(([k, v]) => {
      if (!allFields[k]) allFields[k] = []
      if (v) allFields[k].push(String(v))
    })
  })

  // Need manual follow-up = confusion ≥ 2 OR not acknowledged
  const needFollowUp = calls.filter(c =>
    (c.confusion_count >= 2) || (c.acknowledged === false && c.outcome === 'completed')
  )

  const getContactName = (call) => {
    try {
      const v = typeof call.variables === 'string' ? JSON.parse(call.variables) : (call.variables || {})
      return v.name || v.Name || v.driver_name || v['Driver Name'] || call.phone
    } catch { return call.phone }
  }

  return (
    <div className="divide-y divide-gray-100">

      {/* ── Hero numbers — big, plain language ─── */}
      <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <BigStat
          emoji="📞" value={total}
          label="Total Calls Made" color="bg-gray-50 border-gray-200" />
        <BigStat
          emoji="✅" value={completed}
          label="Calls Answered" sub={`${pct(completed)}% of total`}
          color="bg-green-50 border-green-200" textColor="text-green-700" />
        <BigStat
          emoji="🔄" value={rescheduled}
          label="Called Back Later" sub="Requested callback"
          color="bg-blue-50 border-blue-200" textColor="text-blue-600" />
        <BigStat
          emoji="📵" value={noAnswer}
          label="No Answer" sub={`${pct(noAnswer)}% of total`}
          color="bg-gray-50 border-gray-200" />
      </div>

      {/* ── Announcement-specific: acknowledged ── */}
      {isAnnouncement && (acknowledged > 0 || notAcked > 0) && (
        <div className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Message Confirmation
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-center">
              <p className="text-3xl font-bold text-green-700">{acknowledged}</p>
              <p className="text-sm font-semibold text-green-600 mt-1">✅ Confirmed</p>
              <p className="text-xs text-green-500 mt-0.5">Understood the message</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-center">
              <p className="text-3xl font-bold text-orange-700">{notAcked}</p>
              <p className="text-sm font-semibold text-orange-600 mt-1">❓ Unclear</p>
              <p className="text-xs text-orange-500 mt-0.5">May need follow-up</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${pct(acknowledged)}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {pct(acknowledged)}% confirmed · {pct(notAcked)}% unclear
          </p>
        </div>
      )}

      {/* ── Survey: collected data summary ── */}
      {!isAnnouncement && Object.keys(allFields).length > 0 && (
        <div className="p-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            What We Learned
          </h3>
          <div className="space-y-4">
            {Object.entries(allFields).map(([field, values]) => {
              const counts = {}
              values.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
              const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1])
              const fieldLabel = field.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())
              return (
                <div key={field}>
                  <p className="text-xs font-semibold text-gray-600 mb-2">{fieldLabel}</p>
                  <div className="space-y-1.5">
                    {sorted.slice(0, 5).map(([val, count]) => (
                      <div key={val} className="flex items-center gap-3">
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1a1a1a] rounded-full transition-all"
                            style={{ width: `${Math.round((count/values.length)*100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-28 truncate">{val}</span>
                        <span className="text-xs font-bold text-gray-800 w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Needs follow-up ── */}
      {needFollowUp.length > 0 && (
        <div className="p-6">
          <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
            ⚠️ Needs Manual Follow-up ({needFollowUp.length})
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            These contacts were confused or didn't confirm — call them manually
          </p>
          <div className="space-y-2">
            {needFollowUp.slice(0, 10).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center text-sm font-bold text-orange-600">
                  {getContactName(c)[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{getContactName(c)}</p>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </div>
                <span className="text-xs text-orange-600 font-medium flex-shrink-0">
                  {c.confusion_count >= 2 ? `${c.confusion_count} confusions` : 'Did not confirm'}
                </span>
              </div>
            ))}
            {needFollowUp.length > 10 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                +{needFollowUp.length - 10} more contacts need follow-up
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── DNC ── */}
      {dnc > 0 && (
        <div className="p-6">
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <span className="text-lg">🚫</span>
            <p className="text-sm text-gray-600">
              <span className="font-bold">{dnc} contacts</span> asked not to be called again — removed from future campaigns
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

function BigStat({ emoji, value, label, sub, color = 'bg-gray-50 border-gray-200', textColor = 'text-gray-800' }) {
  return (
    <div className={`p-4 rounded-2xl border ${color} text-center`}>
      <div className="text-2xl mb-1">{emoji}</div>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs font-semibold text-gray-600 mt-1 leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
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
  const [showEdit,      setShowEdit]      = useState(false)
  const [editForm,      setEditForm]      = useState({})

  const loadAll = useCallback(async () => {
    try {
      const [campRes, callsRes] = await Promise.all([
        campaignApi.get(id),
        campaignApi.calls(id),
      ])
      setCampaign(campRes.data.campaign)
      setStats(campRes.data.stats)
      setCalls(callsRes.data.logs || [])
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadContacts = useCallback(async () => {
    try {
      const res = await campaignApi.getContacts(id)
      setContacts(res.data.contacts || [])
      setContactTotal(res.data.total || 0)
    } catch {
      toast.error('Failed to load contacts')
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { if (activeTab === 'contacts') loadContacts() }, [activeTab, loadContacts])
  useEffect(() => {
    if (campaign?.status !== 'active') return
    const t = setInterval(loadAll, 8000)
    return () => clearInterval(t)
  }, [campaign?.status, loadAll])

  async function toggleCampaign() {
    setActionLoading(true)
    try {
      if (campaign.status === 'active') {
        await campaignApi.pause(id); toast.success('Campaign paused')
      } else {
        await campaignApi.launch(id); toast.success('Campaign launched! 🚀')
      }
      await loadAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    } finally { setActionLoading(false) }
  }

  function openEdit() {
    setEditForm({
      name: campaign.name,
      persona_name: campaign.persona_name || '',
      persona_tone: campaign.persona_tone || '',
      max_concurrent_calls: campaign.max_concurrent_calls || 5,
      max_retries: campaign.max_retries || 2,
      calling_hours_start: campaign.calling_hours_start || '09:00',
      calling_hours_end: campaign.calling_hours_end || '21:00',
    })
    setShowEdit(true)
  }

  async function saveEdit() {
    setActionLoading(true)
    try {
      await campaignApi.update(id, editForm)
      toast.success('Campaign updated!')
      setShowEdit(false)
      await loadAll()
    } catch { toast.error('Update failed') }
    finally { setActionLoading(false) }
  }

  function exportCSV() {
    const header = ['Phone','Name','Outcome','Duration(s)','Time']
    const rows = calls.map(c => [c.phone, getContactName(c.variables, ''), c.outcome, c.duration_sec, new Date(c.started_at).toLocaleString('en-IN')])
    const csv = [header,...rows].map(r=>r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = `${campaign?.name}-calls.csv`
    a.click()
  }

  if (loading) return <div className="p-10 flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>
  if (!campaign) return <div className="p-10 text-center"><p className="text-gray-500">Campaign not found</p><Link to="/dashboard/campaigns" className="font-semibold mt-2 block">← Back</Link></div>

  const total = campaign.total_contacts || 0
  const done  = parseInt(stats?.completed || 0)
  const pct   = total > 0 ? Math.round((done/total)*100) : 0
  const meta  = statusMeta[campaign.status] || statusMeta.draft

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">

      <Link to="/dashboard/campaigns" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium mb-6">
        <ArrowLeft size={14} /> All Campaigns
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-bold text-2xl lg:text-3xl text-gray-900">{campaign.name}</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${meta.bg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'animate-pulse' : ''}`} />
              <span className={`text-xs font-bold ${meta.text}`}>{meta.label}</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">{langNames[campaign.language_priority]||'Gujarati'} · {campaign.persona_name} · {campaign.campaign_type}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:border-gray-400 transition-all"><RefreshCw size={14}/></button>
          <button onClick={() => navigate(`/dashboard/campaigns/${id}/edit`)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 transition-all"><Edit2 size={14}/> Edit</button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-400 transition-all"><Download size={14}/> Export</button>
          {campaign.status !== 'completed' && (
            <button onClick={toggleCampaign} disabled={actionLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50
                ${campaign.status==='active' ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100' : 'bg-[#228248] text-white hover:bg-green-700'}`}>
              {actionLoading ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"/> :
                campaign.status==='active' ? <><Pause size={15}/> Pause</> : <><Rocket size={15}/> {campaign.status==='draft'?'Launch':'Resume'}</>}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total"     value={total}                 color="blue"  />
        <StatCard label="Completed" value={stats?.completed||0}   color="green" />
        <StatCard label="Pending"   value={stats?.pending||0}     color="orange"/>
        <StatCard label="Busy"      value={stats?.busy||0}        color="orange"/>
        <StatCard label="No Answer" value={stats?.no_answer||0}   color="gray"  />
        <StatCard label="Failed"    value={stats?.failed||0}      color="red"   />
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-700 text-sm">Overall Progress</p>
          <span className="font-bold text-lg">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#228248] to-green-400 rounded-full transition-all duration-700" style={{width:`${pct}%`}}/>
        </div>
        {campaign.status==='active' && <p className="text-sm text-green-700 mt-2 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"/>Calls running live</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          {id:'results',  label:'Results Summary'},
          {id:'calls',    label:`Call Logs (${calls.length})`},
          {id:'contacts', label:`Contacts (${total})`},
          {id:'settings', label:'Settings'},
        ].map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab===tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Call Logs Tab */}
      {activeTab==='results' && (
        <ResultsSummary calls={calls} campaign={campaign} stats={stats} />
      )}

      {activeTab==='calls' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {calls.length===0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4"><Phone size={28} className="text-gray-300"/></div>
              <p className="font-bold text-gray-500 mb-1">No calls yet</p>
              <p className="text-gray-400 text-sm">{campaign.status==='draft'||campaign.status==='paused' ? 'Launch the campaign to start making calls' : 'Calls will appear here as they complete'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.map(call => {
                const oc = outcomeConfig[call.outcome]||outcomeConfig.completed
                const isExpanded = expandedCall===call.id
                const transcript = Array.isArray(call.transcript) ? call.transcript : (()=>{try{return JSON.parse(call.transcript||'[]')}catch{return []}})()
                const cd = (()=>{if(!call.collected_data)return{};if(typeof call.collected_data==='object')return call.collected_data;try{return JSON.parse(call.collected_data)}catch{return{}}})()
                const contactName = getContactName(call.variables, null)
                return (
                  <div key={call.id}>
                    <button onClick={()=>setExpandedCall(isExpanded?null:call.id)} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
                        {(contactName || call.phone || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{contactName || call.phone || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{call.phone} · {call.duration_sec||0}s</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${oc.bg} ${oc.border}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${oc.dot}`}/>
                        <span className={`text-xs font-semibold ${oc.color}`}>{oc.label}</span>
                      </div>
                      <span className="text-xs text-gray-400 hidden sm:block">{new Date(call.started_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                    </button>
                    {isExpanded && (
                      <div className="mx-6 mb-4 bg-gray-50 rounded-xl p-5 border border-gray-200">
                        {transcript.length>0 ? (
                          <div className="space-y-3 mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2"><MessageSquare size={12}/> Transcript</p>
                            {transcript.map((t,ti)=>(
                              <div key={ti} className={`flex ${t.role==='assistant'?'justify-start':'justify-end'}`}>
                                <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${t.role==='assistant'?'bg-white border border-gray-200 text-gray-800':'bg-gray-800 text-white'}`}>
                                  <p className={`text-[10px] font-bold mb-1 ${t.role==='assistant'?'text-gray-400':'text-gray-400'}`}>
                                    {t.role==='assistant' ? '🤖 AI Agent' : ('👤 ' + (contactName || 'Contact'))}
                                  </p>
                                  {t.content||t.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-4 text-gray-400"><Mic size={14}/><p className="text-xs italic">No transcript available</p></div>
                        )}
                        {Object.keys(cd).length>0 && (
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Collected Data</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(cd).map(([k,v])=>(
                                <div key={k} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                                  <span className="text-xs font-semibold text-gray-500">{k}:</span>
                                  <span className="text-xs text-gray-800">{String(v)}</span>
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
        </div>
      )}

      {/* Contacts Tab */}
      {activeTab==='contacts' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-900">Contact List</h2>
              <p className="text-xs text-gray-500 mt-0.5">{contactTotal} total contacts</p>
            </div>
          </div>
          {contacts.length===0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4"><Users size={28} className="text-gray-300"/></div>
              <p className="font-bold text-gray-500 mb-1">No contacts yet</p>
              <p className="text-gray-400 text-sm">Upload a CSV or Excel file to add contacts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#','Phone','Name','Status','Calls Made','Last Outcome'].map(h=>(
                      <th key={h} className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.map((contact,i)=>{
                    const oc = outcomeConfig[contact.status]||outcomeConfig.pending
                    return (
                      <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-gray-400 text-xs">{i+1}</td>
                        <td className="px-6 py-3 font-medium text-gray-800">{contact.phone}</td>
                        <td className="px-6 py-3 text-gray-600">{getContactName(contact.variables, '—')}</td>
                        <td className="px-6 py-3">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${oc.bg} ${oc.border}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${oc.dot}`}/>
                            <span className={`text-xs font-medium ${oc.color}`}>{oc.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{contact.call_count||0}</td>
                        <td className="px-6 py-3 text-gray-600">{contact.last_outcome||'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab==='settings' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900">Campaign Settings</h2>
            <button onClick={() => navigate(`/dashboard/campaigns/${id}/edit`)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-all">
              <Edit2 size={14}/> Edit Settings
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {label:'Campaign Name',  value:campaign.name},
              {label:'Language',       value:langNames[campaign.language_priority]||'Gujarati'},
              {label:'Agent Name',     value:campaign.persona_name},
              {label:'Agent Tone',     value:campaign.persona_tone},
              {label:'Campaign Type',  value:campaign.campaign_type},
              {label:'Concurrent Calls',value:campaign.max_concurrent_calls||5},
              {label:'Max Retries',    value:campaign.max_retries||2},
              {label:'Calling Hours',  value:`${campaign.calling_hours_start||'09:00'} – ${campaign.calling_hours_end||'21:00'}`},
              {label:'Total Contacts', value:campaign.total_contacts||0},
              {label:'Created',        value:new Date(campaign.created_at).toLocaleDateString('en-IN')},
            ].map(({label,value})=>(
              <div key={label} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-xl">Edit Campaign</h3>
              <button onClick={()=>setShowEdit(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              {[
                {label:'Campaign Name', key:'name', type:'text'},
                {label:'Agent Name',    key:'persona_name', type:'text'},
              ].map(({label,key,type})=>(
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <input type={type} value={editForm[key]||''} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 focus:outline-none"/>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {label:'Concurrent Calls',key:'max_concurrent_calls',min:1,max:30},
                  {label:'Max Retries',     key:'max_retries',         min:0,max:5},
                ].map(({label,key,min,max})=>(
                  <div key={key}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                    <input type="number" min={min} max={max} value={editForm[key]||0}
                      onChange={e=>setEditForm(f=>({...f,[key]:parseInt(e.target.value)}))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 focus:outline-none"/>
                  </div>
                ))}
                {[
                  {label:'Start Time',key:'calling_hours_start'},
                  {label:'End Time',  key:'calling_hours_end'},
                ].map(({label,key})=>(
                  <div key={key}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                    <input type="time" value={editForm[key]||'09:00'}
                      onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-gray-400 focus:outline-none"/>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={()=>setShowEdit(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-400 transition-all">Cancel</button>
              <button onClick={saveEdit} disabled={actionLoading}
                className="flex-1 py-3 bg-[#228248] text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={15}/> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
