import { useState, useEffect } from 'react'
import { billingApi } from '../hooks/api'
import { Phone, Clock, IndianRupee, Calendar, TrendingUp, Download, ChevronDown } from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────
function fmt(n, dec = 2) { return Number(n || 0).toFixed(dec) }
function fmtINR(n)  { return '₹' + Number(n || 0).toFixed(2) }
function fmtInt(n)  { return Number(n || 0).toLocaleString('en-IN') }

function monthOptions() {
  const opts = []
  const now  = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    opts.push({ val, label })
  }
  return opts
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium" style={{ color: '#8a8a8a' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '15' }}>
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-[26px] font-bold leading-none mb-1" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: '#a8a8a8' }}>{sub}</p>}
    </div>
  )
}

// ── Mini bar chart ────────────────────────────────────────────
function BarChart({ data }) {
  if (!data?.length) return <div className="text-center py-8 text-[13px]" style={{ color: '#c4c4c4' }}>No activity data yet</div>
  const max = Math.max(...data.map(d => d.calls), 1)
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="w-full rounded-sm transition-all duration-300"
            style={{
              height: `${Math.max(4, (d.calls / max) * 72)}px`,
              background: d.calls > 0 ? '#f5a623' : '#f5f1ea',
              minHeight: '4px',
            }} />
          {/* tooltip on hover */}
          <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
            <div className="text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap"
              style={{ background: '#1a1a1a', color: '#fff' }}>
              {d.calls} calls · {fmt(d.seconds / 60, 1)} min
            </div>
            <div className="w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #1a1a1a' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Billing() {
  const months = monthOptions()
  const [selectedMonth, setSelectedMonth] = useState(months[0].val)
  const [summary,  setSummary]  = useState(null)
  const [monthly,  setMonthly]  = useState([])
  const [activity, setActivity] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('usage') // 'usage' | 'invoices'

  useEffect(() => {
    setLoading(true)
    Promise.all([
      billingApi.summary(selectedMonth),
      billingApi.monthly(),
      billingApi.activity(),
      billingApi.invoices(),
    ])
      .then(([s, m, a, inv]) => {
        setSummary(s.data)
        setMonthly(m.data.months || [])
        setActivity(a.data.days  || [])
        setInvoices(inv.data.invoices || [])
      })
      .catch(err => console.error('Billing load error:', err))
      .finally(() => setLoading(false))
  }, [selectedMonth])

  // ── skeleton ─────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="skeleton h-8 w-48 mb-8 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  const { totals, campaigns = [], period, rate_per_min } = summary || {}

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>Billing</h1>
          <p className="text-sm mt-1" style={{ color: '#8a8a8a' }}>Usage and charges</p>
        </div>

        {/* Month picker */}
        <div className="relative">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="input-field pr-9 appearance-none cursor-pointer font-medium text-[13px]"
            style={{ paddingRight: '36px', minWidth: '160px' }}>
            {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8a8a8' }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: '#f5f1ea' }}>
        {[['usage', 'Usage'], ['invoices', 'Invoices']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-5 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={tab === key
              ? { background: '#fff', color: '#1a1a1a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#8a8a8a' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── USAGE TAB ── */}
      {tab === 'usage' && (
        <>
          {/* Period label */}
          <div className="flex items-center gap-2 mb-5 px-1">
            <Calendar size={13} style={{ color: '#a8a8a8' }} />
            <span className="text-[12px]" style={{ color: '#a8a8a8' }}>
              {period?.label || months.find(m => m.val === selectedMonth)?.label}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Calls"   value={fmtInt(totals?.calls)}   sub="completed calls"      icon={Phone}        accent="#f5a623" />
            <StatCard label="Total Minutes" value={fmt(totals?.minutes, 1)} sub="billed duration"      icon={Clock}        accent="#8b5cf6" />
            <StatCard label="Campaigns"     value={fmtInt(totals?.campaigns)} sub="active this period" icon={TrendingUp}   accent="#2fa05c" />
            <StatCard label="Amount"        value={fmtINR(totals?.amount)}  sub={`@ ₹${fmt(rate_per_min)}/min`} icon={IndianRupee} accent="#f43f5e" />
          </div>

          {/* Campaign breakdown table */}
          <div className="card overflow-hidden mb-6">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #f5f1ea' }}>
              <h2 className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>Campaign Breakdown</h2>
              <p className="text-[12px] mt-0.5" style={{ color: '#a8a8a8' }}>Completed calls only · {period?.label}</p>
            </div>

            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-[13px]" style={{ color: '#c4c4c4' }}>No completed calls this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f5f1ea' }}>
                      {['Campaign', 'Calls', 'Minutes', 'Amount'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a8a8a8' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => (
                      <tr key={c.campaign_id}
                        style={{ borderBottom: i < campaigns.length - 1 ? '1px solid #f5f1ea' : 'none' }}
                        className="hover:bg-[#fdfcfa] transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>{c.campaign_name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: '#a8a8a8', textTransform: 'capitalize' }}>{c.campaign_status}</p>
                        </td>
                        <td className="px-6 py-3.5 text-[13px] font-medium tabular-nums" style={{ color: '#3d3d3d' }}>
                          {fmtInt(c.total_calls)}
                        </td>
                        <td className="px-6 py-3.5 text-[13px] tabular-nums" style={{ color: '#3d3d3d' }}>
                          {fmt(c.total_minutes, 1)} min
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="text-[13px] font-semibold tabular-nums" style={{ color: '#1a1a1a' }}>
                            {fmtINR(c.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #f0f0f0', background: '#faf8f4' }}>
                      <td className="px-6 py-3.5 text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>Total</td>
                      <td className="px-6 py-3.5 text-[13px] font-semibold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtInt(totals?.calls)}</td>
                      <td className="px-6 py-3.5 text-[13px] tabular-nums" style={{ color: '#1a1a1a' }}>{fmt(totals?.minutes, 1)} min</td>
                      <td className="px-6 py-3.5 text-[14px] font-bold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtINR(totals?.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Activity chart + monthly history side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* 30-day activity */}
            <div className="card p-5">
              <p className="font-semibold text-[14px] mb-1" style={{ color: '#1a1a1a' }}>Daily Activity</p>
              <p className="text-[11px] mb-5" style={{ color: '#a8a8a8' }}>Last 30 days · completed calls</p>
              <BarChart data={activity} />
            </div>

            {/* Monthly history */}
            <div className="card p-5">
              <p className="font-semibold text-[14px] mb-1" style={{ color: '#1a1a1a' }}>Monthly History</p>
              <p className="text-[11px] mb-4" style={{ color: '#a8a8a8' }}>Last 6 months</p>
              {monthly.length === 0 ? (
                <div className="text-center py-8 text-[13px]" style={{ color: '#c4c4c4' }}>No history yet</div>
              ) : (
                <div className="space-y-2.5">
                  {monthly.map((m, i) => {
                    const maxAmt = Math.max(...monthly.map(x => x.amount), 1)
                    const pct = Math.max(4, (m.amount / maxAmt) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <p className="text-[12px] w-20 flex-shrink-0" style={{ color: '#6b6b6b' }}>{m.month}</p>
                        <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: '#f5f1ea' }}>
                          <div className="h-full rounded-md transition-all duration-500"
                            style={{ width: `${pct}%`, background: i === 0 ? '#f5a623' : '#e0d9ce' }} />
                        </div>
                        <div className="text-right flex-shrink-0" style={{ minWidth: '80px' }}>
                          <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtINR(m.amount)}</span>
                          <span className="text-[11px] ml-1.5" style={{ color: '#a8a8a8' }}>{fmtInt(m.total_calls)} calls</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── INVOICES TAB ── */}
      {tab === 'invoices' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #f5f1ea' }}>
            <h2 className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>Invoices</h2>
            <p className="text-[12px] mt-0.5" style={{ color: '#a8a8a8' }}>Generated invoices for billing records</p>
          </div>

          {invoices.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#faf8f4' }}>
                <IndianRupee size={22} style={{ color: '#d0c9be' }} />
              </div>
              <p className="font-semibold text-[14px] mb-1" style={{ color: '#3d3d3d', fontFamily: '"DM Serif Display",serif' }}>No invoices yet</p>
              <p className="text-[12px]" style={{ color: '#a8a8a8' }}>Invoices will appear here once generated</p>
            </div>
          ) : (
            <div>
              {invoices.map((inv, i) => {
                const statusStyle = {
                  paid:    { bg: '#dcf3e5', color: '#228248' },
                  sent:    { bg: '#fef3d0', color: '#b86f0e' },
                  draft:   { bg: '#f5f1ea', color: '#6b6b6b' },
                  overdue: { bg: '#fff1f2', color: '#e11d48' },
                }[inv.status] || { bg: '#f5f1ea', color: '#6b6b6b' }

                return (
                  <div key={inv.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#fdfcfa] transition-colors"
                    style={{ borderBottom: i < invoices.length - 1 ? '1px solid #f5f1ea' : 'none' }}>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>
                        {inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#a8a8a8' }}>
                        {new Date(inv.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        {' → '}
                        {new Date(inv.period_end).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-[14px] font-bold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtINR(inv.total_amount)}</p>
                      <p className="text-[11px]" style={{ color: '#a8a8a8' }}>{fmtInt(inv.total_calls)} calls · {fmt(inv.total_minutes, 1)} min</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg capitalize"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}>
                      {inv.status}
                    </span>
                    <button className="btn-secondary p-2" style={{ padding: '8px' }} title="Download invoice">
                      <Download size={14} style={{ color: '#8a8a8a' }} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
