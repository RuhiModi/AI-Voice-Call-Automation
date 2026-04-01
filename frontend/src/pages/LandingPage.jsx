import Logo from '../components/Logo'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

// ─── Brand tokens ────────────────────────────────────────────────
const B = {
  primary:  '#FF6B35',
  secondary:'#FF8C42',
  dark:     '#E63946',
  grad:     'linear-gradient(135deg,#FF8C42 0%,#FF6B35 50%,#E63946 100%)',
  gradText: { background:'linear-gradient(135deg,#FF8C42,#FF6B35,#E63946)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
  glow:     '0 4px 24px rgba(255,107,53,0.35)',
  glowLg:   '0 8px 40px rgba(255,107,53,0.45)',
}

// ─── Data ────────────────────────────────────────────────────────
const USE_CASES = [
  { icon:'🚌', title:'Transport & Logistics',   desc:'Driver reminders, departure alerts, route changes — in Gujarati, auto-called to thousands.' },
  { icon:'🏛️', title:'Government Surveys',       desc:'PM Awas, ration cards, pension schemes — verify beneficiaries at massive scale.' },
  { icon:'🏥', title:'Healthcare',               desc:'Appointment reminders, prescription follow-ups, health camp notifications.' },
  { icon:'🏦', title:'Banking & Finance',        desc:'Loan due dates, KYC verification, account updates in regional languages.' },
  { icon:'🛒', title:'E-commerce & Retail',      desc:'Order confirmations, delivery updates, feedback — personalised per customer.' },
  { icon:'🗳️', title:'Political Campaigns',      desc:'Voter outreach, event reminders, survey calls — multi-lingual, high volume.' },
]

const FEATURES = [
  { icon:'🗣️', title:'Gujarati-First AI',     desc:'Detects & switches between Gujarati, Hindi & English mid-call automatically.' },
  { icon:'📞', title:'Bulk Outbound Calling', desc:'Upload a CSV, launch thousands of concurrent calls in one click with auto-retry.' },
  { icon:'🔄', title:'Smart Rescheduling',    desc:'"Call me at 3pm" — AI understands any language and auto-schedules the callback.' },
  { icon:'📊', title:'Live Dashboard',        desc:'Real-time transcripts, outcomes and collected data — all visible instantly.' },
  { icon:'📋', title:'Google Sheets Sync',    desc:'Every call result appends to your spreadsheet. Live team-wide data access.' },
  { icon:'👤', title:'Human Handoff',         desc:'"Talk to a human?" — AI transfers instantly to your agent, no gap.' },
]

const STEPS = [
  { n:'01', icon:'📤', title:'Upload Contacts',  desc:'CSV with phone numbers, names, any variables you need.' },
  { n:'02', icon:'✍️', title:'Write Script',     desc:'Paste your script or upload a PDF. Use {{name}}, {{time}} placeholders.' },
  { n:'03', icon:'🤖', title:'Configure Agent',  desc:'Pick language, agent name, tone, what data to collect.' },
  { n:'04', icon:'🚀', title:'Launch & Watch',   desc:'Hit launch. Live transcripts and outcomes appear in real-time.' },
]

const STATS = [
  { val:'1M+',   label:'Calls Made'   },
  { val:'98%',   label:'Uptime'       },
  { val:'3',     label:'Languages'    },
  { val:'<2s',   label:'Response Time'},
]

// ─── Reusable pieces ─────────────────────────────────────────────
function Pill({ children, color = B.primary }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px',
      borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:'0.06em',
      textTransform:'uppercase', color,
      background:`${color}12`, border:`1px solid ${color}30`,
    }}>{children}</span>
  )
}

function WaveBars({ color = B.primary, size = 14 }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'flex-end', gap:2.5, height:size }}>
      {[0,0.15,0.30,0.45,0.60].map((d,i) => (
        <span key={i} style={{
          display:'block', width:2.5, height:size, borderRadius:2,
          background:color, transformOrigin:'bottom',
          animation:`samwad-wave 1.1s ease-in-out ${d}s infinite`,
        }} />
      ))}
    </span>
  )
}

// Animated counter on scroll
function Counter({ target, suffix='' }) {
  const [count, setCount] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const num = parseFloat(target)
      if (isNaN(num)) { setCount(target); return }
      let start = 0
      const step = num / 40
      const t = setInterval(() => {
        start += step
        if (start >= num) { setCount(target); clearInterval(t) }
        else setCount(Math.floor(start) + (num % 1 !== 0 ? '.' + String(Math.round((start % 1)*10)) : ''))
      }, 30)
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{count}{suffix}</span>
}

// Dashboard mockup — updated SamwadAI branding
function DashMockup() {
  return (
    <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', border:'1px solid #E5E7EB', boxShadow:'0 20px 60px rgba(0,0,0,0.10)' }}>
      {/* Browser bar */}
      <div style={{ background:'#F3F4F6', padding:'10px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #E5E7EB' }}>
        <div style={{ display:'flex', gap:5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
        </div>
        <div style={{ flex:1, background:'#fff', borderRadius:6, padding:'3px 12px', fontSize:10, color:'#9CA3AF', marginLeft:8, border:'1px solid #E5E7EB' }}>
          app.samwad.ai/dashboard
        </div>
      </div>
      {/* Layout */}
      <div style={{ display:'grid', gridTemplateColumns:'150px 1fr', minHeight:240 }}>
        {/* Sidebar */}
        <div style={{ background:'#fff', borderRight:'1px solid #F3F4F6', padding:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:16, paddingBottom:10, borderBottom:'1px solid #F3F4F6' }}>
            <div style={{ width:24, height:24, borderRadius:8, background:B.grad, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" fill="white"/><path d="M5 10C5 14.418 8.134 18 12 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>
            </div>
            <span style={{ fontSize:10, fontWeight:800, color:'#0f0f0f' }}>SamwadAI</span>
          </div>
          {[['Dashboard',true],['Campaigns',false],['Wallet',false],['Settings',false]].map(([l,a]) => (
            <div key={l} style={{ padding:'7px 8px', borderRadius:7, marginBottom:2, background:a?'#FFF4F0':'transparent', fontSize:10, color:a?B.primary:'#9CA3AF', fontWeight:a?700:400 }}>{l}</div>
          ))}
          <div style={{ marginTop:12, padding:'9px 10px', borderRadius:10, background:'linear-gradient(135deg,#FFF4F0,#FFF8F6)', border:'1px solid #FFD4C2' }}>
            <div style={{ fontSize:8, color:B.primary, fontWeight:700, marginBottom:3 }}>WALLET</div>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f0f0f' }}>₹1,842</div>
          </div>
        </div>
        {/* Main */}
        <div style={{ padding:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
            {[['284','Today\'s Calls'],['78%','Answer Rate'],['₹842','Balance'],['3','Active']].map(([n,l]) => (
              <div key={l} style={{ background:'#F9FAFB', border:'1px solid #F3F4F6', borderRadius:9, padding:'9px 10px' }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#0f0f0f' }}>{n}</div>
                <div style={{ fontSize:8, color:'#9CA3AF', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'#fff', border:'1px solid #F3F4F6', borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'8px 12px', borderBottom:'1px solid #F9FAFB', fontSize:10, fontWeight:700, color:'#374151', display:'flex', justifyContent:'space-between' }}>
              <span>Live Campaigns</span>
              <span style={{ color:B.primary, fontSize:8, fontWeight:700 }}>3 Active</span>
            </div>
            {[['Bus Driver Reminder','75','active'],['PM Awas Survey','48','active'],['Hospital Follow-up','91','paused']].map(([name,pct,status]) => (
              <div key={name} style={{ display:'grid', gridTemplateColumns:'1fr 80px 40px', padding:'7px 12px', borderBottom:'1px solid #F9FAFB', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:9, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                <div style={{ height:4, background:'#F3F4F6', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:4, background:B.grad, borderRadius:2, width:`${pct}%` }} />
                </div>
                <span style={{ fontSize:8, fontWeight:700, color:status==='active'?'#10B981':'#F59E0B' }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────
export default function LandingPage() {
  const navigate   = useNavigate()
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [activeCase, setActiveCase] = useState(0)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveCase(a => (a+1) % USE_CASES.length), 3200)
    return () => clearInterval(t)
  }, [])

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' })
  const goLogin  = () => navigate('/login')
  const goSignup = () => navigate('/login?tab=signup')

  return (
    <div style={{ fontFamily:'"Plus Jakarta Sans","DM Sans",sans-serif', background:'#F7F8FA', color:'#0f0f0f', overflowX:'hidden' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes samwad-wave { 0%,100%{transform:scaleY(.35)} 50%{transform:scaleY(1)} }
        @keyframes samwad-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes samwad-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes samwad-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes samwad-pulse-ring { 0%{transform:scale(.4);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
        .s-fade { animation: samwad-fade-up .6s ease-out both }
        .s-float { animation: samwad-float 4s ease-in-out infinite }
        .s-spin  { animation: samwad-spin 18s linear infinite }
        .hover-lift { transition: transform .2s,box-shadow .2s }
        .hover-lift:hover { transform:translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.10) }
        .nav-link-hover { transition: color .15s }
        .nav-link-hover:hover { color: ${B.primary} !important }
        .feature-card:hover { border-color:${B.primary}40 !important; background:#FFFAF8 !important; transform:translateY(-2px) }
        .feature-card { transition: all .2s }
        .use-card:hover { transform:translateY(-3px); box-shadow:0 8px 28px rgba(255,107,53,.12) }
        .use-card { transition: all .2s }
        .step-card:hover { border-color:${B.primary}60 !important }
        .step-card { transition: border-color .2s }
      `}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════════ */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid #E5E7EB' : '1px solid transparent',
        transition:'all .3s ease',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:66, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ cursor:'pointer' }} onClick={() => navigate('/')}><Logo size="sm" /></div>

          {/* Desktop nav */}
          <div style={{ display:'flex', alignItems:'center', gap:36 }} className="hidden lg:flex">
            {[['Features','features'],['How It Works','how-it-works'],['Use Cases','use-cases']].map(([l,id]) => (
              <button key={l} onClick={() => scrollTo(id)}
                style={{ fontSize:14, fontWeight:500, color:'#6B7280', background:'none', border:'none', cursor:'pointer' }}
                className="nav-link-hover">{l}</button>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }} className="hidden lg:flex">
            <button onClick={goLogin}
              style={{ padding:'9px 20px', borderRadius:10, fontSize:13, fontWeight:600, color:'#374151', background:'#fff', border:'1.5px solid #E5E7EB', cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=B.primary; e.currentTarget.style.color=B.primary }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.color='#374151' }}>
              Sign In
            </button>
            <button onClick={goSignup}
              style={{ padding:'9px 22px', borderRadius:10, fontSize:13, fontWeight:700, color:'#fff', background:B.grad, border:'none', cursor:'pointer', boxShadow:B.glow, transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow=B.glowLg; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=B.glow; e.currentTarget.style.transform='none' }}>
              Get Started Free →
            </button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMenuOpen(m=>!m)}
            style={{ background:'none', border:'none', cursor:'pointer', padding:8, display:'flex', flexDirection:'column', gap:5 }}
            className="block lg:hidden">
            {[0,1,2].map(i => (
              <span key={i} style={{
                display:'block', width:22, height:2, background:'#374151', borderRadius:2, transition:'all .2s',
                transform: menuOpen && i===0 ? 'rotate(45deg) translateY(7px)' : menuOpen && i===2 ? 'rotate(-45deg) translateY(-7px)' : 'none',
                opacity: menuOpen && i===1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>

        {menuOpen && (
          <div style={{ background:'#fff', borderTop:'1px solid #F3F4F6', padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            {['Features','How It Works','Use Cases'].map(l => (
              <button key={l} onClick={() => { scrollTo(l.toLowerCase().replace(/ /g,'-')); setMenuOpen(false) }}
                style={{ fontSize:14, fontWeight:500, color:'#374151', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'6px 0' }}>{l}</button>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={goLogin} style={{ flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:600, background:'#F9FAFB', color:'#374151', border:'1px solid #E5E7EB', cursor:'pointer' }}>Sign In</button>
              <button onClick={goSignup} style={{ flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:700, background:B.grad, color:'#fff', border:'none', cursor:'pointer' }}>Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'130px 24px 80px', position:'relative', overflow:'hidden', background:'#fff' }}>

        {/* Background decoration */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          {/* Radial glows */}
          <div style={{ position:'absolute', top:'5%', right:'8%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,53,.07) 0%,transparent 70%)' }} />
          <div style={{ position:'absolute', bottom:'10%', left:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,140,66,.05) 0%,transparent 70%)' }} />
          {/* Subtle grid */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,0,0,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.025) 1px,transparent 1px)', backgroundSize:'56px 56px' }} />
          {/* Spinning ring decoration */}
          <div className="s-spin" style={{ position:'absolute', top:'15%', right:'12%', width:180, height:180, borderRadius:'50%', border:'1px dashed rgba(255,107,53,.18)' }} />
          <div className="s-spin" style={{ position:'absolute', bottom:'20%', left:'8%', width:120, height:120, borderRadius:'50%', border:'1px dashed rgba(255,140,66,.15)', animationDirection:'reverse' }} />
        </div>

        {/* Badge */}
        <div className="s-fade" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px 6px 10px', borderRadius:99, background:'#FFF4F0', border:'1px solid #FFD4C2', marginBottom:28 }}>
          <WaveBars />
          <span style={{ fontSize:12, fontWeight:700, color:B.primary }}>AI Voice Calls · Gujarati · Hindi · English</span>
        </div>

        {/* Headline */}
        <h1 className="s-fade" style={{ fontSize:'clamp(38px,6.5vw,76px)', fontWeight:800, lineHeight:1.06, letterSpacing:'-0.03em', color:'#0f0f0f', maxWidth:860, marginBottom:24, animationDelay:'.1s' }}>
          Your AI That Calls,<br />
          <span style={{ ...B.gradText }}>Listens & Responds</span>
        </h1>

        <p className="s-fade" style={{ fontSize:'clamp(15px,2vw,19px)', color:'#6B7280', maxWidth:520, lineHeight:1.75, marginBottom:40, animationDelay:'.2s' }}>
          Automate outbound voice campaigns at scale. Real two-way AI conversations in Gujarati, Hindi & English for any Indian business.
        </p>

        {/* CTA buttons */}
        <div className="s-fade" style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:52, animationDelay:'.3s' }}>
          <button onClick={goSignup}
            style={{ padding:'14px 32px', borderRadius:12, fontSize:15, fontWeight:800, color:'#fff', background:B.grad, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:B.glowLg, transition:'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 48px rgba(255,107,53,.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=B.glowLg }}>
            Start Free — No Card Needed
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onClick={() => scrollTo('how-it-works')}
            style={{ padding:'14px 28px', borderRadius:12, fontSize:15, fontWeight:600, color:'#374151', background:'#fff', border:'1.5px solid #E5E7EB', cursor:'pointer', transition:'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=B.primary; e.currentTarget.style.color=B.primary; e.currentTarget.style.background='#FFF8F6' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.color='#374151'; e.currentTarget.style.background='#fff' }}>
            See How It Works
          </button>
        </div>

        {/* Stat bar */}
        <div className="s-fade" style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:0, background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:16, overflow:'hidden', maxWidth:560, width:'100%', marginBottom:64, animationDelay:'.4s' }}>
          {STATS.map((s,i) => (
            <div key={s.label} style={{ flex:'1 1 120px', padding:'18px 12px', textAlign:'center', borderRight:i<3?'1px solid #E5E7EB':'none' }}>
              <div style={{ fontSize:22, fontWeight:800, color:B.primary }}>{s.val}</div>
              <div style={{ fontSize:10, color:'#9CA3AF', marginTop:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard preview */}
        <div className="s-fade s-float" style={{ width:'100%', maxWidth:880, animationDelay:'.5s' }}>
          <DashMockup />
        </div>
      </section>

      {/* ══ SOCIAL PROOF STRIP ══════════════════════════════════ */}
      <section style={{ background:'#F9FAFB', borderTop:'1px solid #E5E7EB', borderBottom:'1px solid #E5E7EB', padding:'24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#D1D5DB', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:18 }}>Trusted by businesses across India</p>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', alignItems:'center', gap:'6px 36px' }}>
            {['GSRTC','PM Awas Yojana','IFFCO','Apollo Hospitals','Reliance Jio','Nykaa'].map(b => (
              <span key={b} style={{ fontSize:13, fontWeight:700, color:'#D1D5DB', letterSpacing:'-0.01em' }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ USE CASES ════════════════════════════════════════════ */}
      <section id="use-cases" style={{ padding:'100px 24px', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <Pill>Use Cases</Pill>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0 12px' }}>
              Any Industry.<br /><span style={{ ...B.gradText }}>Any Language.</span>
            </h2>
            <p style={{ fontSize:16, color:'#6B7280', maxWidth:420, margin:'0 auto' }}>One platform. Every outbound call use case.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:14 }}>
            {USE_CASES.map((u,i) => (
              <div key={u.title} className="use-card hover-lift"
                onClick={() => setActiveCase(i)}
                style={{
                  padding:'26px 28px', borderRadius:18, cursor:'pointer',
                  background: activeCase===i ? '#FFF8F6' : '#F9FAFB',
                  border:`1.5px solid ${activeCase===i ? B.primary : '#E5E7EB'}`,
                  boxShadow: activeCase===i ? `0 4px 24px rgba(255,107,53,.12)` : 'none',
                }}>
                <div style={{ fontSize:30, marginBottom:14 }}>{u.icon}</div>
                <h3 style={{ fontSize:16, fontWeight:800, color:'#0f0f0f', marginBottom:8, letterSpacing:'-0.01em' }}>{u.title}</h3>
                <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.75 }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════ */}
      <section id="features" style={{ padding:'100px 24px', background:'#0f0f0f', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translateX(-50%)', width:700, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,53,.07) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <Pill color="#FF8C42">Features</Pill>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#fff', margin:'16px 0 12px' }}>Everything to Scale Your<br /><span style={{ ...B.gradText }}>Voice Operations</span></h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.4)', maxWidth:420, margin:'0 auto' }}>From Gujarati reminders to political surveys — one platform handles it all.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:12 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card"
                style={{ padding:'26px 28px', borderRadius:16, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
                <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
                <h3 style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:8, letterSpacing:'-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', lineHeight:1.75 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding:'100px 24px', background:'#F7F8FA' }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <Pill>How It Works</Pill>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0' }}>
              Launch in <span style={{ ...B.gradText }}>4 Simple Steps</span>
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:16, position:'relative' }}>
            {STEPS.map((s,i) => (
              <div key={s.n} className="step-card"
                style={{ padding:'28px 24px', borderRadius:18, background:'#fff', border:'1.5px solid #E5E7EB', position:'relative' }}>
                <div style={{ fontSize:40, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, marginBottom:14, ...B.gradText }}>{s.n}</div>
                <div style={{ fontSize:26, marginBottom:12 }}>{s.icon}</div>
                <h3 style={{ fontSize:15, fontWeight:800, color:'#0f0f0f', marginBottom:8, letterSpacing:'-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.75 }}>{s.desc}</p>
                {i < 3 && (
                  <div style={{ position:'absolute', top:'36%', right:-14, fontSize:18, color:'#E5E7EB', fontWeight:700, zIndex:1 }} className="hidden lg:block">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══════════════════════════════════════════ */}
      <section style={{ padding:'100px 24px', background:`linear-gradient(160deg,#1a0a05 0%,#0f0f0f 60%,#0a0a14 100%)`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,107,53,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,107,53,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px', pointerEvents:'none' }} />
        <div className="s-spin" style={{ position:'absolute', top:'10%', right:'10%', width:300, height:300, borderRadius:'50%', border:'1px dashed rgba(255,107,53,.12)' }} />

        <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <div style={{ width:64, height:64, background:'rgba(255,107,53,.15)', border:'1px solid rgba(255,107,53,.25)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:28 }}>🚀</div>

          <h2 style={{ fontSize:'clamp(28px,4.5vw,52px)', fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.08, color:'#fff', marginBottom:18 }}>
            Ready to Automate Your<br /><span style={{ ...B.gradText }}>Outbound Calls?</span>
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.45)', marginBottom:40, lineHeight:1.75 }}>
            Set up your first campaign in under 5 minutes.<br />No technical knowledge required. Just upload a CSV and go.
          </p>

          {/* Feature checklist */}
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 28px', marginBottom:40 }}>
            {['Gujarati, Hindi & English','No credit card needed','TRAI compliant','Auto-rescheduling','Live call dashboard','Google Sheets sync'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, color:'rgba(255,255,255,.55)' }}>
                <span style={{ width:16, height:16, borderRadius:'50%', background:'rgba(255,107,53,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke={B.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {f}
              </div>
            ))}
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
            <button onClick={goSignup}
              style={{ padding:'14px 36px', borderRadius:12, fontSize:15, fontWeight:800, color:'#fff', background:B.grad, border:'none', cursor:'pointer', boxShadow:B.glowLg, transition:'all .2s', display:'flex', alignItems:'center', gap:8 }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 48px rgba(255,107,53,.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=B.glowLg }}>
              Create Free Account →
            </button>
            <button onClick={goLogin}
              style={{ padding:'14px 28px', borderRadius:12, fontSize:15, fontWeight:600, color:'rgba(255,255,255,.7)', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.color='#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.07)'; e.currentTarget.style.color='rgba(255,255,255,.7)' }}>
              Sign In
            </button>
          </div>

          <p style={{ fontSize:11, color:'rgba(255,255,255,.2)', marginTop:20 }}>Made in India 🇮🇳 · TRAI Compliant · RiseAscend Technologies</p>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer style={{ background:'#0a0a0a', padding:'56px 24px 32px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:40, marginBottom:48 }}>

            <div style={{ gridColumn:'span 2' }}>
              <div style={{ marginBottom:16 }}><Logo dark size="sm" /></div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.3)', lineHeight:1.8, maxWidth:260 }}>
                AI-powered voice call automation for Indian businesses. Built by RiseAscend Technologies, Ahmedabad.
              </p>
              <div style={{ display:'flex', gap:8, marginTop:18, flexWrap:'wrap' }}>
                {['TRAI Compliant','Made in India 🇮🇳','SOC 2 Ready'].map(t => (
                  <span key={t} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', fontSize:10, color:'rgba(255,255,255,.25)', fontWeight:600 }}>{t}</span>
                ))}
              </div>
            </div>

            <div>
              <h5 style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:20 }}>Product</h5>
              {['Features','Use Cases','How It Works','Pricing','Simulator'].map(l => (
                <div key={l} style={{ marginBottom:10 }}>
                  <a href="#" style={{ fontSize:13, color:'rgba(255,255,255,.3)', textDecoration:'none', transition:'color .15s', fontWeight:500 }}
                    onMouseEnter={e => e.target.style.color=B.primary}
                    onMouseLeave={e => e.target.style.color='rgba(255,255,255,.3)'}>{l}</a>
                </div>
              ))}
            </div>

            <div>
              <h5 style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:20 }}>Company</h5>
              {[['RiseAscend Tech','https://riseascendtech.com'],['About','#'],['Contact','#'],['Careers','#'],['Blog','#']].map(([l,h]) => (
                <div key={l} style={{ marginBottom:10 }}>
                  <a href={h} target={h.startsWith('http')?'_blank':undefined} rel="noopener noreferrer"
                    style={{ fontSize:13, color:'rgba(255,255,255,.3)', textDecoration:'none', transition:'color .15s', fontWeight:500 }}
                    onMouseEnter={e => e.target.style.color=B.primary}
                    onMouseLeave={e => e.target.style.color='rgba(255,255,255,.3)'}>{l}</a>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:24, display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.18)' }}>© 2026 RiseAscend Technologies Pvt. Ltd. · Ahmedabad, India</p>
            <div style={{ display:'flex', gap:24 }}>
              {['Privacy Policy','Terms of Service'].map(l => (
                <a key={l} href="#" style={{ fontSize:11, color:'rgba(255,255,255,.18)', textDecoration:'none', transition:'color .15s' }}
                  onMouseEnter={e => e.target.style.color='rgba(255,255,255,.5)'}
                  onMouseLeave={e => e.target.style.color='rgba(255,255,255,.18)'}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
