import Logo from '../components/Logo'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  // Indigo-Blue gradient system
  grad:       'linear-gradient(135deg, #6366F1 0%, #4F46E5 40%, #3B82F6 100%)',
  gradVibrant:'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #3B82F6 100%)',
  gradText: {
    background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #3B82F6 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  gradHero: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 35%, #1d4ed8 75%, #0ea5e9 100%)',
  primary:  '#6366F1',
  blue:     '#3B82F6',
  light:    '#EEF2FF',
  border:   '#C7D2FE',
  glow:     '0 4px 24px rgba(99,102,241,0.35)',
  glowLg:   '0 8px 40px rgba(99,102,241,0.50)',
  // Keep saffron for brand accents only
  brand:    '#FF6B35',
  brandGrad:'linear-gradient(135deg,#FF8C42,#FF6B35)',
}

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
  { icon:'📞', title:'Bulk Outbound Calling', desc:'Upload a CSV, launch thousands of calls in one click with auto-retry.' },
  { icon:'🔄', title:'Smart Rescheduling',    desc:'"Call me at 3pm" — AI understands any language and schedules the callback.' },
  { icon:'📊', title:'Live Dashboard',        desc:'Real-time transcripts, outcomes and collected data — all visible instantly.' },
  { icon:'📋', title:'Google Sheets Sync',    desc:'Every call result auto-appends to your spreadsheet.' },
  { icon:'👤', title:'Human Handoff',         desc:'"Talk to a human?" — AI transfers instantly to your agent.' },
]

const STEPS = [
  { n:'01', icon:'📤', title:'Upload Contacts',  desc:'CSV with phone numbers, names, and any variables.' },
  { n:'02', icon:'✍️', title:'Write Script',     desc:'Paste your script or upload a PDF. Use {{name}} placeholders.' },
  { n:'03', icon:'🤖', title:'Configure Agent',  desc:'Pick language, agent name, tone, what data to collect.' },
  { n:'04', icon:'🚀', title:'Launch & Watch',   desc:'Hit launch. Live transcripts and outcomes in real-time.' },
]

function WaveBars({ color = C.primary, size = 14 }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'flex-end', gap:2.5, height:size }}>
      {[0,.15,.30,.45,.60].map((d,i) => (
        <span key={i} style={{ display:'block', width:2.5, height:size, borderRadius:2, background:color, transformOrigin:'bottom', animation:`lp-wave 1.1s ease-in-out ${d}s infinite` }}/>
      ))}
    </span>
  )
}

// Mini dashboard mockup in hero
function HeroMockup() {
  return (
    <div style={{ background:'#fff', borderRadius:20, overflow:'hidden', boxShadow:'0 24px 80px rgba(99,102,241,.25), 0 4px 20px rgba(0,0,0,.08)', border:'1px solid #E0E7FF' }}>
      {/* Browser bar */}
      <div style={{ background:'#F5F3FF', padding:'10px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #DDD6FE' }}>
        <div style={{ display:'flex', gap:5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }}/>)}
        </div>
        <div style={{ flex:1, background:'#EDE9FE', borderRadius:6, padding:'3px 12px', fontSize:10, color:'#7C3AED', marginLeft:8, border:'1px solid #DDD6FE' }}>
          app.samwad.ai/dashboard
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'140px 1fr', minHeight:230 }}>
        {/* Sidebar */}
        <div style={{ background:'#FAFAFE', borderRight:'1px solid #EDE9FE', padding:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, paddingBottom:10, borderBottom:'1px solid #EDE9FE' }}>
            <div style={{ width:24, height:24, borderRadius:7, background:C.grad, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" fill="white"/><path d="M5 10C5 14.418 8.134 18 12 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>
            </div>
            <span style={{ fontSize:10, fontWeight:800, color:'#0f0f0f' }}>SamwadAI</span>
          </div>
          {[['📊','Dashboard',true],['📢','Campaigns',false],['💰','Wallet',false],['⚙️','Settings',false]].map(([ic,l,a]) => (
            <div key={l} style={{ padding:'7px 8px', borderRadius:7, marginBottom:2, background:a?'#EEF2FF':'transparent', fontSize:10, color:a?C.primary:'#9CA3AF', fontWeight:a?700:400, display:'flex', alignItems:'center', gap:6 }}>
              <span>{ic}</span>{l}
            </div>
          ))}
          <div style={{ marginTop:10, padding:'9px 10px', borderRadius:10, background:'linear-gradient(135deg,#EEF2FF,#E0E7FF)', border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:8, color:C.primary, fontWeight:700, marginBottom:3, textTransform:'uppercase', letterSpacing:'.06em' }}>Wallet</div>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f0f0f' }}>₹1,842</div>
          </div>
        </div>
        {/* Main */}
        <div style={{ padding:14, background:'#fff' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7, marginBottom:12 }}>
            {[['284','Today','#EEF2FF',C.primary],['78%','Rate','#DCFCE7','#15803D'],['₹842','Wallet','#FFF4F0','#EA580C'],['3','Active','#F0F9FF','#0284C7']].map(([v,l,bg,cl]) => (
              <div key={l} style={{ background:bg, border:`1px solid ${cl}20`, borderRadius:9, padding:'9px 8px', textAlign:'center' }}>
                <div style={{ fontSize:14, fontWeight:800, color:cl }}>{v}</div>
                <div style={{ fontSize:8, color:cl, fontWeight:600, marginTop:2, opacity:.7, textTransform:'uppercase', letterSpacing:'.05em' }}>{l}</div>
              </div>
            ))}
          </div>
          {/* Mini bar chart */}
          <div style={{ background:'#FAFAFE', borderRadius:10, padding:'10px 12px', border:`1px solid #EDE9FE`, marginBottom:10 }}>
            <div style={{ fontSize:9, fontWeight:700, color:C.primary, marginBottom:7, textTransform:'uppercase', letterSpacing:'.06em' }}>Calls This Month</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:36 }}>
              {[60,80,45,100,70,55,85,65,90,75,50,95,60,88].map((h,i) => (
                <div key={i} style={{ flex:1, height:`${h}%`, background:i===3||i===8||i===13?C.grad:`${C.primary}30`, borderRadius:2 }}/>
              ))}
            </div>
          </div>
          {/* Campaign rows */}
          <div style={{ background:'#FAFAFE', borderRadius:10, overflow:'hidden', border:'1px solid #EDE9FE' }}>
            {[['Bus Reminder','75','#10B981'],['PM Awas Survey','48',C.primary],['Hospital Follow-up','91','#F59E0B']].map(([n,p,c]) => (
              <div key={n} style={{ display:'grid', gridTemplateColumns:'1fr 70px 28px', padding:'7px 10px', borderBottom:'1px solid #F5F3FF', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:9, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n}</span>
                <div style={{ height:3, background:'#EDE9FE', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:3, width:`${p}%`, background:c, borderRadius:99 }}/>
                </div>
                <span style={{ fontSize:9, fontWeight:700, color:c, textAlign:'right' }}>{p}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

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
    <div style={{ fontFamily:'"Plus Jakarta Sans","DM Sans",sans-serif', background:'#FAFBFF', color:'#0f0f0f', overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes lp-wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
        @keyframes lp-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes lp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .lp-fade{animation:lp-fade-up .6s ease-out both}
        .lp-float{animation:lp-float 5s ease-in-out infinite}
        .lp-spin{animation:lp-spin 22s linear infinite}
        .lp-btn-primary:hover{transform:translateY(-2px)!important;box-shadow:0 12px 48px rgba(99,102,241,.55)!important}
        .lp-btn-outline:hover{border-color:${C.primary}!important;color:${C.primary}!important;background:#EEF2FF!important}
        .lp-nav-link:hover{color:${C.primary}!important}
        .lp-feature:hover{border-color:${C.primary}40!important;background:#FAFAFE!important;transform:translateY(-2px)}
        .lp-feature{transition:all .2s}
        .lp-use:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(99,102,241,.14)}
        .lp-use{transition:all .2s}
        .lp-step:hover{border-color:${C.border}!important}
        .lp-step{transition:border-color .2s}
      `}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════════ */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        background: scrolled ? 'rgba(250,251,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition:'all .3s',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:66, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ cursor:'pointer' }} onClick={() => navigate('/')}><Logo size="sm"/></div>
          <div style={{ display:'flex', alignItems:'center', gap:36 }} className="hidden lg:flex">
            {[['Features','features'],['How It Works','how-it-works'],['Use Cases','use-cases']].map(([l,id]) => (
              <button key={l} onClick={() => scrollTo(id)} style={{ fontSize:14, fontWeight:500, color:'#4B5563', background:'none', border:'none', cursor:'pointer' }} className="lp-nav-link">{l}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }} className="hidden lg:flex">
            <button onClick={goLogin} className="lp-btn-outline"
              style={{ padding:'9px 20px', borderRadius:10, fontSize:13, fontWeight:600, color:'#374151', background:'#fff', border:`1.5px solid #E5E7EB`, cursor:'pointer', transition:'all .15s' }}>
              Sign In
            </button>
            <button onClick={goSignup} className="lp-btn-primary"
              style={{ padding:'9px 22px', borderRadius:10, fontSize:13, fontWeight:700, color:'#fff', background:C.grad, border:'none', cursor:'pointer', boxShadow:C.glow, transition:'all .2s' }}>
              Get Started Free →
            </button>
          </div>
          {/* Mobile toggle */}
          <button onClick={() => setMenuOpen(m=>!m)} style={{ background:'none', border:'none', cursor:'pointer', padding:8, display:'flex', flexDirection:'column', gap:5 }} className="block lg:hidden">
            {[0,1,2].map(i => <span key={i} style={{ display:'block', width:22, height:2, background:'#374151', borderRadius:2, transition:'all .2s', transform:menuOpen&&i===0?'rotate(45deg) translateY(7px)':menuOpen&&i===2?'rotate(-45deg) translateY(-7px)':'none', opacity:menuOpen&&i===1?0:1 }}/>)}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background:'#fff', borderTop:`1px solid ${C.border}`, padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            {['Features','How It Works','Use Cases'].map(l => (
              <button key={l} onClick={() => { scrollTo(l.toLowerCase().replace(/ /g,'-')); setMenuOpen(false) }} style={{ fontSize:14, fontWeight:500, color:'#374151', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'6px 0' }}>{l}</button>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={goLogin}  style={{ flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:600, background:'#F9FAFB', color:'#374151', border:'1px solid #E5E7EB', cursor:'pointer' }}>Sign In</button>
              <button onClick={goSignup} style={{ flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:700, background:C.grad, color:'#fff', border:'none', cursor:'pointer' }}>Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'130px 24px 90px', position:'relative', overflow:'hidden', background:'#fff' }}>
        {/* Background */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'5%', right:'8%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 70%)' }}/>
          <div style={{ position:'absolute', bottom:'10%', left:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,130,246,.05) 0%,transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(rgba(99,102,241,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.025) 1px,transparent 1px)`, backgroundSize:'56px 56px' }}/>
          <div className="lp-spin" style={{ position:'absolute', top:'12%', right:'10%', width:200, height:200, borderRadius:'50%', border:`1px dashed ${C.border}` }}/>
          <div className="lp-spin" style={{ position:'absolute', bottom:'18%', left:'6%', width:140, height:140, borderRadius:'50%', border:`1px dashed rgba(99,102,241,.15)`, animationDirection:'reverse' }}/>
        </div>

        {/* Badge */}
        <div className="lp-fade" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px 6px 10px', borderRadius:99, background:C.light, border:`1px solid ${C.border}`, marginBottom:28 }}>
          <WaveBars color={C.primary}/>
          <span style={{ fontSize:12, fontWeight:700, color:C.primary }}>AI Voice Calls · Gujarati · Hindi · English</span>
        </div>

        {/* Headline */}
        <h1 className="lp-fade" style={{ fontSize:'clamp(38px,6.5vw,76px)', fontWeight:800, lineHeight:1.06, letterSpacing:'-0.03em', color:'#0f0f0f', maxWidth:860, marginBottom:24, animationDelay:'.1s' }}>
          Your AI That Calls,<br/>
          <span style={{ ...C.gradText }}>Listens & Responds</span>
        </h1>

        <p className="lp-fade" style={{ fontSize:'clamp(15px,2vw,19px)', color:'#6B7280', maxWidth:520, lineHeight:1.75, marginBottom:40, animationDelay:'.2s' }}>
          Automate outbound voice campaigns at scale. Real two-way AI conversations in Gujarati, Hindi & English for any Indian business.
        </p>

        {/* CTAs */}
        <div className="lp-fade" style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:52, animationDelay:'.3s' }}>
          <button onClick={goSignup} className="lp-btn-primary"
            style={{ padding:'14px 32px', borderRadius:12, fontSize:15, fontWeight:800, color:'#fff', background:C.grad, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:C.glowLg, transition:'all .2s' }}>
            Start Free — No Card Needed
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onClick={() => scrollTo('how-it-works')} className="lp-btn-outline"
            style={{ padding:'14px 28px', borderRadius:12, fontSize:15, fontWeight:600, color:'#374151', background:'#fff', border:'1.5px solid #E5E7EB', cursor:'pointer', transition:'all .2s' }}>
            See How It Works
          </button>
        </div>

        {/* Stat strip */}
        <div className="lp-fade" style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:0, background:'#F8FAFF', border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden', maxWidth:560, width:'100%', marginBottom:64, animationDelay:'.4s' }}>
          {[['1M+','Calls Made'],['98%','Uptime'],['3','Languages'],['<2s','Response']].map((s,i) => (
            <div key={s[1]} style={{ flex:'1 1 120px', padding:'18px 12px', textAlign:'center', borderRight:i<3?`1px solid ${C.border}`:'none' }}>
              <div style={{ fontSize:22, fontWeight:800, ...C.gradText }}>{s[0]}</div>
              <div style={{ fontSize:10, color:'#9CA3AF', marginTop:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s[1]}</div>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="lp-fade lp-float" style={{ width:'100%', maxWidth:880, animationDelay:'.5s' }}>
          <HeroMockup/>
        </div>
      </section>

      {/* ══ SOCIAL PROOF ════════════════════════════════════════ */}
      <section style={{ background:'#F8FAFF', borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#C7D2FE', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:18 }}>Trusted by businesses across India</p>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', alignItems:'center', gap:'6px 36px' }}>
            {['GSRTC','PM Awas Yojana','IFFCO','Apollo Hospitals','Reliance Jio','Nykaa'].map(b => (
              <span key={b} style={{ fontSize:13, fontWeight:700, color:'#C7D2FE', letterSpacing:'-0.01em' }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ USE CASES ═══════════════════════════════════════════ */}
      <section id="use-cases" style={{ padding:'100px 24px', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:C.primary, background:C.light, border:`1px solid ${C.border}` }}>Use Cases</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0 12px' }}>
              Any Industry.<br/><span style={{ ...C.gradText }}>Any Language.</span>
            </h2>
            <p style={{ fontSize:16, color:'#6B7280', maxWidth:420, margin:'0 auto' }}>One platform. Every outbound call use case.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:14 }}>
            {USE_CASES.map((u,i) => (
              <div key={u.title} className="lp-use" onClick={() => setActiveCase(i)}
                style={{ padding:'26px 28px', borderRadius:18, cursor:'pointer', background:activeCase===i?C.light:'#F8FAFF', border:`1.5px solid ${activeCase===i?C.primary:C.border}`, boxShadow:activeCase===i?`0 4px 24px rgba(99,102,241,.12)`:'none' }}>
                <div style={{ fontSize:30, marginBottom:14 }}>{u.icon}</div>
                <h3 style={{ fontSize:16, fontWeight:800, color:'#0f0f0f', marginBottom:8, letterSpacing:'-0.01em' }}>{u.title}</h3>
                <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.75 }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════ */}
      <section id="features" style={{ padding:'100px 24px', background:C.gradHero, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translateX(-50%)', width:700, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,.05) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'#A5B4FC', background:'rgba(165,180,252,.12)', border:'1px solid rgba(165,180,252,.25)' }}>Features</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#fff', margin:'16px 0 12px' }}>
              Everything to Scale Your<br/><span style={{ background:'linear-gradient(135deg,#A5B4FC,#93C5FD)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Voice Operations</span>
            </h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.45)', maxWidth:420, margin:'0 auto' }}>From Gujarati reminders to political surveys — one platform.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:12 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature"
                style={{ padding:'26px 28px', borderRadius:16, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.10)' }}>
                <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
                <h3 style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:8 }}>{f.title}</h3>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', lineHeight:1.75 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding:'100px 24px', background:'#F8FAFF' }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:C.primary, background:C.light, border:`1px solid ${C.border}` }}>How It Works</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0' }}>
              Launch in <span style={{ ...C.gradText }}>4 Simple Steps</span>
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:16, position:'relative' }}>
            {STEPS.map((s,i) => (
              <div key={s.n} className="lp-step"
                style={{ padding:'28px 24px', borderRadius:18, background:'#fff', border:`1.5px solid ${C.border}`, position:'relative' }}>
                <div style={{ fontSize:40, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, marginBottom:14, ...C.gradText }}>{s.n}</div>
                <div style={{ fontSize:26, marginBottom:12 }}>{s.icon}</div>
                <h3 style={{ fontSize:15, fontWeight:800, color:'#0f0f0f', marginBottom:8 }}>{s.title}</h3>
                <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.75 }}>{s.desc}</p>
                {i < 3 && <div style={{ position:'absolute', top:'36%', right:-14, fontSize:18, color:C.border, fontWeight:700, zIndex:1 }} className="hidden lg:block">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════════ */}
      <section style={{ padding:'100px 24px', background:`linear-gradient(160deg,#1e1b4b 0%,#312e81 50%,#1d4ed8 100%)`, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(rgba(165,180,252,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(165,180,252,0.05) 1px,transparent 1px)`, backgroundSize:'60px 60px', pointerEvents:'none' }}/>
        <div className="lp-spin" style={{ position:'absolute', top:'10%', right:'8%', width:300, height:300, borderRadius:'50%', border:'1px dashed rgba(165,180,252,.15)' }}/>
        <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <div style={{ width:64, height:64, background:'rgba(165,180,252,.15)', border:'1px solid rgba(165,180,252,.25)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:28 }}>🚀</div>
          <h2 style={{ fontSize:'clamp(28px,4.5vw,52px)', fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.08, color:'#fff', marginBottom:18 }}>
            Ready to Automate Your<br/><span style={{ background:'linear-gradient(135deg,#A5B4FC,#93C5FD)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Outbound Calls?</span>
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.45)', marginBottom:40, lineHeight:1.75 }}>
            Set up your first campaign in under 5 minutes.<br/>No technical knowledge required. Just upload a CSV.
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 28px', marginBottom:40 }}>
            {['Gujarati, Hindi & English','No credit card needed','TRAI compliant','Auto-rescheduling','Live dashboard','Google Sheets sync'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, color:'rgba(255,255,255,.55)' }}>
                <span style={{ width:16, height:16, borderRadius:'50%', background:'rgba(165,180,252,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {f}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center' }}>
            <button onClick={goSignup} className="lp-btn-primary"
              style={{ padding:'14px 36px', borderRadius:12, fontSize:15, fontWeight:800, color:'#fff', background:'linear-gradient(135deg,#818CF8,#6366F1)', border:'none', cursor:'pointer', boxShadow:'0 8px 40px rgba(99,102,241,.55)', transition:'all .2s', display:'flex', alignItems:'center', gap:8 }}>
              Create Free Account →
            </button>
            <button onClick={goLogin}
              style={{ padding:'14px 28px', borderRadius:12, fontSize:15, fontWeight:600, color:'rgba(255,255,255,.7)', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', cursor:'pointer', transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.12)';e.currentTarget.style.color='#fff'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.07)';e.currentTarget.style.color='rgba(255,255,255,.7)'}}>
              Sign In
            </button>
          </div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,.2)', marginTop:20 }}>Made in India 🇮🇳 · TRAI Compliant · RiseAscend Technologies</p>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer style={{ background:'#0a0a14', padding:'56px 24px 32px', borderTop:'1px solid rgba(99,102,241,.12)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:40, marginBottom:48 }}>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ marginBottom:16 }}><Logo dark size="sm"/></div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.3)', lineHeight:1.8, maxWidth:260 }}>AI-powered voice call automation for Indian businesses. Built by RiseAscend Technologies, Ahmedabad.</p>
              <div style={{ display:'flex', gap:8, marginTop:18, flexWrap:'wrap' }}>
                {['TRAI Compliant','Made in India 🇮🇳'].map(t => (
                  <span key={t} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.18)', fontSize:10, color:'rgba(255,255,255,.3)', fontWeight:600 }}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              <h5 style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:20 }}>Product</h5>
              {['Features','Use Cases','How It Works','Pricing','Simulator'].map(l => (
                <div key={l} style={{ marginBottom:10 }}>
                  <a href="#" style={{ fontSize:13, color:'rgba(255,255,255,.3)', textDecoration:'none', transition:'color .15s' }}
                    onMouseEnter={e=>e.target.style.color=C.primary} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.3)'}>{l}</a>
                </div>
              ))}
            </div>
            <div>
              <h5 style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:20 }}>Company</h5>
              {[['RiseAscend Tech','https://riseascendtech.com'],['About','#'],['Contact','#'],['Careers','#']].map(([l,h]) => (
                <div key={l} style={{ marginBottom:10 }}>
                  <a href={h} target={h.startsWith('http')?'_blank':undefined} rel="noopener noreferrer"
                    style={{ fontSize:13, color:'rgba(255,255,255,.3)', textDecoration:'none', transition:'color .15s' }}
                    onMouseEnter={e=>e.target.style.color=C.primary} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.3)'}>{l}</a>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(99,102,241,.1)', paddingTop:24, display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.18)' }}>© 2026 RiseAscend Technologies Pvt. Ltd. · Ahmedabad, India</p>
            <div style={{ display:'flex', gap:24 }}>
              {['Privacy Policy','Terms of Service'].map(l => (
                <a key={l} href="#" style={{ fontSize:11, color:'rgba(255,255,255,.18)', textDecoration:'none', transition:'color .15s' }}
                  onMouseEnter={e=>e.target.style.color='rgba(255,255,255,.5)'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.18)'}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
