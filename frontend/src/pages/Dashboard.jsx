import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardApi } from '../hooks/api'
import toast from 'react-hot-toast'
import {
  Phone, TrendingUp, Clock, CheckCircle2, XCircle,
  PhoneMissed, AlertTriangle, Plus, ArrowRight,
  RefreshCw, Zap, BarChart2, Calendar, ChevronRight,
  PhoneCall, Mic, Users
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_EMOJI = {
  announcement: '📢',
  survey:       '📋',
  reminder:     '⏰',
  political:    '🗳️',
  custom:       '⚙️',
}

const OUTCOME_META = {
  completed:  { label: 'Answered',   color: 'text-green-600',  bg: 'bg-green-50',  dot: 'bg-green-500'  },
  no_answer:  { label: 'No Answer',  color: 'text-gray-500',   bg: 'bg-gray-100',  dot: 'bg-gray-400'   },
  busy:       { label: 'Busy',       color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-400' },
  failed:     { label: 'Failed',     color: 'text-red-500',    bg: 'bg-red-50',    dot: 'bg-red-400'    },
  transferred:{ label: 'Transferred',color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-400'   },
}

const STATUS_META = {
  active:    { label: 'Live',      dot: 'bg-green-500 animate-pulse', text: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  paused:    { label: 'Paused',    dot: 'bg-yellow-400',              text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  completed: { label: 'Done',      dot: 'bg-gray-400',                text: 'text-gray-500',  bg: 'bg-gray-100 border-gray-200' },
  draft:     { label: 'Draft',     dot: 'bg-gray-300',                text: 'text-gray-400',  bg: 'bg-gray-50 border-gray-200' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDuration(sec) {
  if (!sec || sec === 0) return '—'
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getContactName(variables) {
  if (!variables) return null
  return variables.name || variables.driver_name || variables.Name || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent, warn }) {
  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-1 transition-all hover:shadow-md
      ${warn ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold uppercase tracking-widest ${warn ? 'text-orange-500' : 'text-gray-400'}`}>
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center
          ${warn ? 'bg-orange-100' : accent || 'bg-gray-100'}`}>
          <Icon size={16} className={warn ? 'text-orange-500' : 'text-gray-600'} />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900 leading-none">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function ProgressBar({ pct, status }) {
  const color = status === 'active'
    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
    : 'bg-gradient-to-r from-gray-300 to-gray-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )
}

function UsageBar({ used, limit, label }) {
  const pct   = limit ? Math.min(Math.round((used / limit) * 100), 100) : 0
  const warn  = pct >= 80
  const block = pct >= 100
  const color = block ? 'bg-red-500' : warn ? 'bg-orange-400' : 'bg-[#1a1a1a]'
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className={`text-xs font-bold ${block ? 'text-red-500' : warn ? 'text-orange-500' : 'text-gray-500'}`}>
          {limit ? `${used} / ${limit}` : `${used}`}
          {block && ' — Limit reached'}
          {!block && warn && ' — Almost full'}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await dashboardApi.overview()
      setData(res.data)
    } catch (err) {
      toast.error('Could not load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refresh])

  // Auto-refresh every 30s when there are active campaigns
  useEffect(() => {
    if (!data?.active_campaigns?.length) return
    const id = setInterval(() => setRefresh(r => r + 1), 30_000)
    return () => clearInterval(id)
  }, [data?.active_campaigns?.length])

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-xl w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    )
  }

  const {
    active_campaigns  = [],
    recent_campaigns  = [],
    today             = {},
    month             = {},
    totals            = {},
    recent_calls      = [],
    usage             = {},
  } = data || {}

  const plan     = usage?.plan     || {}
  const limits   = usage?.limits   || {}
  const usage_   = usage?.usage    || {}
  const callsWarn = limits.calls_per_month
    ? (usage_.calls_this_month / limits.calls_per_month) >= 0.8
    : false

  const noActivity = !active_campaigns.length && !recent_campaigns.length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-16 space-y-8">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefresh(r => r + 1)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/dashboard/campaigns/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold hover:bg-[#333] transition-all"
          >
            <Plus size={15} /> New Campaign
          </button>
        </div>
      </div>

      {/* ── Plan usage warning ────────────────────────────────── */}
      {callsWarn && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-700">
              Approaching your {plan.name || ''} plan call limit
            </p>
            <p className="text-xs text-orange-500 mt-0.5">
              {usage_.calls_this_month} of {limits.calls_per_month} calls used this month
            </p>
          </div>
          <Link
            to="/dashboard/billing"
            className="text-xs font-bold text-orange-700 border border-orange-300 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-all whitespace-nowrap"
          >
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Phone}
          label="Today's Calls"
          value={today.total_calls ?? 0}
          sub={today.total_minutes ? `${today.total_minutes} min total` : 'No calls yet'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Answer Rate"
          value={today.answer_rate != null ? `${today.answer_rate}%`
            : month.total_calls > 0
              ? `${Math.round((parseInt(month.completed||0) / parseInt(month.total_calls)) * 100)}%`
              : '—'}
          sub={today.total_calls
            ? `${today.completed} answered today`
            : month.total_calls > 0 ? 'This month avg' : 'No data yet'}
          accent="bg-green-100"
        />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={fmtDuration(today.avg_duration_sec || (month.total_calls > 0 ? Math.round((month.total_minutes * 60) / month.total_calls) : 0))}
          sub={today.total_calls ? 'Per call today' : month.total_calls > 0 ? 'Per call this month' : 'Per answered call'}
        />
        <StatCard
          icon={BarChart2}
          label="This Month"
          value={month.total_calls ?? 0}
          sub={month.total_minutes ? `${month.total_minutes} min used` : 'No calls yet'}
          warn={callsWarn}
        />
      </div>

      {/* ── Active / paused campaigns ─────────────────────────── */}
      {active_campaigns.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
              Live & Paused
            </h2>
          </div>
          <div className="space-y-3">
            {active_campaigns.map(c => {
              const sm = STATUS_META[c.status] || STATUS_META.draft
              return (
                <Link
                  key={c.id}
                  to={`/dashboard/campaigns/${c.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{TYPE_EMOJI[c.campaign_type] || '📞'}</span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm group-hover:text-black">{c.name}</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold mt-0.5 ${sm.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                          {sm.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black text-gray-900">{c.progress_pct}%</p>
                      <p className="text-xs text-gray-400">complete</p>
                    </div>
                  </div>

                  <ProgressBar pct={c.progress_pct} status={c.status} />

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {c.total_contacts} contacts
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 size={12} />
                      {c.completed_contacts} done
                    </span>
                    {c.calling_contacts > 0 && (
                      <span className="flex items-center gap-1 text-blue-500">
                        <PhoneCall size={12} />
                        {c.calling_contacts} in call
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-gray-400 group-hover:text-gray-700">
                      View details <ChevronRight size={12} />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Main grid: Recent campaigns + Recent calls ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent campaigns */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
              Recent Campaigns
            </h2>
            <Link
              to="/dashboard/campaigns"
              className="text-xs font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              All campaigns <ArrowRight size={12} />
            </Link>
          </div>

          {noActivity ? (
            /* ── Empty state ── */
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-200">
                <Mic size={28} className="text-gray-300" />
              </div>
              <p className="font-bold text-gray-700 mb-1">No campaigns yet</p>
              <p className="text-sm text-gray-400 mb-5 max-w-xs">
                Create your first voice campaign and start reaching contacts in minutes.
              </p>
              <button
                onClick={() => navigate('/dashboard/campaigns/new')}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold hover:bg-[#333] transition-all"
              >
                <Plus size={14} /> Create Campaign
              </button>
            </div>
          ) : recent_campaigns.length === 0 && active_campaigns.length > 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              All campaigns are active or paused above
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent_campaigns.map(c => {
                const sm  = STATUS_META[c.status] || STATUS_META.draft
                const pct = c.total_contacts > 0
                  ? Math.round((c.completed_contacts / c.total_contacts) * 100)
                  : 0
                return (
                  <Link
                    key={c.id}
                    to={`/dashboard/campaigns/${c.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-all group"
                  >
                    <span className="text-lg flex-shrink-0">{TYPE_EMOJI[c.campaign_type] || '📞'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-black">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden max-w-[100px]">
                          <div className="h-1.5 bg-gray-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border ${sm.bg} ${sm.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sm.dot.replace(' animate-pulse', '')}`} />
                        {sm.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent call activity */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
              Recent Calls
            </h2>
            <span className="text-xs text-gray-400">Last 10</span>
          </div>

          {recent_calls.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-200">
                <Phone size={28} className="text-gray-300" />
              </div>
              <p className="font-bold text-gray-700 mb-1">No calls yet</p>
              <p className="text-sm text-gray-400">Call history will appear here once a campaign runs.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent_calls.map(cl => {
                const om   = OUTCOME_META[cl.outcome] || OUTCOME_META.no_answer
                const name = getContactName(cl.variables)
                return (
                  <div key={cl.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-all">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${om.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {name || cl.phone}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{cl.campaign_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-lg ${om.bg} ${om.color}`}>
                        {om.label}
                      </span>
                      <p className="text-xs text-gray-400">{fmtTime(cl.started_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Plan usage ───────────────────────────────────────────── */}
      {plan.name && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
                Plan Usage
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="font-bold text-gray-700">{plan.name}</span> plan
                {plan.price_monthly ? ` · ₹${plan.price_monthly}/month` : ' · Free'}
              </p>
            </div>
            <Link
              to="/dashboard/billing"
              className="text-xs font-bold text-gray-700 border border-gray-300 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-all"
            >
              {plan.name === 'Free' || plan.name === 'Starter' ? '⬆ Upgrade' : 'View Billing'}
            </Link>
          </div>
          <div className="space-y-4">
            <UsageBar
              label="Calls this month"
              used={usage_.calls_this_month || 0}
              limit={limits.calls_per_month}
            />
            <UsageBar
              label="Active campaigns"
              used={usage_.campaigns_active || 0}
              limit={limits.campaigns}
            />
          </div>
        </section>
      )}

      {/* ── Today's breakdown ────────────────────────────────────── */}
      {today.total_calls > 0 && (
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
            Today's Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Answered',  value: today.completed,  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50'  },
              { label: 'No Answer', value: today.no_answer,  icon: PhoneMissed,  color: 'text-gray-500',   bg: 'bg-gray-50'   },
              { label: 'Busy',      value: today.busy,       icon: Phone,        color: 'text-orange-500', bg: 'bg-orange-50' },
              { label: 'Failed',    value: today.failed,     icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-50'    },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 border border-gray-100`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={color} />
                  <span className={`text-xs font-bold ${color}`}>{label}</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{value ?? 0}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
