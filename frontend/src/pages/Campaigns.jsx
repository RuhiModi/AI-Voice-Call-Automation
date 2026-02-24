import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../hooks/useApi'
import { Plus, Phone, ChevronRight, Search } from 'lucide-react'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    campaignApi.list().then(r => setCampaigns(r.data.campaigns))
      .finally(() => setLoading(false))
  }, [])

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    paused: 'bg-yellow-100 text-yellow-700',
    draft: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link to="/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
          <Plus size={18} /> New Campaign
        </Link>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Phone size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No campaigns found</p>
          <Link to="/campaigns/new" className="text-blue-600 text-sm hover:underline mt-2 block">
            Create your first campaign →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {filtered.map(c => {
            const total = c.total_contacts || 0
            const done = c.completed_calls || 0
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <Link key={c.id} to={`/campaigns/${c.id}`}
                className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[c.status] || 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{total} contacts</span>
                    <span>{done} completed</span>
                    <span>{c.language_priority?.toUpperCase()}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full w-48 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400 ml-4" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
