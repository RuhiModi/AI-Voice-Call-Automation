import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, Clock,
  TrendingDown, IndianRupee, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, Zap, Phone, BarChart2,
  ChevronRight, Info, Shield
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const MIN_RECHARGE = 500

function api(path, opts = {}) {
  const token = localStorage.getItem('token')
  return axios({ url: API + path, headers: { Authorization: `Bearer ${token}` }, ...opts })
    .then(r => r.data)
}

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtShortDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Stat chip ──────────────────────────────────────────────────
function Chip({ icon: Icon, label, value, color = '#6366f1' }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #f0f0f0', borderRadius: 16,
      padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.03em', fontFamily: '"DM Serif Display", serif' }}>{value}</p>
      </div>
    </div>
  )
}

// ── Transaction row ─────────────────────────────────────────────
function TxRow({ tx }) {
  const isCredit = tx.type === 'recharge' || tx.type === 'refund' || tx.type === 'adjustment'
  const meta = {
    recharge:   { icon: ArrowDownLeft, label: 'Wallet recharge', color: '#10b981' },
    deduct:     { icon: ArrowUpRight,  label: 'Call deduction',  color: '#f43f5e' },
    refund:     { icon: ArrowDownLeft, label: 'Refund',          color: '#10b981' },
    adjustment: { icon: ArrowDownLeft, label: 'Adjustment',      color: '#f59e0b' },
  }[tx.type] || { icon: ArrowUpRight, label: tx.type, color: '#6b7280' }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '44px 1fr auto auto', alignItems: 'center',
      gap: 14, padding: '14px 0', borderBottom: '1px solid #f9fafb',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <meta.icon size={16} color={meta.color} />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 2 }}>
          {tx.description || meta.label}
        </p>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(tx.created_at)}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: isCredit ? '#10b981' : '#f43f5e' }}>
          {isCredit ? '+' : '-'}{fmtINR(tx.amount)}
        </p>
      </div>
      <div style={{ textAlign: 'right', minWidth: 90 }}>
        <p style={{ fontSize: 11, color: '#9ca3af' }}>Bal: {fmtINR(tx.balance_after)}</p>
      </div>
    </div>
  )
}

// ── Mini spend bar chart ────────────────────────────────────────
function SpendChart({ data }) {
  if (!data?.length) return (
    <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: 13 }}>
      No spending data yet
    </div>
  )
  const max = Math.max(...data.map(d => parseFloat(d.amount)), 0.01)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          title={`${fmtShortDate(d.day)}: ${fmtINR(d.amount)} · ${d.calls} calls`}>
          <div style={{
            width: '100%', borderRadius: 3,
            height: Math.max(4, (parseFloat(d.amount) / max) * 72),
            background: parseFloat(d.amount) > 0
              ? `linear-gradient(to top, #6366f1, #818cf8)` : '#f3f4f6',
            minHeight: 4,
            transition: 'all 0.3s',
          }} />
        </div>
      ))}
    </div>
  )
}

// ── Recharge modal ─────────────────────────────────────────────
function RechargeModal({ onClose, onSuccess, rate }) {
  const PRESETS = [500, 1000, 2000, 5000]
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const num = parseFloat(amount) || 0
  const gst = Math.round(num * 0.18 * 100) / 100
  const total = Math.round((num + gst) * 100) / 100
  const estimatedMins = rate > 0 ? Math.floor(num / rate) : 0

  async function submit() {
    if (num < MIN_RECHARGE) {
      toast.error(`Minimum recharge is ₹${MIN_RECHARGE}`)
      return
    }
    setLoading(true)
    try {
      const res = await api('/wallet/recharge', { method: 'POST', data: { amount: num } })
      toast.success(res.message || 'Wallet recharged!')
      onSuccess(res.new_balance)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Recharge failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: 32, maxWidth: 440, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#6366f115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={22} color="#6366f1" />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>Add Money</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Minimum ₹{MIN_RECHARGE}</p>
          </div>
        </div>

        {/* Preset buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {PRESETS.map(p => (
            <button key={p}
              onClick={() => setAmount(String(p))}
              style={{
                padding: '10px 0', borderRadius: 10, border: '2px solid',
                borderColor: num === p ? '#6366f1' : '#f0f0f0',
                background: num === p ? '#6366f110' : '#fff',
                color: num === p ? '#6366f1' : '#374151',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              ₹{p.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#6b7280', fontWeight: 700 }}>₹</span>
          <input
            ref={inputRef}
            type="number" min={MIN_RECHARGE} step="100"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Enter amount (min ₹${MIN_RECHARGE})`}
            style={{
              width: '100%', padding: '14px 16px 14px 36px', borderRadius: 12,
              border: '2px solid #f0f0f0', fontSize: 16, fontWeight: 600, color: '#111',
              outline: 'none', boxSizing: 'border-box',
              background: '#fafafa',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#f0f0f0'}
          />
        </div>

        {/* Breakup */}
        {num > 0 && (
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#6b7280' }}>Amount</span>
              <span style={{ fontWeight: 600, color: '#111' }}>{fmtINR(num)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#6b7280' }}>GST @ 18%</span>
              <span style={{ fontWeight: 600, color: '#6b7280' }}>{fmtINR(gst)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
              <span style={{ fontWeight: 700, color: '#111' }}>Total Payable</span>
              <span style={{ fontWeight: 800, color: '#6366f1' }}>{fmtINR(total)}</span>
            </div>
            {estimatedMins > 0 && (
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                ≈ {estimatedMins.toLocaleString('en-IN')} minutes of calling at ₹{rate}/min
              </p>
            )}
          </div>
        )}

        {/* Info */}
        <div style={{ display: 'flex', gap: 8, background: '#fffbeb', borderRadius: 10, padding: '10px 12px', marginBottom: 20 }}>
          <Shield size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
            Funds are added instantly. Balance is non-refundable once used.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '13px 0', borderRadius: 12, border: '2px solid #f0f0f0',
            background: '#fff', color: '#6b7280', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={submit} disabled={loading || num < MIN_RECHARGE} style={{
            flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
            background: num >= MIN_RECHARGE ? '#6366f1' : '#e5e7eb',
            color: num >= MIN_RECHARGE ? '#fff' : '#9ca3af',
            fontWeight: 700, fontSize: 14, cursor: num >= MIN_RECHARGE ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}>
            {loading ? 'Processing...' : `Pay ${num >= MIN_RECHARGE ? fmtINR(total) : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function Billing() {
  const [wallet,      setWallet]      = useState(null)
  const [txns,        setTxns]        = useState([])
  const [dailySpend,  setDailySpend]  = useState([])
  const [recharges,   setRecharges]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [activeTab,   setActiveTab]   = useState('transactions') // transactions | recharges

  async function loadAll() {
    setLoading(true)
    try {
      const [w, t, d, r] = await Promise.all([
        api('/wallet'),
        api('/wallet/transactions?limit=50'),
        api('/wallet/daily-spend?days=30'),
        api('/wallet/recharge-history'),
      ])
      setWallet(w)
      setTxns(t)
      setDailySpend(d)
      setRecharges(r)
    } catch (e) {
      toast.error('Failed to load wallet data')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  function onRechargeSuccess(newBalance) {
    setShowModal(false)
    setWallet(prev => ({ ...prev, wallet_balance: newBalance }))
    loadAll()
  }

  const balance = parseFloat(wallet?.wallet_balance || 0)
  const rate    = parseFloat(wallet?.rate_per_min || 1)
  const estimatedMins = rate > 0 ? Math.floor(balance / rate) : 0
  const isLow   = balance < 100
  const isDanger = balance < 20

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-0.03em', fontFamily: '"DM Serif Display", serif' }}>
            Wallet
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Prepaid balance for your voice calls</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
          borderRadius: 12, background: '#6366f1', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          <Plus size={16} /> Add Money
        </button>
      </div>

      {/* ── Wallet card ── */}
      <div style={{
        borderRadius: 24,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        padding: '32px 36px', marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Available Balance
            </p>
            {loading ? (
              <div style={{ width: 180, height: 52, background: 'rgba(255,255,255,0.1)', borderRadius: 8 }} />
            ) : (
              <p style={{
                fontSize: 52, fontWeight: 900, color: isDanger ? '#fca5a5' : isLow ? '#fde68a' : '#fff',
                margin: '0 0 4px', letterSpacing: '-0.04em', fontFamily: '"DM Serif Display", serif',
              }}>
                {fmtINR(balance)}
              </p>
            )}
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              ≈ {estimatedMins.toLocaleString('en-IN')} min remaining · ₹{rate}/min
            </p>

            {isDanger && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, background: 'rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', width: 'fit-content' }}>
                <AlertTriangle size={14} color="#fca5a5" />
                <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>Low balance — calls may stop soon</span>
              </div>
            )}
            {!isDanger && isLow && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, background: 'rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', width: 'fit-content' }}>
                <AlertTriangle size={14} color="#fde68a" />
                <span style={{ color: '#fde68a', fontSize: 12, fontWeight: 600 }}>Balance running low</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <button onClick={() => setShowModal(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px',
              borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
            }}>
              <Plus size={15} /> Add Money
            </button>
            <button onClick={loadAll} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
              borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer',
            }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { label: 'Total Recharged', value: fmtINR(wallet?.total_recharged) },
            { label: 'Total Spent',     value: fmtINR(wallet?.total_spent)     },
            { label: 'Calls Today',     value: wallet?.stats?.calls_today || 0 },
          ].map(s => (
            <div key={s.label}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: '"DM Serif Display", serif' }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <Chip icon={Phone}     label="Total Calls"   value={Number(wallet?.stats?.total_calls || 0).toLocaleString('en-IN')} color="#6366f1" />
        <Chip icon={Clock}     label="Total Minutes" value={Math.round((wallet?.stats?.total_seconds || 0) / 60).toLocaleString('en-IN')} color="#0ea5e9" />
        <Chip icon={TrendingDown} label="Spent on Calls" value={fmtINR(wallet?.stats?.total_spent_calls)} color="#f43f5e" />
        <Chip icon={Zap}       label="Today's Spend" value={fmtINR(wallet?.stats?.spent_today)} color="#f59e0b" />
      </div>

      {/* ── Spend chart ── */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0f0f0', padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>Daily Spend</h3>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>Last 30 days</p>
          </div>
          <BarChart2 size={18} color="#d1d5db" />
        </div>
        <SpendChart data={dailySpend} />
      </div>

      {/* ── Transactions + Recharges ── */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
          {[
            { key: 'transactions', label: 'All Transactions' },
            { key: 'recharges',    label: 'Recharge History' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '16px 24px', fontSize: 14, fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? '#6366f1' : '#6b7280',
              borderBottom: activeTab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: '8px 24px 24px' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>Loading...</div>
          ) : activeTab === 'transactions' ? (
            txns.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>No transactions yet. Add money to get started.</div>
            ) : (
              txns.map(tx => <TxRow key={tx.id} tx={tx} />)
            )
          ) : (
            recharges.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>No recharge history</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#9ca3af', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 0', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '12px 0', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 0', textAlign: 'right' }}>GST</th>
                    <th style={{ padding: '12px 0', textAlign: 'right' }}>Total Paid</th>
                    <th style={{ padding: '12px 0', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recharges.map(r => (
                    <tr key={r.id} style={{ borderTop: '1px solid #f9fafb' }}>
                      <td style={{ padding: '12px 0', color: '#374151' }}>{fmtDate(r.created_at)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>{fmtINR(r.amount)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', color: '#9ca3af' }}>{fmtINR(r.amount * 0.18)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>{fmtINR(r.amount_with_gst)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: r.status === 'completed' ? '#d1fae5' : r.status === 'failed' ? '#fee2e2' : '#fef9c3',
                          color: r.status === 'completed' ? '#065f46' : r.status === 'failed' ? '#991b1b' : '#92400e',
                        }}>
                          {r.status === 'completed' ? <CheckCircle2 size={11} /> : r.status === 'failed' ? <XCircle size={11} /> : <Clock size={11} />}
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {/* Rate info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
        <Info size={14} color="#94a3b8" />
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          Current rate: <strong style={{ color: '#64748b' }}>₹{rate}/minute</strong>. Billed per minute after each call ends. GST @ 18% applies to recharges only.
        </p>
      </div>

      {/* Recharge modal */}
      {showModal && (
        <RechargeModal
          onClose={() => setShowModal(false)}
          onSuccess={onRechargeSuccess}
          rate={rate}
        />
      )}
    </div>
  )
}
