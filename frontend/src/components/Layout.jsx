import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Radio, Settings, LogOut, Mic2, Plus, Menu, X, ChevronRight, IndianRupee, FlaskConical } from 'lucide-react'

const NAV = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard', end: true  },
  { to: '/dashboard/campaigns', icon: Radio,           label: 'Campaigns', end: false },
  { to: '/dashboard/simulate',  icon: FlaskConical,    label: 'Simulator', end: true  },
  { to: '/dashboard/billing',   icon: IndianRupee,     label: 'Billing',   end: true  },
  { to: '/dashboard/settings',  icon: Settings,        label: 'Settings',  end: true  },
]

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

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 cursor-pointer border-b" style={{ borderColor: '#ede7dc' }} onClick={() => navigate('/')}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5a623' }}>
          <Mic2 size={15} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-[13px] leading-none" style={{ color: '#2c2c2c' }}>VoiceAI India</p>
          <p className="text-[10px] mt-0.5" style={{ color: '#a8a8a8' }}>Rise Ascend Tech</p>
        </div>
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
          <span className="font-semibold text-[14px]" style={{ color: '#2c2c2c', fontFamily: '"DM Serif Display",serif' }}>VoiceAI India</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
