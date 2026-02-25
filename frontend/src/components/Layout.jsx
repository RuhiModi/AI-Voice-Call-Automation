import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Megaphone, Settings, LogOut, Phone, ChevronRight, Menu, Zap, Plus } from 'lucide-react'

const NAV = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard',  end: true  },
  { to: '/dashboard/campaigns', icon: Megaphone,       label: 'Campaigns',  end: false },
  { to: '/dashboard/settings',  icon: Settings,        label: 'Settings',   end: true  },
]

export default function Layout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{"company_name":"Rise Ascend Tech","email":"demo@voiceai.in"}')

  function logout() {
    localStorage.clear()
    navigate('/')
  }

  const initial = (user.company_name || user.email || 'R')[0].toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-[240px] flex flex-col
        bg-brand-blue transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Phone size={16} className="text-white" />
            </div>
            <div>
              <div className="font-display font-800 text-[15px] text-white leading-none">
                VoiceAI <span className="text-brand-orange">India</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5 tracking-wider uppercase">by Rise Ascend</div>
            </div>
          </div>
        </div>

        {/* User chip */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/8">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center font-display font-800 text-[13px] text-white flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-600 text-white truncate">{user.company_name || 'My Company'}</p>
              <p className="text-[11px] text-white/40 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-700 text-white/30 uppercase tracking-[1.5px] px-3 mb-3">Main Menu</p>

          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-500 transition-all duration-150
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/85'}
              `}>
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-brand-orange' : 'text-white/40'} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={13} className="ml-auto text-white/40" />}
                </>
              )}
            </NavLink>
          ))}

          <div className="pt-4">
            <p className="text-[9px] font-700 text-white/30 uppercase tracking-[1.5px] px-3 mb-3">Quick Actions</p>
            <button
              onClick={() => { navigate('/dashboard/campaigns/new'); setSidebarOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-600 text-brand-orange hover:bg-white/8 transition-all border border-dashed border-brand-orange/30 hover:border-brand-orange/60">
              <Plus size={15} />
              New Campaign
            </button>
          </div>
        </nav>

        {/* Plan badge */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-white/6 border border-white/10">
            <Zap size={14} className="text-brand-orange flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-700 text-white">Free Plan</p>
              <p className="text-[10px] text-white/35">~₹1/call · 500 calls/mo</p>
            </div>
            <button className="text-[10px] font-700 text-brand-orange hover:text-orange-300 transition-colors whitespace-nowrap">
              Upgrade
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-5 pt-1">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/35 hover:bg-white/8 hover:text-white/70 transition-all">
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-surface-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-surface-100 text-brand-blue">
            <Menu size={20} />
          </button>
          <span className="font-display font-800 text-brand-blue text-[15px]">
            VoiceAI <span className="text-brand-orange">India</span>
          </span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
