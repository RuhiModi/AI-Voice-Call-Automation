import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { campaignApi } from '../hooks/useApi'
import { mockCampaigns, mockStats, mockCallLogs } from '../hooks/mockData'
import toast from 'react-hot-toast'
import {
  Play, Pause, Phone, Clock, CheckCircle, XCircle, RotateCcw,
  ArrowLeft, Users, TrendingUp, AlertCircle, ChevronDown, ChevronUp,
  Download, MessageSquare, Mic
} from 'lucide-react'

const DEMO = localStorage.getItem('demo_mode')

const outcomeConfig = {
  completed: { label: 'Completed', color: 'text-jade-600', bg: 'bg-jade-50', border: 'border-jade-200', dot: 'bg-jade-400' },
  rescheduled: { label: 'Rescheduled', color: 'text-navy-600', bg: 'bg-navy-50', border: 'border-navy-200', dot: 'bg-navy-400' },
  busy: { label: 'Busy', color: 'text-orange-600', bg: 'bg-orange-500', border: 'border-orange-500', dot: 'bg-orange-400' },
  no_answer: { label: 'No Answer', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-300' },
  transferred: { label: 'Transferred', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-400' },
  failed: { label: 'Failed', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-400' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' },
  dnc: { label: 'DNC', color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-300' },
}

const langLabel = { gu: 'gu', hi: 'hi', en: 'en' }
const langNames = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }

function StatPill({ label, value, color }) {
  const colors = {
    green: 'bg-jade-50 text-jade-700 border-jade-200',
    orange: 'bg-orange-500 text-orange-500 border-orange-500',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
  }
  return (
    <div className={`flex flex-col items-center px-4 py-3 rounded-2xl border ${colors[color]}`}>
      <span className="font-display font-bold text-xl">{value}</span>
      <span className="text-[11px] font-medium mt-0.5">{label}</span>
    </div>
  )
}

export default function CampaignDetail() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [stats, setStats] = useState(null)
  const [calls, setCalls] = useState([])
  const [expandedCall, setExpandedCall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadStats, 8000)
    return () => clearInterval(interval)
  }, [id])

  async function loadAll() {
    if (DEMO) {
      const found = mockCampaigns.find(c => c.id === id) || mockCampaigns[0]
      setCampaign(found)
      setStats(mockStats)
      setCalls(mockCallLogs)
      setLoading(false)
      return
    }
    try {
      const [campRes, callsRes] = await Promise.all([
        campaignApi.get(id),
        campaignApi.calls(id)
      ])
      setCampaign(campRes.data.campaign)
      setStats(campRes.data.stats)
      setCalls(callsRes.data.logs || [])
    } catch (err) {
      toast.error('Failed to load campaign')
      // Fallback to mock
      const found = mockCampaigns.find(c => c.id === id) || mockCampaigns[0]
      setCampaign(found)
      setStats(mockStats)
      setCalls(mockCallLogs)
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    if (DEMO) return
    try {
      const res = await campaignApi.get(id)
      setStats(res.data.stats)
      setCampaign(res.data.campaign)
    } catch {}
  }

  async function toggleCampaign() {
    setActionLoading(true)
    try {
      if (DEMO) {
        await new Promise(r => setTimeout(r, 600))
        setCampaign(c => ({ ...c, status: c.status === 'active' ? 'paused' : 'active' }))
        toast.success(campaign.status === 'active' ? 'Campaign paused' : 'Campaign resumed!')
        return
      }
      if (campaign.status === 'active') {
        await campaignApi.pause(id)
        toast.success('Campaign paused')
      } else {
        await campaignApi.launch(id)
        toast.success('Campaign resumed!')
      }
      await loadAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  function exportCSV() {
    const header = ['Phone', 'Name', 'Outcome', 'Language', 'Duration (s)', 'Collected Data', 'Time']
    const rows = calls.map(c => [
      c.phone,
      c.variables?.name || '',
      c.outcome,
      langNames[c.language_detected] || c.language_detected,
      c.duration_sec,
      JSON.stringify(c.collected_data || {}),
      new Date(c.started_at).toLocaleString('en-IN'),
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaign?.name || 'campaign'}-calls.csv`
    a.click()
    toast.success('CSV downloaded!')
  }

  if (loading) return (
    <div className="p-10 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
    </div>
  )

  if (!campaign) return (
    <div className="p-10 text-center">
      <p className="text-navy-500">Campaign not found</p>
      <Link to="/dashboard/campaigns" className="text-navy-700 font-semibold hover:underline mt-2 block">← Back to Campaigns</Link>
    </div>
  )

  const total = campaign.total_contacts || 0
  const done = parseInt(stats?.completed || 0)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const statusMeta = {
    active: { label: 'Live', dot: 'bg-jade-400', text: 'text-jade-700', bg: 'bg-jade-50', pulse: true },
    completed: { label: 'Completed', dot: 'bg-navy-400', text: 'text-navy-600', bg: 'bg-navy-50', pulse: false },
    paused: { label: 'Paused', dot: 'bg-orange-400', text: 'text-orange-500', bg: 'bg-orange-500', pulse: false },
    draft: { label: 'Draft', dot: 'bg-gray-300', text: 'text-gray-500', bg: 'bg-gray-50', pulse: false },
  }
  const meta = statusMeta[campaign.status] || statusMeta.draft

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto animate-fade-in">

      {/* Back */}
      <Link to="/dashboard/campaigns" className="inline-flex items-center gap-1.5 text-navy-400 hover:text-navy-700 text-sm font-medium mb-6 transition-colors group">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        All Campaigns
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display font-bold text-2xl lg:text-3xl text-navy-900">{campaign.name}</h1>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${meta.bg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.pulse ? 'status-active' : ''}`} />
              <span className={`text-xs font-bold ${meta.text}`}>{meta.label}</span>
            </div>
          </div>
          {campaign.description && (
            <p className="text-navy-400 text-sm">{campaign.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-navy-200 rounded-2xl text-sm font-medium text-navy-600 hover:border-navy-400 hover:text-navy-800 transition-all">
            <Download size={14} /> Export
          </button>
          {campaign.status !== 'completed' && (
            <button onClick={toggleCampaign} disabled={actionLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50
                ${campaign.status === 'active'
                  ? 'bg-orange-500 text-orange-500 hover:bg-orange-500'
                  : 'bg-jade-600 text-white hover:bg-jade-500 shadow-sm'}`}>
              {campaign.status === 'active' ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Resume</>}
            </button>
          )}
        </div>
      </div>

      {/* Progress card */}
      <div className="bg-white rounded-3xl border border-navy-100 p-7 mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display font-bold text-navy-800">Overall Progress</p>
          <span className="font-display font-bold text-2xl text-navy-900">{pct}%</span>
        </div>
        <div className="h-3 bg-navy-50 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-gradient-to-r from-navy-600 to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>

        {/* Active call indicator */}
        {campaign.status === 'active' && (
          <div className="flex items-center gap-3 mb-6 p-3 bg-jade-50 rounded-2xl border border-jade-200">
            <div className="flex items-center gap-1 text-jade-500">
              <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
              <span className="wave-bar" /><span className="wave-bar" />
            </div>
            <span className="text-sm font-semibold text-jade-700">Calls are running live right now</span>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatPill label="Total" value={total} color="blue" />
          <StatPill label="Completed" value={stats?.completed || 0} color="green" />
          <StatPill label="Pending" value={stats?.pending || 0} color="orange" />
          <StatPill label="Scheduled" value={stats?.scheduled || 0} color="blue" />
          <StatPill label="Busy" value={stats?.busy || 0} color="orange" />
          <StatPill label="No Answer" value={stats?.no_answer || 0} color="gray" />
        </div>
      </div>

      {/* Call logs */}
      <div className="bg-white rounded-3xl border border-navy-100 overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-7 py-5 border-b border-navy-50">
          <div>
            <h2 className="font-display font-bold text-navy-900">Call Logs</h2>
            <p className="text-xs text-navy-400 mt-0.5">{calls.length} calls recorded</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-navy-400">
            <div className="w-2 h-2 bg-jade-400 rounded-full status-active" />
            Live updates
          </div>
        </div>

        {calls.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Phone size={28} className="text-navy-300" />
            </div>
            <p className="font-display font-bold text-navy-600 mb-1">No calls yet</p>
            <p className="text-navy-400 text-sm">Launch the campaign to start calling</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-50">
            {calls.map((call, i) => {
              const oConfig = outcomeConfig[call.outcome] || outcomeConfig.completed
              const isExpanded = expandedCall === call.id
              const transcript = Array.isArray(call.transcript)
                ? call.transcript
                : (typeof call.transcript === 'string' ? JSON.parse(call.transcript || '[]') : [])
              const collectedData = typeof call.collected_data === 'string'
                ? JSON.parse(call.collected_data || '{}')
                : (call.collected_data || {})

              return (
                <div key={call.id} className="animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <button
                    onClick={() => setExpandedCall(isExpanded ? null : call.id)}
                    className="w-full flex items-center gap-4 px-7 py-4 hover:bg-navy-50/50 transition-colors text-left">

                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-navy-100 to-orange-500 rounded-xl flex items-center justify-center text-sm font-display font-bold text-navy-600 flex-shrink-0">
                      {(call.variables?.name || call.phone)?.[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-navy-900 text-sm">{call.variables?.name || 'Unknown'}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-100 text-navy-500`}>
                          {langLabel[call.language_detected] || 'gu'}
                        </span>
                      </div>
                      <p className="text-xs text-navy-400">{call.phone} · {call.duration_sec}s</p>
                    </div>

                    {/* Outcome */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${oConfig.bg} ${oConfig.border}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${oConfig.dot}`} />
                      <span className={`text-xs font-semibold ${oConfig.color}`}>{oConfig.label}</span>
                    </div>

                    {/* Time */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-navy-400">
                        {new Date(call.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Expand */}
                    <div className="text-navy-300 flex-shrink-0">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {/* Expanded transcript */}
                  {isExpanded && (
                    <div className="mx-7 mb-4 animate-slide-up">
                      <div className="bg-navy-50 rounded-2xl p-5 border border-navy-100">
                        {/* Transcript */}
                        {transcript.length > 0 ? (
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <MessageSquare size={13} className="text-navy-400" />
                              <p className="text-xs font-bold text-navy-500 uppercase tracking-wider">Transcript ({langNames[call.language_detected] || 'Gujarati'})</p>
                            </div>
                            {transcript.map((t, ti) => (
                              <div key={ti} className={`flex ${t.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                                  ${t.role === 'assistant'
                                    ? 'bg-white border border-navy-100 text-navy-800'
                                    : 'bg-navy-800 text-white'}`}>
                                  <p className={`text-[10px] font-bold mb-1 ${t.role === 'assistant' ? 'text-navy-400' : 'text-navy-300'}`}>
                                    {t.role === 'assistant' ? '🤖 AI Agent' : '👤 User'}
                                  </p>
                                  {t.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-4 text-navy-400">
                            <Mic size={14} />
                            <p className="text-xs italic">No transcript available (call not answered)</p>
                          </div>
                        )}

                        {/* Collected data */}
                        {Object.keys(collectedData).length > 0 && (
                          <div className="pt-3 border-t border-navy-200">
                            <p className="text-[10px] font-bold text-navy-500 uppercase tracking-wider mb-2">Collected Data</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(collectedData).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-navy-100">
                                  <span className="text-[11px] font-semibold text-navy-500">{k}:</span>
                                  <span className="text-[11px] text-navy-800">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
