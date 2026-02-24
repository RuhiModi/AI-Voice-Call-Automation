import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { campaignApi } from '../hooks/useApi'
import { Play, Pause, Phone, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CampaignDetail() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [stats, setStats] = useState(null)
  const [calls, setCalls] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // Poll stats every 5 seconds if active
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [id])

  async function load() {
    try {
      const [campRes, callsRes] = await Promise.all([
        campaignApi.get(id),
        campaignApi.calls(id)
      ])
      setCampaign(campRes.data.campaign)
      setStats(campRes.data.stats)
      setCalls(callsRes.data.logs)
    } catch (err) {
      toast.error('Failed to load campaign')
    } finally { setLoading(false) }
  }

  async function loadStats() {
    try {
      const res = await campaignApi.get(id)
      setStats(res.data.stats)
      setCampaign(res.data.campaign)
    } catch {}
  }

  async function toggleCampaign() {
    try {
      if (campaign.status === 'active') {
        await campaignApi.pause(id)
        toast.success('Campaign paused')
      } else {
        await campaignApi.launch(id)
        toast.success('Campaign resumed!')
      }
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!campaign) return <div className="p-8 text-center text-gray-500">Campaign not found</div>

  const total = parseInt(stats?.completed || 0) + parseInt(stats?.pending || 0) + parseInt(stats?.failed || 0)
  const progress = total > 0 ? Math.round((parseInt(stats?.completed || 0) / total) * 100) : 0

  const outcomeColors = {
    completed: 'text-green-600', failed: 'text-red-500', busy: 'text-yellow-600',
    no_answer: 'text-gray-500', rescheduled: 'text-blue-500', transferred: 'text-purple-500'
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-gray-500 mt-1">{campaign.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium
            ${campaign.status === 'active' ? 'bg-green-100 text-green-700' :
              campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'}`}>
            {campaign.status}
          </span>
          {campaign.status !== 'completed' && (
            <button onClick={toggleCampaign}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${campaign.status === 'active'
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-600 text-white hover:bg-green-700'}`}>
              {campaign.status === 'active' ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Resume</>}
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-5 gap-4 mt-6">
          {[
            { label: 'Total', value: campaign.total_contacts, icon: Phone, color: 'blue' },
            { label: 'Completed', value: stats?.completed || 0, icon: CheckCircle, color: 'green' },
            { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'yellow' },
            { label: 'Rescheduled', value: stats?.scheduled || 0, icon: RotateCcw, color: 'blue' },
            { label: 'Failed', value: stats?.failed || 0, icon: XCircle, color: 'red' },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Call Logs</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {calls.map(call => (
            <div key={call.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => setSelected(selected?.id === call.id ? null : call)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <Phone size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {call.variables?.name || call.phone}
                    </p>
                    <p className="text-xs text-gray-500">{call.phone} · {call.duration_sec}s · {call.language_detected?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium capitalize ${outcomeColors[call.outcome] || 'text-gray-600'}`}>
                    {call.outcome?.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(call.started_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </p>
                </div>
              </div>

              {/* Transcript expansion */}
              {selected?.id === call.id && call.transcript && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-gray-600 mb-3">TRANSCRIPT</p>
                  {(Array.isArray(call.transcript) ? call.transcript : JSON.parse(call.transcript || '[]')).map((t, i) => (
                    <div key={i} className={`flex gap-2 ${t.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-xs px-3 py-2 rounded-lg text-sm
                        ${t.role === 'assistant' ? 'bg-blue-100 text-blue-900' : 'bg-white border text-gray-800'}`}>
                        <p className="text-xs font-medium mb-0.5 opacity-60">{t.role === 'assistant' ? 'AI Agent' : 'User'}</p>
                        {t.text}
                      </div>
                    </div>
                  ))}
                  {call.collected_data && Object.keys(call.collected_data).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">COLLECTED DATA</p>
                      {Object.entries(call.collected_data).map(([k, v]) => (
                        <p key={k} className="text-xs text-gray-700">
                          <span className="font-medium">{k}:</span> {String(v)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {calls.length === 0 && (
            <div className="p-12 text-center text-gray-400">No calls yet. Launch the campaign to start!</div>
          )}
        </div>
      </div>
    </div>
  )
}
