import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { campaignApi } from '../hooks/useApi'
import { Phone, Users, CheckCircle, Clock, Plus } from 'lucide-react'

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([])
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    campaignApi.list().then(r => setCampaigns(r.data.campaigns)).catch(() => {})
  }, [])

  const totalContacts = campaigns.reduce((a, c) => a + (c.total_contacts || 0), 0)
  const totalCompleted = campaigns.reduce((a, c) => a + (c.completed_calls || 0), 0)
  const active = campaigns.filter(c => c.status === 'active').length

  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, icon: Phone, color: 'blue' },
    { label: 'Total Contacts', value: totalContacts, icon: Users, color: 'green' },
    { label: 'Calls Completed', value: totalCompleted, icon: CheckCircle, color: 'purple' },
    { label: 'Active Now', value: active, icon: Clock, color: 'orange' },
  ]

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            નમસ્તે, {user.company_name || 'Welcome'} 👋
          </h1>
          <p className="text-gray-500 mt-1">Your AI voice call dashboard</p>
        </div>
        <Link to="/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
          <Plus size={18} /> New Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon size={20} className="text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Campaigns</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Phone size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No campaigns yet.</p>
            <Link to="/campaigns/new" className="text-blue-600 hover:underline text-sm mt-2 block">
              Create your first campaign →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {campaigns.slice(0, 5).map(c => (
              <Link key={c.id} to={`/campaigns/${c.id}`}
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {c.total_contacts} contacts · {c.completed_calls} completed
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium
                  ${c.status === 'active' ? 'bg-green-100 text-green-700' :
                    c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'}`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
