import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Radio, Settings, LogOut, Plus,
  Menu, ChevronRight, Wallet, FlaskConical, X,
  AlertTriangle, Zap
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
  const [open,       setOpen]      = useState(false)
  const [balance,    setBalance]   = useState(null)
  const [loadingBal, setLoadingBal]= useState(true)

  const user    = JSON.parse(localStorage.getItem('user') || '{}')
  const initial = (user.company_name || user.email || 'S')[0].toUpperCase()

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
    <aside style={{
      display: 'flex', flexDirection: 'column', height: '100%', width: 236,
      background: '#ffffff',
      borderRight: '1px solid #E5E7EB',
    }}>

      {/* Logo */}
      <div
        style={{ padding: '20px 20px 16px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}
        onClick={() => navigate('/dashboard')}
      >
        <Logo size="sm" />
      </div>

      {/* Wallet balance card */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <div
          onClick={() => navigate('/dashboard/billing')}
          style={{
            borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
            background: isDanger ? '#FEF2F2' : isLow ? '#FFFBEB' : 'linear-gradient(135deg, #FFF4F0 0%, #FFF8F6 100%)',
            border: `1.5px solid ${isDanger ? '#FECACA' : isLow ? '#FDE68A' : '#FFD4C2'}`,
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wallet size={12} color={isDanger ? '#EF4444' : isLow ? '#F59E0B' : '#FF6B35'} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDanger ? '#EF4444' : isLow ? '#F59E0B' : '#FF6B35' }}>
                Wallet
              </span>
            </div>
            {isDanger && <AlertTriangle size={11} color="#EF4444" />}
            {isLow && !isDanger && <AlertTriangle size={11} color="#F59E0B" />}
          </div>

          {loadingBal ? (
            <div style={{ height: 22, width: 70, borderRadius: 6, background: '#F3F4F6' }} />
          ) : (
            <p style={{
              fontSize: 19, fontWeight: 800, margin: 0, letterSpacing: '-0.03em',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              color: isDanger ? '#DC2626' : isLow ? '#D97706' : '#0f0f0f',
            }}>
              {fmtINR(balance)}
            </p>
          )}
          <p style={{ fontSize: 10, color: isDanger ? '#EF4444' : isLow ? '#D97706' : '#9CA3AF', marginTop: 3 }}>
            {isDanger ? 'Add money now!' : isLow ? 'Running low' : 'Available balance'}
          </p>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F9FAFB' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #FF8C42, #E63946)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f0f0f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.company_name || 'My Company'}
            </p>
            <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D1D5DB', padding: '0 8px', marginBottom: 8 }}>
          Menu
        </p>

        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <Icon size={15} color={isActive ? '#FF6B35' : '#9CA3AF'} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
                {/* Low balance dot on Wallet */}
                {label === 'Wallet' && isDanger && (
                  <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                )}
                {label === 'Wallet' && isLow && !isDanger && (
                  <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                )}
                {isActive && !isLow && label !== 'Wallet' && (
                  <ChevronRight size={12} style={{ marginLeft: 'auto', color: '#FFB99A', flexShrink: 0 }} />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Quick action */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D1D5DB', padding: '0 8px', marginBottom: 8 }}>
            Quick Actions
          </p>
          <button
            onClick={() => { navigate('/dashboard/campaigns/new'); setOpen(false) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10,
              border: '1.5px dashed #FFD4C2',
              background: '#FFF8F6', color: '#FF6B35',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFF0EB'; e.currentTarget.style.borderColor = '#FF6B35' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFF8F6'; e.currentTarget.style.borderColor = '#FFD4C2' }}
          >
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '10px', borderTop: '1px solid #F3F4F6' }}>
        {/* Powered by badge */}
        <div style={{ padding: '6px 10px', borderRadius: 8, background: '#F9FAFB', marginBottom: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: '#D1D5DB', fontWeight: 600, letterSpacing: '0.05em' }}>
            Powered by <span style={{ color: '#FF6B35' }}>SamwadAI</span> · RiseAscend Tech
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 10, border: 'none',
            background: 'transparent', color: '#9CA3AF', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: '"Plus Jakarta Sans", sans-serif',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F8FA' }}>

      {/* Mobile overlay */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          className="lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div style={{ position: 'relative', height: '100%' }}>
          <Sidebar />
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', top: 16, right: -44, width: 36, height: 36,
              borderRadius: '50%', background: '#fff', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Mobile topbar */}
        <header className="lg:hidden" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: '#fff', borderBottom: '1px solid #E5E7EB',
        }}>
          <button
            onClick={() => setOpen(true)}
            style={{ padding: 8, borderRadius: 8, border: 'none', background: '#F9FAFB', cursor: 'pointer' }}
          >
            <Menu size={18} color="#374151" />
          </button>
          <Logo size="sm" />
          <div style={{ width: 36 }} />
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
