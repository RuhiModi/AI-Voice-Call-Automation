import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Megaphone, Settings, LogOut, Phone, ChevronRight, Menu, Zap, Plus } from 'lucide-react'

const NAV = [
  { to: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard',    end: true  },
  { to: '/dashboard/campaigns',  icon: Megaphone,       label: 'Campaigns',    end: false },
  { to: '/dashboard/settings',   icon: Settings,        label: 'Settings',     end: true  },
]

export default function Layout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{"company_name":"Demo Co","email":"demo@voiceai.in"}')

  function logout() {
    localStorage.clear()
    navigate('/')
  }

  const initial = (user.company_name || user.email || 'D')[0].toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-[252px] flex flex-col
        bg-navy-900 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
              <Phone size={16} className="text-white" />
            </div>
            <div>
              <div className="font-display font-800 text-[15px] text-white leading-none">
                VoiceAI<span className="text-orange-500"> India</span>
              </div>
              <div className="text-[10px] text-white/30 mt-0.5 tracking-wider uppercase font-medium">by Rise Ascend</div>
            </div>
          </div>
        </div>

        {/* User chip */}
        <div className="px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center font-display font-800 text-[13px] text-white flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-600 text-white truncate">{user.company_name || 'My Company'}</p>
              <p className="text-[11px] text-white/35 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-700 text-white/25 uppercase tracking-[1.5px] px-3 mb-3">Main Menu</p>

          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-500 transition-all duration-150
                ${isActive
                  ? 'bg-orange-500/15 text-white border border-orange-500/20'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80'}
              `}>
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-orange-400' : 'text-white/40'} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={13} className="ml-auto text-orange-400/50" />}
                </>
              )}
            </NavLink>
          ))}

          {/* Quick action */}
          <div className="pt-4">
            <p className="text-[9px] font-700 text-white/25 uppercase tracking-[1.5px] px-3 mb-3">Quick Actions</p>
            <button
              onClick={() => { navigate('/dashboard/campaigns/new'); setSidebarOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-600 text-orange-400 hover:bg-orange-500/10 transition-all border border-dashed border-orange-500/20 hover:border-orange-500/40">
              <Plus size={15} />
              New Campaign
            </button>
          </div>
        </nav>

        {/* Plan */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-white/4 border border-white/8">
            <Zap size={14} className="text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-700 text-white">Free Plan</p>
              <p className="text-[10px] text-white/35">~₹1/call · 500 calls/mo</p>
            </div>
            <button className="text-[10px] font-700 text-orange-400 hover:text-orange-300 whitespace-nowrap transition-colors">
              Upgrade
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-5 pt-1">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/35 hover:bg-white/5 hover:text-white/70 transition-all">
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-navy-900">
            <Menu size={20} />
          </button>
          <span className="font-display font-800 text-navy-900 text-[15px]">
            VoiceAI<span className="text-orange-500"> India</span>
          </span>
          <div className="w-9" />
        </header>

        {/* Page outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
