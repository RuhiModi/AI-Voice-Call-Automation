import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, Radio, Settings, LogOut, Plus,
  Menu, ChevronRight, Wallet, FlaskConical, X,
  AlertTriangle, Bell, ChevronDown
} from 'lucide-react'
import axios from 'axios'
import Logo from './Logo'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const SKY   = '#0EA5E9'
const GRAD  = 'linear-gradient(135deg,#38BDF8,#0EA5E9,#0284C7)'
const LIGHT = '#F0F9FF'
const BORD  = '#BAE6FD'

const NAV = [
  { to:'/dashboard',           icon:LayoutDashboard, label:'Dashboard', end:true  },
  { to:'/dashboard/campaigns', icon:Radio,           label:'Campaigns', end:false },
  { to:'/dashboard/simulate',  icon:FlaskConical,    label:'Simulator', end:true  },
  { to:'/dashboard/billing',   icon:Wallet,          label:'Wallet',    end:true  },
  { to:'/dashboard/settings',  icon:Settings,        label:'Settings',  end:true  },
]

const PAGE_TITLES = {
  '/dashboard':           { title:'Dashboard',  sub:'Overview of your voice campaigns' },
  '/dashboard/campaigns': { title:'Campaigns',  sub:'Manage your outbound campaigns'   },
  '/dashboard/simulate':  { title:'Simulator',  sub:'Test calls without real charges'  },
  '/dashboard/billing':   { title:'Wallet',     sub:'Balance & transaction history'    },
  '/dashboard/settings':  { title:'Settings',   sub:'Account & integrations'           },
}

const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })

function useOutside(ref, cb) {
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) cb() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [cb])
}

function NotifBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useOutside(ref, () => setOpen(false))
  const items = [
    { icon:'✅', text:'Campaign "Bus Reminder" completed', t:'2m ago' },
    { icon:'📞', text:'1,284 calls made today',            t:'1h ago' },
    { icon:'💰', text:'Low wallet balance',                t:'3h ago' },
  ]
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o=>!o)} style={{ width:38, height:38, borderRadius:10, border:`1px solid ${BORD}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', transition:'border-color .15s' }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=SKY} onMouseLeave={e=>e.currentTarget.style.borderColor=BORD}>
        <Bell size={15} color="#6B7280"/>
        <span style={{ position:'absolute', top:7, right:8, width:7, height:7, borderRadius:'50%', background:SKY, border:'1.5px solid #fff' }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:296, background:'#fff', borderRadius:14, border:`1px solid ${BORD}`, boxShadow:`0 8px 32px rgba(14,165,233,.12)`, zIndex:200, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${LIGHT}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#0f0f0f' }}>Notifications</span>
            <span style={{ fontSize:10, color:SKY, fontWeight:700, cursor:'pointer' }}>Mark all read</span>
          </div>
          {items.map((n,i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'11px 16px', borderBottom:`1px solid ${LIGHT}`, cursor:'pointer', background:i===0?LIGHT:'#fff', transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=LIGHT} onMouseLeave={e=>e.currentTarget.style.background=i===0?LIGHT:'#fff'}>
              <span style={{ fontSize:18, flexShrink:0 }}>{n.icon}</span>
              <div>
                <p style={{ fontSize:12, fontWeight:600, color:'#374151', margin:0, lineHeight:1.4 }}>{n.text}</p>
                <p style={{ fontSize:10, color:'#9CA3AF', margin:'3px 0 0' }}>{n.t}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ user, onLogout, onNavigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useOutside(ref, () => setOpen(false))
  const initial = (user.company_name || user.email || 'S')[0].toUpperCase()
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o=>!o)} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px 5px 5px', borderRadius:12, border:`1px solid ${BORD}`, background:'#fff', cursor:'pointer', transition:'border-color .15s' }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=SKY} onMouseLeave={e=>e.currentTarget.style.borderColor=BORD}>
        <div style={{ width:30, height:30, borderRadius:9, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>{initial}</div>
        <div style={{ textAlign:'left' }} className="hidden sm:block">
          <p style={{ fontSize:12, fontWeight:700, color:'#0f0f0f', margin:0, maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.company_name||'My Company'}</p>
          <p style={{ fontSize:10, color:'#9CA3AF', margin:0 }}>Admin</p>
        </div>
        <ChevronDown size={12} color="#9CA3AF" style={{ transform:open?'rotate(180deg)':'none', transition:'transform .15s', flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:210, background:'#fff', borderRadius:14, border:`1px solid ${BORD}`, boxShadow:`0 8px 32px rgba(14,165,233,.12)`, zIndex:200, overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:`1px solid ${LIGHT}` }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#0f0f0f', margin:0 }}>{user.company_name||'My Company'}</p>
            <p style={{ fontSize:10, color:'#9CA3AF', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</p>
          </div>
          {[{icon:Settings,label:'Settings',to:'/dashboard/settings'},{icon:Wallet,label:'Wallet',to:'/dashboard/billing'}].map(({icon:Ic,label,to}) => (
            <button key={label} onClick={()=>{onNavigate(to);setOpen(false)}} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'#374151', textAlign:'left', fontFamily:'inherit', transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background=LIGHT} onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <Ic size={14} color="#9CA3AF"/> {label}
            </button>
          ))}
          <div style={{ borderTop:`1px solid ${LIGHT}` }}>
            <button onClick={()=>{onLogout();setOpen(false)}} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'#EF4444', textAlign:'left', fontFamily:'inherit' }}
              onMouseEnter={e=>e.currentTarget.style.background='#FEF2F2'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <LogOut size={14} color="#EF4444"/> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [balance,    setBalance]    = useState(null)
  const [loadingBal, setLoadingBal] = useState(true)

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    axios.get(`${API}/wallet`, { headers:{ Authorization:`Bearer ${token}` } })
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
  const pageInfo = PAGE_TITLES[location.pathname] || { title:'SamwadAI', sub:'' }

  const Sidebar = () => (
    <aside style={{ display:'flex', flexDirection:'column', height:'100%', width:228, background:'#fff', borderRight:`1px solid ${BORD}` }}>
      {/* Logo — only here */}
      <div style={{ padding:'18px 20px', cursor:'pointer', borderBottom:`1px solid ${LIGHT}`, flexShrink:0 }} onClick={() => navigate('/dashboard')}>
        <Logo size="sm"/>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'14px 10px', overflowY:'auto' }}>
        <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color:BORD, padding:'0 10px', marginBottom:8 }}>Menu</p>
        {NAV.map(({ to, icon:Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <Icon size={15} color={isActive ? '#0284C7' : '#9CA3AF'} strokeWidth={isActive ? 2.2 : 1.8}/>
                <span>{label}</span>
                {label === 'Wallet' && isDanger && <span style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:'#EF4444', flexShrink:0 }}/>}
                {label === 'Wallet' && isLow && !isDanger && <span style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%', background:'#F59E0B', flexShrink:0 }}/>}
                {isActive && <ChevronRight size={11} style={{ marginLeft:'auto', color:BORD, flexShrink:0 }}/>}
              </>
            )}
          </NavLink>
        ))}

        <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${LIGHT}` }}>
          <button onClick={() => { navigate('/dashboard/campaigns/new'); setMobileOpen(false) }}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:11, borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 3px 14px rgba(14,165,233,.28)', transition:'box-shadow .15s' }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 5px 20px rgba(14,165,233,.45)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='0 3px 14px rgba(14,165,233,.28)'}>
            <Plus size={14}/> New Campaign
          </button>
        </div>
      </nav>

      <div style={{ padding:'10px 14px', borderTop:`1px solid ${LIGHT}` }}>
        <p style={{ fontSize:9, textAlign:'center', color:BORD, fontWeight:600, letterSpacing:'0.05em' }}>SamwadAI v2.0 · RiseAscend Tech</p>
      </div>
    </aside>
  )

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:LIGHT }}>
      {mobileOpen && <div style={{ position:'fixed', inset:0, zIndex:30, background:'rgba(3,105,161,.30)', backdropFilter:'blur(2px)' }} className="lg:hidden" onClick={() => setMobileOpen(false)}/>}

      <div className="hidden lg:flex flex-shrink-0"><Sidebar/></div>

      <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div style={{ position:'relative', height:'100%' }}>
          <Sidebar/>
          <button onClick={() => setMobileOpen(false)} style={{ position:'absolute', top:16, right:-44, width:36, height:36, borderRadius:'50%', background:'#fff', border:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={16} color="#6B7280"/>
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        {/* Topbar */}
        <header style={{ height:62, flexShrink:0, background:'#fff', borderBottom:`1px solid ${BORD}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setMobileOpen(true)} style={{ padding:8, borderRadius:8, border:'none', background:LIGHT, cursor:'pointer' }} className="block lg:hidden">
              <Menu size={18} color="#374151"/>
            </button>
            <div>
              <h2 style={{ fontSize:16, fontWeight:800, color:'#0f0f0f', margin:0, letterSpacing:'-0.02em' }}>{pageInfo.title}</h2>
              <p style={{ fontSize:11, color:'#9CA3AF', margin:0 }} className="hidden sm:block">{pageInfo.sub}</p>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Wallet chip */}
            <button onClick={() => navigate('/dashboard/billing')} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:10, cursor:'pointer', transition:'all .15s', background:isDanger?'#FEF2F2':isLow?'#FFFBEB':LIGHT, border:`1px solid ${isDanger?'#FECACA':isLow?'#FDE68A':BORD}` }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=SKY} onMouseLeave={e=>e.currentTarget.style.borderColor=isDanger?'#FECACA':isLow?'#FDE68A':BORD}>
              <Wallet size={13} color={isDanger?'#EF4444':isLow?'#F59E0B':SKY}/>
              {loadingBal
                ? <div style={{ width:56, height:14, borderRadius:4, background:LIGHT }}/>
                : <span style={{ fontSize:13, fontWeight:800, color:isDanger?'#DC2626':isLow?'#D97706':'#0f0f0f', letterSpacing:'-0.02em' }}>{fmtINR(balance)}</span>
              }
              {(isLow || isDanger) && <AlertTriangle size={12} color={isDanger?'#EF4444':'#F59E0B'}/>}
            </button>

            <NotifBell/>
            <ProfileMenu user={user} onLogout={logout} onNavigate={navigate}/>
          </div>
        </header>

        <main style={{ flex:1, overflowY:'auto' }}>
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
