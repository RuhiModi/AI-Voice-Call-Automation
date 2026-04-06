import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, Clock,
  CheckCircle2, AlertTriangle, RefreshCw, ChevronRight,
  IndianRupee, Phone, TrendingDown, Copy, X, Receipt,
  ShieldCheck, Zap, Info
} from 'lucide-react'

const API  = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const SKY  = '#0EA5E9'
const SKYD = '#0284C7'
const GRAD = 'linear-gradient(135deg,#38BDF8 0%,#0EA5E9 50%,#0284C7 100%)'
const BG   = '#F0F9FF'
const BORD = '#BAE6FD'
const GLOW = '0 4px 20px rgba(14,165,233,.25)'
const MIN  = 500  // ₹500 minimum top-up

// ── Helpers ───────────────────────────────────────────────────
const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
const fmtInt = n => Number(n||0).toLocaleString('en-IN')
const fmtTime = iso => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

// ── Top-up modal ──────────────────────────────────────────────
const PRESETS = [500, 1000, 2000, 5000]

function TopupModal({ onClose, onSuccess }) {
  const [amount,    setAmount]  = useState('')
  const [custom,    setCustom]  = useState(false)
  const [loading,   setLoading] = useState(false)
  const [step,      setStep]    = useState('select') // select | confirm | success

  const numAmount = parseFloat(amount) || 0
  const gst       = numAmount * 0.18
  const total     = numAmount + gst
  const valid     = numAmount >= MIN

  async function handlePay() {
    if (!valid) return toast.error(`Minimum top-up is ${fmtINR(MIN)}`)
    setLoading(true)
    try {
      // In production: open Razorpay here. For now → demo instant credit.
      await axios.post(`${API}/wallet/recharge`, { amount: numAmount }, { headers: authHeaders() })
      setStep('success')
      toast.success(`${fmtINR(numAmount)} added to your wallet! 🎉`)
      setTimeout(() => { onSuccess(); onClose() }, 2200)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Top-up failed. Please try again.')
    } finally { setLoading(false) }
  }

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'rgba(7,89,133,.45)', backdropFilter:'blur(8px)' }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:22, width:'100%', maxWidth:440, boxShadow:'0 24px 80px rgba(14,165,233,.20)', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:GRAD, padding:'22px 24px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <Wallet size={18} color="#fff"/>
                <h2 style={{ fontSize:17, fontWeight:800, color:'#fff', margin:0 }}>Add Money to Wallet</h2>
              </div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.65)', margin:0 }}>Minimum top-up: {fmtINR(MIN)} · 18% GST applicable</p>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,.15)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <X size={14} color="#fff"/>
            </button>
          </div>
        </div>

        <div style={{ padding:'24px' }}>
          {step === 'success' ? (
            /* Success state */
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'#ECFDF5', border:'3px solid #A7F3D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                <CheckCircle2 size={36} color="#10B981"/>
              </div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'#0f172a', margin:'0 0 8px' }}>Payment Successful!</h3>
              <p style={{ fontSize:14, color:'#9CA3AF', margin:0 }}>{fmtINR(numAmount)} has been added to your wallet</p>
            </div>
          ) : step === 'confirm' ? (
            /* Confirm step */
            <>
              <div style={{ background:BG, borderRadius:14, border:`1px solid ${BORD}`, padding:'16px 18px', marginBottom:20 }}>
                <h4 style={{ fontSize:13, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 14px' }}>Payment Summary</h4>
                {[
                  ['Top-up Amount', fmtINR(numAmount), '#0f172a'],
                  ['GST @ 18%',     fmtINR(gst),       '#9CA3AF'],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, fontSize:14, color:c }}>
                    <span>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop:`1.5px solid ${BORD}`, paddingTop:12, marginTop:4, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>Total Payable</span>
                  <span style={{ fontSize:20, fontWeight:900, color:SKY }}>{fmtINR(total)}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep('select')} style={{ flex:1, padding:'12px', borderRadius:11, border:`1.5px solid ${BORD}`, background:'#fff', color:'#374151', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  Back
                </button>
                <button onClick={handlePay} disabled={loading}
                  style={{ flex:2, padding:'12px', borderRadius:11, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:14, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', boxShadow:GLOW, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {loading ? (
                    <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'bl-spin .7s linear infinite' }}/>
                  ) : <><ShieldCheck size={16}/>Pay {fmtINR(total)}</>}
                </button>
              </div>
              <p style={{ fontSize:11, color:'#D1D5DB', textAlign:'center', marginTop:12 }}>
                🔒 Secured by Razorpay · Your payment info is never stored
              </p>
            </>
          ) : (
            /* Select amount */
            <>
              {/* Preset amounts */}
              <p style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>Select amount</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
                {PRESETS.map(p => (
                  <button key={p} onClick={() => { setAmount(String(p)); setCustom(false) }}
                    style={{
                      padding:'12px 8px', borderRadius:12, border:`1.5px solid ${amount===String(p)&&!custom?SKY:BORD}`,
                      background:amount===String(p)&&!custom?BG:'#fff',
                      color:amount===String(p)&&!custom?SKY:'#374151',
                      fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit',
                      boxShadow:amount===String(p)&&!custom?`0 0 0 3px rgba(14,165,233,.12)`:'none',
                      transition:'all .15s',
                    }}>
                    ₹{fmtInt(p)}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#9CA3AF', marginBottom:8 }}>
                  Or enter custom amount
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:18, fontWeight:700, color:'#9CA3AF' }}>₹</span>
                  <input
                    type="number" min={MIN} step="100"
                    value={custom ? amount : ''}
                    placeholder={`${MIN} minimum`}
                    onFocus={() => setCustom(true)}
                    onChange={e => { setCustom(true); setAmount(e.target.value) }}
                    style={{
                      width:'100%', padding:'13px 14px 13px 32px', border:`1.5px solid ${custom?SKY:BORD}`,
                      borderRadius:12, fontSize:16, fontWeight:700, color:'#0f172a',
                      background:'#fff', fontFamily:'inherit', boxSizing:'border-box', outline:'none',
                      boxShadow:custom?`0 0 0 3px rgba(14,165,233,.10)`:'none', transition:'all .15s',
                    }}
                  />
                </div>
                {numAmount > 0 && numAmount < MIN && (
                  <p style={{ fontSize:11, color:'#EF4444', marginTop:6, display:'flex', alignItems:'center', gap:4 }}>
                    <AlertTriangle size={11}/> Minimum top-up is {fmtINR(MIN)}
                  </p>
                )}
              </div>

              {/* GST preview */}
              {numAmount >= MIN && (
                <div style={{ background:BG, borderRadius:10, border:`1px solid ${BORD}`, padding:'12px 14px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'#64748B' }}>You'll pay (incl. 18% GST)</span>
                  <span style={{ fontSize:16, fontWeight:800, color:SKY }}>{fmtINR(total)}</span>
                </div>
              )}

              <button onClick={() => valid && setStep('confirm')} disabled={!valid}
                style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:valid?GRAD:'#F3F4F6', color:valid?'#fff':'#9CA3AF', fontWeight:700, fontSize:15, cursor:valid?'pointer':'not-allowed', fontFamily:'inherit', boxShadow:valid?GLOW:'none', transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Zap size={16}/> Proceed to Pay
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginTop:14 }}>
                <ShieldCheck size={12} color="#9CA3AF"/>
                <span style={{ fontSize:11, color:'#9CA3AF' }}>Secured by Razorpay · GST Invoice provided</span>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes bl-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Transaction row ───────────────────────────────────────────
function TxnRow({ txn }) {
  const isCredit = txn.type === 'credit' || txn.amount > 0
  const ic = isCredit
    ? { Icon:ArrowDownLeft, color:'#10B981', bg:'#ECFDF5', sign:'+' }
    : { Icon:ArrowUpRight,  color:'#EF4444', bg:'#FEF2F2', sign:'-' }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:`1px solid ${BG}` }}>
      <div style={{ width:38, height:38, borderRadius:11, background:ic.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <ic.Icon size={17} color={ic.color}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:14, fontWeight:600, color:'#0f172a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {txn.description || (isCredit ? 'Wallet Top-up' : 'Call Charges')}
        </p>
        <p style={{ fontSize:11, color:'#9CA3AF', margin:'2px 0 0' }}>{fmtTime(txn.created_at)}</p>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ fontSize:15, fontWeight:800, color:ic.color, margin:0, letterSpacing:'-0.02em' }}>
          {ic.sign}{fmtINR(Math.abs(txn.amount))}
        </p>
        {txn.balance_after !== undefined && (
          <p style={{ fontSize:10, color:'#9CA3AF', margin:'2px 0 0' }}>Bal: {fmtINR(txn.balance_after)}</p>
        )}
      </div>
    </div>
  )
}

// ── Recharge history row ──────────────────────────────────────
function RechargeRow({ r }) {
  const statusMap = {
    completed: { label:'Success',  color:'#10B981', bg:'#ECFDF5' },
    pending:   { label:'Pending',  color:'#F59E0B', bg:'#FFFBEB' },
    failed:    { label:'Failed',   color:'#EF4444', bg:'#FEF2F2' },
  }
  const s = statusMap[r.status] || statusMap.pending
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:`1px solid ${BG}` }}>
      <div style={{ width:38, height:38, borderRadius:11, background:BG, border:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Receipt size={17} color={SKY}/>
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:14, fontWeight:600, color:'#0f172a', margin:0 }}>{fmtINR(r.amount)}</p>
        <p style={{ fontSize:11, color:'#9CA3AF', margin:'2px 0 0' }}>{fmtTime(r.created_at)}</p>
      </div>
      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:s.bg, color:s.color }}>{s.label}</span>
    </div>
  )
}

// ── Main Wallet Page ──────────────────────────────────────────
export default function Billing() {
  const [wallet,   setWallet]   = useState(null)
  const [txns,     setTxns]     = useState([])
  const [recharge, setRecharge] = useState([])
  const [daily,    setDaily]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('transactions')
  const [showTopup,setShowTopup]= useState(false)
  const [refreshing,setRefreshing]=useState(false)

  const load = useCallback(async () => {
    try {
      const [w, t, r, d] = await Promise.all([
        axios.get(`${API}/wallet`,                  { headers:authHeaders() }),
        axios.get(`${API}/wallet/transactions`,     { headers:authHeaders() }),
        axios.get(`${API}/wallet/recharge-history`, { headers:authHeaders() }),
        axios.get(`${API}/wallet/daily-spend`,      { headers:authHeaders() }),
      ])
      setWallet(w.data)
      setTxns(t.data.transactions || t.data || [])
      setRecharge(r.data.requests || r.data || [])
      setDaily(d.data.days || d.data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load wallet data')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function refresh() { setRefreshing(true); load() }

  const balance    = parseFloat(wallet?.wallet_balance || 0)
  const recharged  = parseFloat(wallet?.total_recharged || 0)
  const spent      = parseFloat(wallet?.total_spent || 0)
  const ratePerMin = wallet?.rate_per_min || 0
  const callsLeft  = ratePerMin > 0 ? Math.floor(balance / ratePerMin) : '∞'

  const isLow    = balance < 100
  const isDanger = balance < 20

  // Sparkline data from daily spend
  const maxSpend = Math.max(...daily.map(d => d.amount || 0), 1)

  const TABS = [
    { key:'transactions', label:'Transactions', count:txns.length },
    { key:'recharges',    label:'Top-up History', count:recharge.length },
    { key:'usage',        label:'Usage Trend', count:null },
  ]

  if (loading) return (
    <div style={{ padding:'24px 28px', background:BG, minHeight:'100%' }}>
      {[1,2,3].map(i => <div key={i} style={{ height:100, background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, marginBottom:14, animation:'bl-ld 1.4s ease infinite' }}/>)}
      <style>{`@keyframes bl-ld{0%,100%{opacity:1}50%{opacity:.5}} @keyframes bl-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:1000, margin:'0 auto', background:BG, minHeight:'100%' }}>
      <style>{`@keyframes bl-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes bl-ping{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.025em' }}>Wallet</h1>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0' }}>Prepaid balance for AI voice calls</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={refresh} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${BORD}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <RefreshCw size={14} color={SKY} style={{ animation:refreshing?'bl-spin 1s linear infinite':'none' }}/>
          </button>
          <button onClick={() => setShowTopup(true)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:GLOW, fontFamily:'inherit', transition:'all .15s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 6px 28px rgba(14,165,233,.40)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=GLOW}>
            <Plus size={14}/> Add Money
          </button>
        </div>
      </div>

      {/* Low balance warning */}
      {isLow && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderRadius:14, background:isDanger?'#FEF2F2':'#FFFBEB', border:`1px solid ${isDanger?'#FECACA':'#FDE68A'}`, marginBottom:20, cursor:'pointer' }}
          onClick={() => setShowTopup(true)}>
          <AlertTriangle size={18} color={isDanger?'#EF4444':'#F59E0B'} style={{ flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, fontWeight:700, color:isDanger?'#991B1B':'#92400E', margin:0 }}>
              {isDanger ? 'Critical: Balance nearly exhausted — calls will stop!' : 'Low balance — top up to keep campaigns running'}
            </p>
            <p style={{ fontSize:12, color:isDanger?'#EF4444':'#F59E0B', margin:'2px 0 0' }}>
              Current balance: {fmtINR(balance)}
            </p>
          </div>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, background:isDanger?'#EF4444':'#F59E0B', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 }}>
            <Plus size={13}/> Add Money
          </span>
        </div>
      )}

      {/* Main balance card */}
      <div style={{ borderRadius:20, background:GRAD, padding:'28px 32px', marginBottom:16, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, right:80, width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <Wallet size={16} color="rgba(255,255,255,.7)"/>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Available Balance</span>
            </div>
            <p style={{ fontSize:46, fontWeight:900, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.04em', lineHeight:1 }}>
              {fmtINR(balance)}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Phone size={12} color="rgba(255,255,255,.55)"/>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.55)' }}>
                ~{typeof callsLeft==='number' ? callsLeft.toLocaleString('en-IN') : callsLeft} calls remaining
                {ratePerMin > 0 && ` at ₹${ratePerMin}/min`}
              </span>
            </div>
          </div>
          <button onClick={() => setShowTopup(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 24px', borderRadius:12, border:'2px solid rgba(255,255,255,.35)', background:'rgba(255,255,255,.15)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', transition:'all .2s', backdropFilter:'blur(4px)' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.25)';e.currentTarget.style.borderColor='rgba(255,255,255,.55)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.15)';e.currentTarget.style.borderColor='rgba(255,255,255,.35)'}}>
            <Plus size={16}/> Add Money
          </button>
        </div>
      </div>

      {/* Stat pills */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:22 }}>
        {[
          { icon:ArrowDownLeft, label:'Total Recharged', value:fmtINR(recharged), color:'#10B981', bg:'#ECFDF5' },
          { icon:ArrowUpRight,  label:'Total Spent',     value:fmtINR(spent),     color:'#EF4444', bg:'#FEF2F2' },
          { icon:Phone,         label:'Rate per Min',    value:ratePerMin?`₹${ratePerMin}/min`:'—', color:SKY,   bg:BG  },
        ].map(({ icon:Icon, label, value, color, bg }) => (
          <div key={label} style={{ background:'#fff', borderRadius:14, border:`1px solid ${BORD}`, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:bg, border:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={14} color={color}/>
              </div>
              <span style={{ fontSize:11, color:'#9CA3AF', fontWeight:600 }}>{label}</span>
            </div>
            <p style={{ fontSize:20, fontWeight:800, color, margin:0, letterSpacing:'-0.02em' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* How it works banner */}
      <div style={{ background:'#fff', borderRadius:14, border:`1px solid ${BORD}`, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
        <Info size={16} color={SKY} style={{ flexShrink:0 }}/>
        <p style={{ fontSize:13, color:'#64748B', margin:0 }}>
          <strong style={{ color:'#0f172a' }}>How it works:</strong> Add money to your wallet (min ₹500) → your campaigns deduct balance per call at ₹{ratePerMin || 'X'}/min + 18% GST. Balance never expires.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${BORD}`, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'12px 20px', fontSize:13, fontWeight:tab===t.key?700:500,
            color:tab===t.key?SKY:'#6B7280',
            borderTop:'none', borderLeft:'none', borderRight:'none',
            borderBottom:tab===t.key?`2px solid ${SKY}`:'2px solid transparent',
            background:'none', cursor:'pointer', transition:'all .15s', fontFamily:'inherit',
            display:'flex', alignItems:'center', gap:7,
          }}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:tab===t.key?BG:'#F3F4F6', color:tab===t.key?SKY:'#9CA3AF' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:`1px solid ${BG}` }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>All Transactions</h3>
          </div>
          <div style={{ padding:'0 22px' }}>
            {txns.length === 0 ? (
              <div style={{ padding:'48px 0', textAlign:'center' }}>
                <Clock size={28} color={BORD} style={{ display:'block', margin:'0 auto 12px' }}/>
                <p style={{ fontSize:14, fontWeight:600, color:'#374151', margin:'0 0 4px' }}>No transactions yet</p>
                <p style={{ fontSize:12, color:'#9CA3AF', margin:0 }}>Add money to get started</p>
              </div>
            ) : txns.map((t, i) => <TxnRow key={t.id || i} txn={t}/>)}
          </div>
        </div>
      )}

      {/* Recharge history tab */}
      {tab === 'recharges' && (
        <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:`1px solid ${BG}` }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>Top-up History</h3>
          </div>
          <div style={{ padding:'0 22px' }}>
            {recharge.length === 0 ? (
              <div style={{ padding:'48px 0', textAlign:'center' }}>
                <Wallet size={28} color={BORD} style={{ display:'block', margin:'0 auto 12px' }}/>
                <p style={{ fontSize:14, fontWeight:600, color:'#374151', margin:'0 0 4px' }}>No top-ups yet</p>
                <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 20px' }}>Add money to your wallet to get started</p>
                <button onClick={() => setShowTopup(true)}
                  style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', boxShadow:GLOW }}>
                  <Plus size={14}/> Add Money
                </button>
              </div>
            ) : recharge.map((r, i) => <RechargeRow key={r.id || i} r={r}/>)}
          </div>
        </div>
      )}

      {/* Usage trend tab */}
      {tab === 'usage' && (
        <div style={{ background:'#fff', borderRadius:16, border:`1px solid ${BORD}`, overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:`1px solid ${BG}` }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:0 }}>30-Day Spend Trend</h3>
          </div>
          <div style={{ padding:'20px 22px' }}>
            {daily.length === 0 ? (
              <div style={{ padding:'32px 0', textAlign:'center' }}>
                <TrendingDown size={28} color={BORD} style={{ display:'block', margin:'0 auto 12px' }}/>
                <p style={{ fontSize:13, color:'#9CA3AF' }}>No usage data yet</p>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100, marginBottom:12 }}>
                  {daily.map((d, i) => {
                    const h = Math.max(4, ((d.amount || 0) / maxSpend) * 90)
                    return (
                      <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <div title={`${fmtINR(d.amount || 0)}`}
                          style={{ width:'100%', height:h, borderRadius:'3px 3px 0 0', background:h>20?GRAD:BG, border:`1px solid ${BORD}`, cursor:'pointer', transition:'opacity .15s' }}
                          onMouseEnter={e=>e.currentTarget.style.opacity='.75'}
                          onMouseLeave={e=>e.currentTarget.style.opacity='1'}
                        />
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#9CA3AF' }}>
                  <span>{daily[0]?.date ? new Date(daily[0].date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : 'Day 1'}</span>
                  <span>Today</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:20 }}>
                  {[
                    ['Total Spent', fmtINR(daily.reduce((s,d) => s+(d.amount||0), 0))],
                    ['Avg/Day',     fmtINR(daily.reduce((s,d) => s+(d.amount||0), 0) / (daily.length||1))],
                    ['Peak Day',    fmtINR(maxSpend)],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background:BG, borderRadius:12, padding:'12px', textAlign:'center', border:`1px solid ${BORD}` }}>
                      <p style={{ fontSize:10, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 5px' }}>{l}</p>
                      <p style={{ fontSize:18, fontWeight:800, color:SKY, margin:0, letterSpacing:'-0.02em' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top-up modal */}
      {showTopup && (
        <TopupModal
          onClose={() => setShowTopup(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
