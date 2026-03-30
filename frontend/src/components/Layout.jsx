import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Radio, Settings, LogOut, Plus,
  Menu, ChevronRight, Wallet, FlaskConical, AlertTriangle
} from 'lucide-react'
import axios from 'axios'
import Logo from './Logo'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const NAV = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard', end: true  },
  { to: '/dashboard/campaigns', icon: Radio,           label: 'Campaigns', end: false },
  { to: '/dashboard/simulate',  icon: FlaskConical,    label: 'Simulator', end: true  },
  { to: '/dashboard/billing',   icon: Wallet,          label: 'Wallet',    end: true  },
  { to: '/dashboard/settings',  icon: Settings,        label: 'Settings',  end: true  },
]

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Layout() {
  const navigate = useNavigate()
  const [open,    setOpen]    = useState(false)
  const [balance, setBalance] = useState(null)
  const [loadingBal, setLoadingBal] = useState(true)

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const initial = (user.company_name || user.email || 'U')[0].toUpperCase()

  // Fetch wallet balance for sidebar
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    axios.get(`${API}/wallet`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setBalance(parseFloat(r.data.wallet_balance || 0)))
      .catch(() => setBalance(0))
      .finally(() => setLoadingBal(false))
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const isLow    = balance !== null && balance < 100
  const isDanger = balance !== null && balance < 20

  const Sidebar = () => (
    <aside className="flex flex-col h-full" style={{ background: '#0f0f10', borderRight: '1px solid #1f1f23', width: '230px' }}>

      {/* Logo */}
      <div
        className="flex items-center px-5 py-5 cursor-pointer"
        style={{ borderBottom: '1px solid #1f1f23' }}
        onClick={() => navigate('/dashboard')}
      >
        <Logo size="sm" />
      </div>

      {/* Wallet balance chip */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #1f1f23' }}>
        <div
          className="rounded-2xl p-4 cursor-pointer"
          style={{
            background: isDanger ? '#2d0a0a' : isLow ? '#1c1708' : '#16162a',
            border: `1px solid ${isDanger ? '#7f1d1d' : isLow ? '#78350f' : '#2a2a4a'}`,
          }}
          onClick={() => navigate('/dashboard/billing')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet size={13} color={isDanger ? '#f87171' : isLow ? '#fbbf24' : '#818cf8'} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDanger ? '#f87171' : isLow ? '#fbbf24' : '#818cf8' }}>
                Wallet
              </span>
            </div>
            {(isLow || isDanger) && <AlertTriangle size={12} color={isDanger ? '#f87171' : '#fbbf24'} />}
          </div>
          {loadingBal ? (
            <div style={{ height: 24, width: 80, background: '#1f1f2e', borderRadius: 6 }} />
          ) : (
            <p style={{ fontSize: 20, fontWeight: 900, color: isDanger ? '#fca5a5' : isLow ? '#fde68a' : '#e0e0ff', margin: 0, letterSpacing: '-0.03em', fontFamily: '"DM Serif Display", serif' }}>
              {fmtINR(balance)}
            </p>
          )}
          <p style={{ fontSize: 10, color: '#4b4b6b', marginTop: 4 }}>
            {isDanger ? 'Add money to continue' : isLow ? 'Balance running low' : 'Available balance'}
          </p>
        </div>
      </div>

      {/* User chip */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #1f1f23' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: '#18181c' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: '#e5e7eb' }}>{user.company_name || 'My Company'}</p>
            <p className="text-[10px] truncate" style={{ color: '#4b5563' }}>{user.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-bold uppercase tracking-[1.5px] px-3 mb-3" style={{ color: '#374151' }}>Menu</p>
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? '#a5b4fc' : '#6b7280',
              background: isActive ? '#1e1e3f' : 'transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            })}>
            {({ isActive }) => (
              <>
                <Icon size={15} color={isActive ? '#818cf8' : '#4b5563'} />
                <span>{label}</span>
                {label === 'Wallet' && isDanger && (
                  <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                )}
                {label === 'Wallet' && isLow && !isDanger && (
                  <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                )}
                {isActive && !isLow && <ChevronRight size={12} className="ml-auto" style={{ color: '#4b5563' }} />}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-5">
          <p className="text-[9px] font-bold uppercase tracking-[1.5px] px-3 mb-3" style={{ color: '#374151' }}>Quick Actions</p>
          <button
            onClick={() => { navigate('/dashboard/campaigns/new'); setOpen(false) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10, border: '1px dashed #2a2a4a',
              background: 'transparent', color: '#818cf8', fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
            }}>
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-2" style={{ borderTop: '1px solid #1f1f23' }}>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all"
          style={{ color: '#4b5563', background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = '#18181c'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0b' }}>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f5f5f7' }}>
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b" style={{ background: '#0f0f10', borderColor: '#1f1f23' }}>
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg" style={{ color: '#6b7280' }}>
            <Menu size={20} />
          </button>
          <Logo size="sm" />
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
