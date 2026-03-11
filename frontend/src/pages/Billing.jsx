import { useState, useEffect } from 'react'
import { billingApi } from '../hooks/api'
import toast from 'react-hot-toast'
import { Phone, Clock, IndianRupee, Calendar, TrendingUp, Download, ChevronDown, Receipt } from 'lucide-react'

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

// ── GST Summary box ───────────────────────────────────────────
function GSTBox({ subtotal, gst, total }) {
  return (
    <div className="card overflow-hidden mb-6">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #f5f1ea' }}>
        <div className="flex items-center gap-2">
          <Receipt size={15} style={{ color: '#8a8a8a' }} />
          <h2 className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>Amount Summary</h2>
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: '#a8a8a8' }}>Charges for selected period including 18% GST</p>
      </div>
      <div className="px-6 py-5">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[13px]" style={{ color: '#6b6b6b' }}>Subtotal (call charges)</p>
            <p className="text-[14px] font-semibold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtINR(subtotal)}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[13px]" style={{ color: '#6b6b6b' }}>GST @ 18%</p>
            <p className="text-[14px] font-semibold tabular-nums" style={{ color: '#6b6b6b' }}>{fmtINR(gst)}</p>
          </div>
          <div className="flex justify-between items-center pt-3" style={{ borderTop: '2px solid #f0f0f0' }}>
            <p className="text-[14px] font-bold" style={{ color: '#1a1a1a' }}>Total (incl. GST)</p>
            <p className="text-[20px] font-bold tabular-nums" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>{fmtINR(total)}</p>
          </div>
        </div>
      </div>
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
  const [summary,      setSummary]      = useState(null)
  const [monthly,      setMonthly]      = useState([])
  const [activity,     setActivity]     = useState([])
  const [invoices,     setInvoices]     = useState([])
  const [usageSummary, setUsageSummary] = useState(null)
  const [plans,        setPlans]        = useState([])
  const [upgrading,    setUpgrading]    = useState(null)
  const [generating,   setGenerating]   = useState(false)
  const [genMonth,     setGenMonth]     = useState('')
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('plan')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      billingApi.summary(selectedMonth),
      billingApi.monthly(),
      billingApi.activity(),
      billingApi.invoices(),
      billingApi.usageSummary(),
      billingApi.plans(),
    ])
      .then(([s, m, a, inv, us, pl]) => {
        setSummary(s.data)
        setMonthly(m.data.months || [])
        setActivity(a.data.days  || [])
        setInvoices(inv.data.invoices || [])
        setUsageSummary(us.data)
        setPlans(pl.data.plans || [])
      })
      .catch(err => console.error('Billing load error:', err))
      .finally(() => setLoading(false))
  }, [selectedMonth])

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
        {[['plan', 'Plan & Usage'], ['usage', 'Usage'], ['invoices', 'Invoices']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-5 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={tab === key
              ? { background: '#fff', color: '#1a1a1a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#8a8a8a' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PLAN & USAGE TAB ── */}
      {tab === 'plan' && usageSummary && (
        <>
          {/* Current plan banner */}
          <div className="card p-6 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: usageSummary.plan.id === 'free' ? '#f5f1ea' : '#dcf3e5', color: usageSummary.plan.id === 'free' ? '#6b6b6b' : '#228248' }}>
                    {usageSummary.plan.name} Plan
                  </span>
                  {usageSummary.plan.id === 'free' && (
                    <span className="text-[11px]" style={{ color: '#a8a8a8' }}>· Limited features</span>
                  )}
                </div>
                <p className="text-[13px] mt-2" style={{ color: '#6b6b6b' }}>
                  Rate: <strong style={{ color: '#1a1a1a' }}>₹{fmt(usageSummary.plan.rate_per_min)}/min</strong> + 18% GST · Billed from ringing
                  {usageSummary.plan.id === 'free' && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#dcf3e5', color: '#228248' }}>
                      ₹10 free credit included
                    </span>
                  )}
                </p>
              </div>
              {true && (
                <button onClick={() => setTab('upgrade')}
                  className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  ⬆️ Upgrade Plan
                </button>
              )}
            </div>
          </div>

          {/* Usage meters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Calls */}
            <div className="card p-5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold text-[14px]" style={{ color: '#1a1a1a' }}>Calls This Month</p>
                  <p className="text-[12px]" style={{ color: '#a8a8a8' }}>Resets on 1st of each month</p>
                </div>
                <p className="text-[13px] font-bold tabular-nums" style={{ color: usageSummary.at_limit.calls ? '#e11d48' : '#1a1a1a' }}>
                  {fmtInt(usageSummary.usage.calls_this_month)}
                  {usageSummary.limits.calls_per_month && ` / ${fmtInt(usageSummary.limits.calls_per_month)}`}
                </p>
              </div>
              {usageSummary.limits.calls_per_month ? (
                <>
                  <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#f5f1ea' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, usageSummary.percentages.calls || 0)}%`,
                        background: usageSummary.at_limit.calls ? '#e11d48' : usageSummary.warnings.calls ? '#f5a623' : '#52b87a',
                      }} />
                  </div>
                  {usageSummary.warnings.calls && !usageSummary.at_limit.calls && (
                    <p className="text-[11px] font-semibold" style={{ color: '#f5a623' }}>
                      ⚠️ {usageSummary.percentages.calls}% used — running low
                    </p>
                  )}
                  {usageSummary.at_limit.calls && (
                    <p className="text-[11px] font-semibold" style={{ color: '#e11d48' }}>
                      ⛔ Limit reached — campaigns paused until next month or upgrade
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[12px]" style={{ color: '#52b87a' }}>✅ Unlimited calls</p>
              )}
            </div>

            {/* Campaigns */}
            <div className="card p-5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold text-[14px]" style={{ color: '#1a1a1a' }}>Total Campaigns</p>
                  <p className="text-[12px]" style={{ color: '#a8a8a8' }}>All campaigns in your account</p>
                </div>
                <p className="text-[13px] font-bold tabular-nums" style={{ color: usageSummary.at_limit.campaigns ? '#e11d48' : '#1a1a1a' }}>
                  {fmtInt(usageSummary.usage.campaigns_total)}
                  {usageSummary.limits.campaigns_limit && ` / ${fmtInt(usageSummary.limits.campaigns_limit)}`}
                </p>
              </div>
              {usageSummary.limits.campaigns_limit ? (
                <>
                  <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: '#f5f1ea' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, usageSummary.percentages.campaigns || 0)}%`,
                        background: usageSummary.at_limit.campaigns ? '#e11d48' : usageSummary.warnings.campaigns ? '#f5a623' : '#52b87a',
                      }} />
                  </div>
                  {usageSummary.at_limit.campaigns && (
                    <p className="text-[11px] font-semibold" style={{ color: '#e11d48' }}>
                      ⛔ Limit reached — upgrade to create more campaigns
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[12px]" style={{ color: '#52b87a' }}>✅ Unlimited campaigns</p>
              )}
            </div>
          </div>

          {/* Other limits */}
          <div className="card p-5">
            <p className="font-semibold text-[14px] mb-4" style={{ color: '#1a1a1a' }}>Plan Limits</p>
            <div className="space-y-3">
              {[
                { label: 'Contacts per campaign', value: usageSummary.limits.contacts_per_campaign },
                { label: 'Team members',           value: usageSummary.limits.team_members_limit },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid #f5f1ea' }}>
                  <p className="text-[13px]" style={{ color: '#6b6b6b' }}>{label}</p>
                  <p className="text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>
                    {value === null ? '∞ Unlimited' : fmtInt(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── UPGRADE TAB ── */}
      {tab === 'upgrade' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setTab('plan')} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>← Back</button>
            <div>
              <h2 className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>Choose a Plan</h2>
              <p className="text-[12px]" style={{ color: '#a8a8a8' }}>Current: <strong>{usageSummary?.plan?.name}</strong></p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {plans.filter(p => p.id !== 'enterprise' && p.id !== 'pro' && p.id !== 'starter').map(plan => {
              const isCurrent = plan.id === usageSummary?.plan?.id
              const isPopular = plan.id === 'growth'
              return (
                <div key={plan.id} className="card p-6 relative"
                  style={isCurrent ? { border: '2px solid #1a1a1a' } : isPopular ? { border: '2px solid #f5a623' } : {}}>
                  {isPopular && !isCurrent && (
                    <span className="absolute -top-3 left-6 text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{ background: '#f5a623', color: '#fff' }}>Most Popular</span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-3 left-6 text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{ background: '#1a1a1a', color: '#fff' }}>Current Plan</span>
                  )}
                  <p className="font-bold text-[16px] mb-1" style={{ color: '#1a1a1a' }}>{plan.name}</p>
                  <p className="text-[13px] mb-4" style={{ color: '#6b6b6b' }}>
                    Usage-based · ₹{fmt(plan.rate_per_min)}/min · No monthly fee
                  </p>
                  <div className="space-y-2 mb-5">
                    {(plan.features || []).filter(f => !f.toLowerCase().includes('team member')).map((f, i) => (
                      <p key={i} className="text-[12px] flex items-center gap-2" style={{ color: '#3d3d3d' }}>
                        <span style={{ color: '#52b87a' }}>✓</span> {f}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      if (isCurrent) return
                      setUpgrading(plan.id)
                      try {
                        await billingApi.upgrade(plan.id)
                        const us = await billingApi.usageSummary()
                        setUsageSummary(us.data)
                        setTab('plan')
                        toast?.success(`Switched to ${plan.name} plan!`)
                      } catch (err) {
                        toast?.error('Upgrade failed')
                      } finally { setUpgrading(null) }
                    }}
                    disabled={isCurrent || upgrading === plan.id}
                    className={isCurrent ? 'btn-secondary w-full' : 'btn-primary w-full'}
                    style={{ opacity: isCurrent ? 0.5 : 1 }}>
                    {upgrading === plan.id ? 'Upgrading...' : isCurrent ? 'Current Plan' : plan.id === 'growth' ? `Switch to ${plan.name} (₹4/min)` : `Switch to ${plan.name} (₹6/min)`}
                  </button>
                </div>
              )
            })}
          </div>
          {/* Contact for enterprise */}
          <div className="card p-6 mt-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Need a custom rate?</p>
              <p className="text-[12px] mt-0.5" style={{ color: '#a8a8a8' }}>High volume? Contact us for a custom per-minute rate.</p>
            </div>
            <button className="btn-secondary" onClick={() => window.open('mailto:billing@voiceai.in')}>
              Contact Us
            </button>
          </div>
        </div>
      )}

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
            <StatCard label="Total Calls"   value={fmtInt(totals?.calls)}     sub="calls with duration (billed)"       icon={Phone}       accent="#f5a623" />
            <StatCard label="Total Minutes" value={fmt(totals?.minutes, 1)}   sub="billed duration"       icon={Clock}       accent="#8b5cf6" />
            <StatCard label="Campaigns"     value={fmtInt(totals?.campaigns)} sub="all your campaigns"    icon={TrendingUp}  accent="#2fa05c" />
            <StatCard label="Amount + GST"  value={fmtINR(totals?.amount)}    sub={`₹${fmt(usageSummary?.plan?.rate_per_min || rate_per_min)}/min + 18% GST`} icon={IndianRupee} accent="#f43f5e" />
          </div>

          {/* GST Breakdown */}
          <GSTBox
            subtotal={totals?.subtotal}
            gst={totals?.gst}
            total={totals?.amount}
          />

          {/* Campaign breakdown table */}
          <div className="card overflow-hidden mb-6">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #f5f1ea' }}>
              <h2 className="font-semibold text-[15px]" style={{ color: '#1a1a1a' }}>Campaign Breakdown</h2>
              <p className="text-[12px] mt-0.5" style={{ color: '#a8a8a8' }}>Completed calls only · {period?.label} · All amounts include 18% GST</p>
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
                      {['Campaign', 'Calls', 'Minutes', 'Subtotal', 'GST (18%)', 'Total'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a8a8a8' }}>
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
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-medium" style={{ color: '#1a1a1a' }}>{c.campaign_name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: '#a8a8a8', textTransform: 'capitalize' }}>{c.campaign_status}</p>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-medium tabular-nums" style={{ color: '#3d3d3d' }}>{fmtInt(c.total_calls)}</td>
                        <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: '#3d3d3d' }}>{fmt(c.total_minutes, 1)} min</td>
                        <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: '#6b6b6b' }}>{fmtINR(c.subtotal)}</td>
                        <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: '#6b6b6b' }}>{fmtINR(c.gst)}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-bold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtINR(c.amount)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #f0f0f0', background: '#faf8f4' }}>
                      <td className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>Total</td>
                      <td className="px-5 py-3.5 text-[13px] font-semibold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtInt(totals?.calls)}</td>
                      <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: '#1a1a1a' }}>{fmt(totals?.minutes, 1)} min</td>
                      <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: '#6b6b6b' }}>{fmtINR(totals?.subtotal)}</td>
                      <td className="px-5 py-3.5 text-[13px] tabular-nums" style={{ color: '#6b6b6b' }}>{fmtINR(totals?.gst)}</td>
                      <td className="px-5 py-3.5 text-[14px] font-bold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtINR(totals?.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Activity chart + monthly history */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <p className="font-semibold text-[14px] mb-1" style={{ color: '#1a1a1a' }}>Daily Activity</p>
              <p className="text-[11px] mb-5" style={{ color: '#a8a8a8' }}>Last 30 days · completed calls</p>
              <BarChart data={activity} />
            </div>

            <div className="card p-5">
              <p className="font-semibold text-[14px] mb-1" style={{ color: '#1a1a1a' }}>Monthly History</p>
              <p className="text-[11px] mb-4" style={{ color: '#a8a8a8' }}>Last 6 months · incl. 18% GST</p>
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
                        <div className="text-right flex-shrink-0" style={{ minWidth: '100px' }}>
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
        <div>
          {/* Generate invoice card */}
          <div className="card p-5 mb-5">
            <p className="font-semibold text-[14px] mb-1" style={{ color: '#1a1a1a' }}>Generate Invoice</p>
            <p className="text-[12px] mb-4" style={{ color: '#a8a8a8' }}>Select a month to generate a GST invoice for all completed calls</p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="month"
                value={genMonth}
                max={new Date().toISOString().slice(0, 7)}
                onChange={e => setGenMonth(e.target.value)}
                className="input-field" style={{ minWidth: '160px' }}
              />
              <button
                disabled={!genMonth || generating}
                onClick={async () => {
                  setGenerating(true)
                  try {
                    const res = await billingApi.generateInvoice(genMonth)
                    const { invoice, already_exists } = res.data
                    setInvoices(prev => {
                      const exists = prev.find(i => i.id === invoice.id)
                      if (exists) return prev
                      return [invoice, ...prev]
                    })
                    toast.success(already_exists ? 'Invoice already exists for this month' : `Invoice ${invoice.invoice_number} generated!`)
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Failed to generate invoice')
                  } finally { setGenerating(false) }
                }}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {generating ? 'Generating...' : '📄 Generate Invoice'}
              </button>
            </div>
          </div>

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
              <p className="text-[12px] mb-4" style={{ color: '#a8a8a8' }}>Select a month above and click Generate Invoice</p>
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
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>
                        {inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#a8a8a8' }}>
                        {new Date(inv.period_start).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        {' → '}
                        {new Date(inv.period_end).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold tabular-nums" style={{ color: '#1a1a1a' }}>{fmtINR(inv.total_amount)}</p>
                      <p className="text-[11px]" style={{ color: '#a8a8a8' }}>{fmtInt(inv.total_calls)} calls · {fmt(inv.total_minutes, 1)} min · incl. GST</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg capitalize"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}>
                      {inv.status}
                    </span>
                    <a href={billingApi.downloadInvoice(inv.id)}
                      target="_blank" rel="noreferrer"
                      className="btn-secondary" style={{ padding: '8px', display: 'inline-flex', alignItems: 'center' }}
                      title="View / Print invoice">
                      <Download size={14} style={{ color: '#8a8a8a' }} />
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  )
}
