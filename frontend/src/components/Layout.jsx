import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Radio, Settings, LogOut, Plus, Menu, ChevronRight, IndianRupee, FlaskConical } from 'lucide-react'

const NAV = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard', end: true  },
  { to: '/dashboard/campaigns', icon: Radio,           label: 'Campaigns', end: false },
  { to: '/dashboard/simulate',  icon: FlaskConical,    label: 'Simulator', end: true  },
  { to: '/dashboard/billing',   icon: IndianRupee,     label: 'Billing',   end: true  },
  { to: '/dashboard/settings',  icon: Settings,        label: 'Settings',  end: true  },
]

// ── Inline Logo Component (Raleway + Sonar Pulse) ──
function Logo({ size = 'md' }) {
  const s = {
    sm: { icon: 32, core: 24, mic: 11, t1: 13, t2: 9,  gap: 9  },
    md: { icon: 40, core: 30, mic: 14, t1: 16, t2: 10, gap: 11 },
  }[size]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      {/* Animated sonar icon */}
      <div style={{ width: s.icon, height: s.icon, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {[0, 0.8, 1.6].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: s.icon, height: s.icon,
            borderRadius: '50%',
            border: '1.5px solid #f5a623',
            animation: `voiceai-sonar 2.4s cubic-bezier(0.4,0,0.6,1) ${delay}s infinite`,
          }}/>
        ))}
        <div style={{
          width: s.core, height: s.core, borderRadius: '50%',
          background: 'linear-gradient(145deg, #f5a623, #d4880a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 2,
          boxShadow: '0 0 16px rgba(245,166,35,0.45), 0 0 6px rgba(245,166,35,0.25)',
        }}>
          <svg width={s.mic} height={s.mic} viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="11" rx="3" fill="white"/>
            <path d="M5 10C5 14.418 8.134 18 12 18C15.866 18 19 14.418 19 10"
              stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="9"  y1="22" x2="15" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Text */}
      <div>
        <div style={{
          fontFamily: '"Raleway", sans-serif',
          fontWeight: 900,
          fontSize: s.t1,
          letterSpacing: '0.5px',
          lineHeight: 1,
          color: '#2c2c2c',
        }}>
          VoiceAI <span style={{ color: '#f5a623' }}>India</span>
        </div>
        <div style={{
          fontFamily: '"Raleway", sans-serif',
          fontWeight: 500,
          fontSize: s.t2,
          color: '#b0b0b0',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginTop: 3,
        }}>
          By RiseAscend Tech
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@500;900&display=swap');
        @keyframes voiceai-sonar {
          0%   { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const initial = (user.company_name || user.email || 'U')[0].toUpperCase()

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full" style={{ background: '#ffffff', borderRight: '1px solid #ede7dc', width: '220px' }}>

      {/* ── Logo ── */}
      <div
        className="flex items-center px-5 py-4 cursor-pointer border-b"
        style={{ borderColor: '#ede7dc' }}
        onClick={() => navigate('/')}
      >
        <Logo size="sm" />
      </div>

      {/* User chip */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#ede7dc' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: '#faf8f4' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f5a623, #e08c10)' }}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: '#2c2c2c' }}>{user.company_name || 'My Company'}</p>
            <p className="text-[10px] truncate" style={{ color: '#a8a8a8' }}>{user.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-bold uppercase tracking-[1.5px] px-3 mb-3" style={{ color: '#c4c4c4' }}>Menu</p>
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <Icon size={15} style={{ color: isActive ? '#f5a623' : '#a8a8a8' }} />
                <span>{label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto" style={{ color: '#d0c9be' }} />}
              </>
            )}
          </NavLink>
        ))}

        <div className="pt-5">
          <p className="text-[9px] font-bold uppercase tracking-[1.5px] px-3 mb-3" style={{ color: '#c4c4c4' }}>Quick Actions</p>
          <button onClick={() => { navigate('/dashboard/campaigns/new'); setOpen(false) }}
            className="w-full nav-link border border-dashed justify-start gap-2"
            style={{ borderColor: '#e8e3db', color: '#f5a623', fontWeight: '600' }}>
            <Plus size={14} />
            New Campaign
          </button>
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 pt-2 border-t" style={{ borderColor: '#ede7dc' }}>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all hover:bg-[#faf8f4]"
          style={{ color: '#a8a8a8' }}>
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#fdfcfa' }}>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.3)' }}
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b" style={{ borderColor: '#ede7dc' }}>
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-[#faf8f4]" style={{ color: '#3d3d3d' }}>
            <Menu size={20} />
          </button>
          {/* ── Mobile topbar logo ── */}
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
