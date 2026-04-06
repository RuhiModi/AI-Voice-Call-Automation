import { useState, useEffect } from 'react'
import { billingApi } from '../hooks/api'
import toast from 'react-hot-toast'
import { IndianRupee, Calendar, TrendingUp, Download, Receipt, ChevronDown, Wallet, Phone, Clock, Zap, Check } from 'lucide-react'

const SKY  = '#0EA5E9', SKYL = '#38BDF8', SKYD = '#0284C7'
const GRAD = 'linear-gradient(135deg,#38BDF8,#0EA5E9,#0284C7)'
const BG   = '#F0F9FF', BORD = '#BAE6FD', GLOW = '0 3px 16px rgba(14,165,233,.22)'

const fmtINR = n => '₹' + Number(n||0).toFixed(2)
const fmtInt = n => Number(n||0).toLocaleString('en-IN')
const fmt    = (n, d=2) => Number(n||0).toFixed(d)

function monthOptions() {
  const opts = [], now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    opts.push({ val:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleDateString('en-IN',{month:'long',year:'numeric'}) })
  }
  return opts
}

function Card({ children, style={} }) {
  return <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, ...style }}>{children}</div>
}

function StatCard({ label, value, sub, icon:Icon, color=SKY }) {
  return (
    <Card style={{ padding:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ fontSize:12, color:'#9CA3AF', fontWeight:500, margin:0 }}>{label}</p>
        <div style={{ width:34, height:34, borderRadius:10, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={15} color={color}/>
        </div>
      </div>
      <p style={{ fontSize:26, fontWeight:800, color:'#0f172a', margin:'0 0 4px', letterSpacing:'-0.03em', lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#9CA3AF', margin:0 }}>{sub}</p>}
    </Card>
  )
}

function PBar({ pct, color=SKY, warn, danger }) {
  const bg = danger?'#EF4444':warn?'#F59E0B':color
  return (
    <div style={{ height:8, background:BG, borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:8, width:`${Math.min(pct,100)}%`, background:bg, borderRadius:99, transition:'width .7s' }}/>
    </div>
  )
}

function Section({ title, sub, children }) {
  return (
    <Card style={{ overflow:'hidden', marginBottom:14 }}>
      <div style={{ padding:'16px 22px', borderBottom:`1px solid ${BG}` }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:0 }}>{title}</h3>
        {sub && <p style={{ fontSize:12, color:'#9CA3AF', margin:'3px 0 0' }}>{sub}</p>}
      </div>
      <div style={{ padding:'20px 22px' }}>{children}</div>
    </Card>
  )
}

function MiniBar({ data=[] }) {
  if (!data.length) return <div style={{ padding:'24px', textAlign:'center', fontSize:13, color:BORD }}>No activity data yet</div>
  const max = Math.max(...data.map(d=>d.calls), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:80 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, position:'relative' }}>
          <div title={`${d.calls} calls`} style={{ width:'100%', borderRadius:'3px 3px 0 0', background:d.calls>0?GRAD:BG, height:`${Math.max(4,(d.calls/max)*72)}px`, transition:'height .3s', cursor:'pointer' }}/>
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
      .then(([s,m,a,inv,us,pl]) => {
        setSummary(s.data)
        setMonthly(m.data.months||[])
        setActivity(a.data.days||[])
        setInvoices(inv.data.invoices||[])
        setUsageSummary(us.data)
        setPlans(pl.data.plans||[])
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [selectedMonth])

  const { totals, campaigns=[], rate_per_min } = summary || {}

  if (loading) return (
    <div style={{ padding:'24px 28px', background:BG, minHeight:'100%' }}>
      {[1,2,3].map(i => <div key={i} style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, height:120, marginBottom:14, animation:'bl-pulse 1.4s ease infinite' }}/>)}
      <style>{`@keyframes bl-pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )

  const TABS = [
    { key:'plan',     label:'Plan & Usage' },
    { key:'usage',    label:'Usage'        },
    { key:'invoices', label:'Invoices'     },
    { key:'upgrade',  label:'Upgrade'      },
  ]

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:1100, margin:'0 auto', background:BG, minHeight:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.025em' }}>Wallet & Billing</h1>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0' }}>Usage charges and plan management</p>
        </div>
        <div style={{ position:'relative' }}>
          <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}
            style={{ padding:'9px 36px 9px 14px', border:`1.5px solid ${BORD}`, borderRadius:10, fontSize:13, color:'#374151', background:'#fff', cursor:'pointer', fontFamily:'inherit', outline:'none', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%230EA5E9' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', minWidth:160 }}>
            {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
        <StatCard label="Total Amount" value={fmtINR(totals?.total_with_gst)} sub="incl. 18% GST" icon={IndianRupee} color={SKY}/>
        <StatCard label="Total Calls"  value={fmtInt(totals?.total_calls)}    sub="this period"   icon={Phone}      color="#10B981"/>
        <StatCard label="Total Minutes" value={fmt(totals?.total_minutes,1)} sub="minutes billed" icon={Clock}      color="#8B5CF6"/>
        <StatCard label="Rate / Min"   value={`₹${fmt(rate_per_min)}`}       sub="+18% GST"      icon={TrendingUp} color="#F59E0B"/>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${BORD}`, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'12px 20px', fontSize:13, fontWeight:tab===t.key?700:500,
            color:tab===t.key?SKY:'#6B7280',
            borderTop:'none', borderLeft:'none', borderRight:'none',
            borderBottom:tab===t.key?`2px solid ${SKY}`:'2px solid transparent',
            background:'none', cursor:'pointer', transition:'all .15s', fontFamily:'inherit',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PLAN & USAGE ── */}
      {tab==='plan' && usageSummary && (
        <>
          {/* Plan banner */}
          <Card style={{ padding:'20px 24px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:BG, color:SKY, border:`1px solid ${BORD}`, textTransform:'uppercase', letterSpacing:'.05em' }}>
                    {usageSummary.plan.name} Plan
                  </span>
                  {usageSummary.plan.id==='free' && <span style={{ fontSize:11, color:'#9CA3AF' }}>· Limited features</span>}
                </div>
                <p style={{ fontSize:13, color:'#64748B', margin:0 }}>
                  Rate: <strong style={{ color:'#0f172a' }}>₹{fmt(usageSummary.plan.rate_per_min)}/min</strong> + 18% GST · Billed from ringing
                </p>
              </div>
              <button onClick={()=>setTab('upgrade')}
                style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:GLOW, fontFamily:'inherit' }}>
                <Zap size={14}/> Upgrade Plan
              </button>
            </div>
          </Card>

          {/* Usage meters */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {/* Calls */}
            <Card style={{ padding:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>Calls This Month</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', margin:'3px 0 0' }}>Resets on 1st of each month</p>
                </div>
                <p style={{ fontSize:13, fontWeight:800, color:usageSummary.at_limit?.calls?'#EF4444':SKY }}>
                  {fmtInt(usageSummary.usage?.calls_this_month)}
                  {usageSummary.limits?.calls_per_month && ` / ${fmtInt(usageSummary.limits.calls_per_month)}`}
                </p>
              </div>
              {usageSummary.limits?.calls_per_month ? (
                <>
                  <PBar pct={usageSummary.percentages?.calls||0} warn={usageSummary.warnings?.calls} danger={usageSummary.at_limit?.calls}/>
                  {usageSummary.warnings?.calls && !usageSummary.at_limit?.calls && (
                    <p style={{ fontSize:11, color:'#F59E0B', fontWeight:600, marginTop:6 }}>⚠️ {usageSummary.percentages?.calls}% used — running low</p>
                  )}
                  {usageSummary.at_limit?.calls && (
                    <p style={{ fontSize:11, color:'#EF4444', fontWeight:600, marginTop:6 }}>⛔ Limit reached — upgrade to continue</p>
                  )}
                </>
              ) : <p style={{ fontSize:12, color:'#10B981', marginTop:8 }}>✅ Unlimited calls</p>}
            </Card>
            {/* Campaigns */}
            <Card style={{ padding:'20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>Total Campaigns</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', margin:'3px 0 0' }}>All campaigns in your account</p>
                </div>
                <p style={{ fontSize:13, fontWeight:800, color:usageSummary.at_limit?.campaigns?'#EF4444':SKY }}>
                  {fmtInt(usageSummary.usage?.campaigns_total)}
                  {usageSummary.limits?.campaigns_limit && ` / ${fmtInt(usageSummary.limits.campaigns_limit)}`}
                </p>
              </div>
              {usageSummary.limits?.campaigns_limit ? (
                <>
                  <PBar pct={usageSummary.percentages?.campaigns||0} warn={usageSummary.warnings?.campaigns} danger={usageSummary.at_limit?.campaigns}/>
                  {usageSummary.at_limit?.campaigns && (
                    <p style={{ fontSize:11, color:'#EF4444', fontWeight:600, marginTop:6 }}>⛔ Limit reached — upgrade to create more</p>
                  )}
                </>
              ) : <p style={{ fontSize:12, color:'#10B981', marginTop:8 }}>✅ Unlimited campaigns</p>}
            </Card>
          </div>
        </>
      )}

      {/* ── USAGE TAB ── */}
      {tab==='usage' && (
        <>
          <Section title="Monthly Trend" sub="Call volume per month">
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${BG}` }}>
                    {['Month','Calls','Minutes','Amount (excl. GST)','GST','Total'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.length===0 ? (
                    <tr><td colSpan={6} style={{ padding:'32px', textAlign:'center', color:BORD, fontSize:13 }}>No usage data yet</td></tr>
                  ) : monthly.map((m,i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${BG}`, transition:'background .15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background=BG} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{ padding:'12px 16px', fontWeight:600, color:'#0f172a' }}>{m.month_label||m.month}</td>
                      <td style={{ padding:'12px 16px', color:'#374151' }}>{fmtInt(m.total_calls)}</td>
                      <td style={{ padding:'12px 16px', color:'#374151' }}>{fmt(m.total_minutes,1)}</td>
                      <td style={{ padding:'12px 16px', color:'#374151' }}>{fmtINR(m.subtotal)}</td>
                      <td style={{ padding:'12px 16px', color:'#374151' }}>{fmtINR(m.gst)}</td>
                      <td style={{ padding:'12px 16px', fontWeight:700, color:SKY }}>{fmtINR(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Daily Activity" sub="Calls per day this month">
            <MiniBar data={activity}/>
          </Section>

          <Section title="Campaign Breakdown" sub={`Charges for ${selectedMonth}`}>
            {campaigns.length===0 ? (
              <p style={{ fontSize:13, color:BORD, textAlign:'center', padding:'24px' }}>No campaigns with charges for this period</p>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${BG}` }}>
                      {['Campaign','Calls','Minutes','Amount'].map(h => (
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c,i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${BG}`, transition:'background .15s' }}
                        onMouseEnter={e=>e.currentTarget.style.background=BG} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={{ padding:'12px 16px', fontWeight:600, color:'#0f172a' }}>{c.name}</td>
                        <td style={{ padding:'12px 16px', color:'#374151' }}>{fmtInt(c.total_calls)}</td>
                        <td style={{ padding:'12px 16px', color:'#374151' }}>{fmt(c.total_minutes,1)}</td>
                        <td style={{ padding:'12px 16px', fontWeight:700, color:SKY }}>{fmtINR(c.total_with_gst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}

      {/* ── INVOICES TAB ── */}
      {tab==='invoices' && (
        <>
          {/* Generate */}
          <Card style={{ padding:'20px 22px', marginBottom:14 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:'0 0 14px' }}>Generate Invoice</h3>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <select value={genMonth} onChange={e=>setGenMonth(e.target.value)}
                style={{ padding:'9px 32px 9px 14px', border:`1.5px solid ${BORD}`, borderRadius:10, fontSize:13, color:'#374151', background:'#fff', cursor:'pointer', fontFamily:'inherit', outline:'none', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%230EA5E9' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', minWidth:160 }}>
                <option value="">Select month...</option>
                {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <button onClick={async()=>{
                if(!genMonth) return toast.error('Select a month first')
                setGenerating(true)
                try { await billingApi.generateInvoice(genMonth); toast.success('Invoice generated'); const inv=await billingApi.invoices(); setInvoices(inv.data.invoices||[]) }
                catch(err) { toast.error(err.response?.data?.error||'Failed to generate') }
                finally { setGenerating(false) }
              }} disabled={generating||!genMonth}
                style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:generating||!genMonth?'not-allowed':'pointer', boxShadow:GLOW, fontFamily:'inherit', opacity:!genMonth?0.5:1 }}>
                <Receipt size={14}/> {generating?'Generating...':'Generate'}
              </button>
            </div>
          </Card>

          <Section title="Invoice History" sub="All generated invoices">
            {invoices.length===0 ? (
              <div style={{ textAlign:'center', padding:'32px' }}>
                <Receipt size={28} color={BORD} style={{ display:'block', margin:'0 auto 12px' }}/>
                <p style={{ fontSize:14, fontWeight:600, color:'#374151', margin:'0 0 4px' }}>No invoices yet</p>
                <p style={{ fontSize:12, color:'#9CA3AF', margin:0 }}>Generate your first invoice above</p>
              </div>
            ) : invoices.map((inv,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:`1px solid ${BG}` }}>
                <div style={{ width:38, height:38, borderRadius:11, background:BG, border:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Receipt size={16} color={SKY}/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>{inv.month_label||inv.month}</p>
                  <p style={{ fontSize:11, color:'#9CA3AF', margin:'2px 0 0' }}>Generated {new Date(inv.generated_at).toLocaleDateString('en-IN')}</p>
                </div>
                <p style={{ fontSize:14, fontWeight:800, color:SKY }}>{fmtINR(inv.total_with_gst)}</p>
                <a href={billingApi.downloadInvoice(inv.id)} target="_blank" rel="noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:`1px solid ${BORD}`, background:BG, color:SKY, fontWeight:600, fontSize:12, textDecoration:'none', transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=SKY;e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor=SKY}}
                  onMouseLeave={e=>{e.currentTarget.style.background=BG;e.currentTarget.style.color=SKY;e.currentTarget.style.borderColor=BORD}}>
                  <Download size={13}/> PDF
                </a>
              </div>
            ))}
          </Section>
        </>
      )}

      {/* ── UPGRADE TAB ── */}
      {tab==='upgrade' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
          {plans.length===0 ? (
            <p style={{ fontSize:13, color:'#9CA3AF', padding:'32px', textAlign:'center', gridColumn:'1/-1' }}>No plans available</p>
          ) : plans.map(plan => {
            const isCurrent = usageSummary?.plan?.id === plan.id
            const isPopular = plan.popular
            return (
              <div key={plan.id} style={{ background:'#fff', borderRadius:18, border:`2px solid ${isCurrent?SKY:isPopular?SKYL:BORD}`, padding:'28px 24px', position:'relative', transition:'all .2s', boxShadow:isCurrent?GLOW:'none' }}
                onMouseEnter={e=>{if(!isCurrent)e.currentTarget.style.borderColor=SKY}}
                onMouseLeave={e=>{if(!isCurrent)e.currentTarget.style.borderColor=isPopular?SKYL:BORD}}>
                {isPopular && !isCurrent && (
                  <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', padding:'4px 16px', borderRadius:99, background:GRAD, color:'#fff', fontSize:11, fontWeight:700, whiteSpace:'nowrap', boxShadow:GLOW }}>
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', padding:'4px 16px', borderRadius:99, background:'#ECFDF5', color:'#065F46', fontSize:11, fontWeight:700, border:'1px solid #A7F3D0', whiteSpace:'nowrap' }}>
                    ✅ Current Plan
                  </div>
                )}
                <h3 style={{ fontSize:17, fontWeight:800, color:'#0f172a', margin:'0 0 6px' }}>{plan.name}</h3>
                <p style={{ fontSize:28, fontWeight:900, color:isCurrent?SKY:'#0f172a', margin:'0 0 4px', letterSpacing:'-0.03em' }}>
                  {plan.price_monthly ? `₹${Number(plan.price_monthly).toLocaleString('en-IN')}` : 'Free'}
                  {plan.price_monthly && <span style={{ fontSize:13, fontWeight:500, color:'#9CA3AF' }}>/month</span>}
                </p>
                <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 20px' }}>₹{fmt(plan.rate_per_min)}/min + 18% GST</p>
                <div style={{ borderTop:`1px solid ${BG}`, paddingTop:16, marginBottom:20 }}>
                  {[
                    plan.calls_per_month ? `${fmtInt(plan.calls_per_month)} calls/month` : 'Unlimited calls',
                    plan.campaigns_limit ? `${plan.campaigns_limit} campaigns` : 'Unlimited campaigns',
                    `${plan.contacts_per_campaign||'Unlimited'} contacts/campaign`,
                    `${plan.team_members_limit||'Unlimited'} team members`,
                  ].map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', background:BG, border:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Check size={10} color={SKY}/>
                      </div>
                      <span style={{ fontSize:13, color:'#374151' }}>{f}</span>
                    </div>
                  ))}
                </div>
                {!isCurrent && (
                  <button onClick={async()=>{
                    setUpgrading(plan.id)
                    try { await billingApi.upgrade(plan.id); const us=await billingApi.usageSummary(); setUsageSummary(us.data); toast.success(`Upgraded to ${plan.name}!`); setTab('plan') }
                    catch(err) { toast.error(err.response?.data?.error||'Upgrade failed') }
                    finally { setUpgrading(null) }
                  }} disabled={upgrading===plan.id}
                    style={{ width:'100%', padding:'12px', borderRadius:11, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:14, cursor:upgrading===plan.id?'not-allowed':'pointer', boxShadow:GLOW, fontFamily:'inherit', transition:'all .15s' }}>
                    {upgrading===plan.id ? 'Upgrading...' : `Switch to ${plan.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
