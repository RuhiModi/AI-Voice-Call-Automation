import Logo from '../components/Logo'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const S = {
  grad:     'linear-gradient(135deg,#38BDF8 0%,#0EA5E9 50%,#0284C7 100%)',
  glow:     '0 4px 24px rgba(14,165,233,.35)',
  glowLg:   '0 8px 48px rgba(14,165,233,.50)',
  light:    '#F0F9FF',
  border:   '#BAE6FD',
  primary:  '#0EA5E9',
  dark:     '#0284C7',
  deep:     '#0369A1',
  gradText: { background:'linear-gradient(135deg,#38BDF8,#0EA5E9,#0284C7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
  heroGrad: 'linear-gradient(160deg,#0C4A6E 0%,#075985 30%,#0284C7 65%,#38BDF8 100%)',
}

const FEATURES = [
  { icon:'🗣️', n:'01', title:'Gujarati-First AI',    desc:'Auto-detects & switches between Gujarati, Hindi & English mid-call.' },
  { icon:'📞', n:'02', title:'Bulk Outbound Calling', desc:'Upload CSV, launch thousands of concurrent calls with auto-retry.' },
  { icon:'🔄', n:'03', title:'Smart Rescheduling',    desc:'"Call me at 3pm" — AI understands and auto-schedules callbacks.' },
  { icon:'📊', n:'04', title:'Live Dashboard',        desc:'Real-time transcripts, outcomes, collected data — all visible.' },
  { icon:'📋', n:'05', title:'Sheets Sync',           desc:'Every call result auto-appends to your Google spreadsheet.' },
  { icon:'👤', n:'06', title:'Human Handoff',         desc:'"Talk to a human?" — AI transfers instantly, no gap.' },
]

const USE_CASES = [
  { icon:'🚌', title:'Transport',    color:'#0EA5E9', bg:'#E0F2FE' },
  { icon:'🏛️', title:'Government',   color:'#8B5CF6', bg:'#F5F3FF' },
  { icon:'🏥', title:'Healthcare',   color:'#10B981', bg:'#ECFDF5' },
  { icon:'🏦', title:'Finance',      color:'#F59E0B', bg:'#FFFBEB' },
  { icon:'🛒', title:'E-commerce',   color:'#EF4444', bg:'#FEF2F2' },
  { icon:'🗳️', title:'Political',    color:'#6366F1', bg:'#EEF2FF' },
]

const STATS = [
  { val:'1M+',  label:'Calls Automated', icon:'📞' },
  { val:'98%',  label:'Uptime SLA',      icon:'⚡' },
  { val:'3',    label:'Languages',        icon:'🗣️' },
  { val:'<2s',  label:'AI Response',     icon:'🚀' },
]

const STEPS = [
  { n:1, title:'Upload Contacts',  desc:'CSV with phone numbers and any custom variables.' },
  { n:2, title:'Write Your Script',desc:'Paste a script or upload PDF. Use {{name}} placeholders.' },
  { n:3, title:'Configure Agent',  desc:'Set language, persona, tone, data fields to collect.' },
  { n:4, title:'Launch & Monitor', desc:'Hit launch. Watch live transcripts appear in real-time.' },
]

function WaveIcon({ color='#0EA5E9', size=14 }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'flex-end', gap:2.5, height:size }}>
      {[0,.15,.30,.45,.60].map((d,i) => (
        <span key={i} style={{ display:'block', width:2.5, height:size, borderRadius:2, background:color, transformOrigin:'bottom', animation:`lp-wave 1.1s ease-in-out ${d}s infinite` }}/>
      ))}
    </span>
  )
}

// The hero "phone UI" mockup — feels like a real product
function PhoneMockup() {
  const [activeCall, setActiveCall] = useState(0)
  const calls = [
    { name:'Ramesh Patel', phone:'+91 98765 43210', lang:'gu', status:'Live', outcome:'Answered', dur:'1m 24s' },
    { name:'Priya Shah',   phone:'+91 87654 32109', lang:'hi', status:'Done', outcome:'Confirmed', dur:'2m 05s' },
    { name:'Suresh Modi',  phone:'+91 76543 21098', lang:'en', status:'Done', outcome:'Rescheduled',dur:'0m 48s' },
  ]
  useEffect(() => {
    const t = setInterval(() => setActiveCall(a => (a+1)%3), 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ position:'relative', maxWidth:380, margin:'0 auto' }}>
      {/* Glow under mockup */}
      <div style={{ position:'absolute', bottom:-30, left:'50%', transform:'translateX(-50%)', width:300, height:60, background:'radial-gradient(ellipse,rgba(14,165,233,.4) 0%,transparent 70%)', borderRadius:'50%', filter:'blur(12px)' }}/>

      {/* Phone frame */}
      <div style={{ background:'#0C4A6E', borderRadius:28, padding:16, boxShadow:'0 24px 60px rgba(3,105,161,.50), inset 0 1px 0 rgba(255,255,255,.12)', position:'relative', zIndex:1 }}>
        {/* Screen */}
        <div style={{ background:'#F0F9FF', borderRadius:18, overflow:'hidden' }}>
          {/* Status bar */}
          <div style={{ background:'#0EA5E9', padding:'10px 16px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#fff' }}>SamwadAI Live</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ADE80', animation:'lp-ping 1.5s ease-in-out infinite' }}/>
              <span style={{ fontSize:10, color:'rgba(255,255,255,.85)', fontWeight:600 }}>3 Active</span>
            </div>
          </div>

          {/* Campaign header */}
          <div style={{ padding:'12px 14px 8px', borderBottom:'1px solid #E0F2FE' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <p style={{ fontSize:12, fontWeight:800, color:'#0f0f0f', margin:0 }}>Bus Driver Reminder</p>
                <p style={{ fontSize:10, color:'#9CA3AF', margin:'2px 0 0' }}>186 / 248 completed</p>
              </div>
              <span style={{ fontSize:16, fontWeight:900, ...S.gradText }}>75%</span>
            </div>
            <div style={{ height:4, background:'#E0F2FE', borderRadius:99, overflow:'hidden', marginTop:8 }}>
              <div style={{ height:4, width:'75%', background:S.grad, borderRadius:99 }}/>
            </div>
          </div>

          {/* Call list */}
          <div style={{ padding:'8px 14px 14px' }}>
            {calls.map((c, i) => (
              <div key={i} onClick={() => setActiveCall(i)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:12, marginBottom:4, background:activeCall===i?'#E0F2FE':'transparent', transition:'background .3s', cursor:'pointer' }}>
                <div style={{ width:32, height:32, borderRadius:10, background:activeCall===i?S.grad:'#F0F9FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:activeCall===i?'#fff':'#0EA5E9', flexShrink:0, transition:'all .3s' }}>
                  {c.name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#0f0f0f', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    {activeCall===i && <span style={{ width:5, height:5, borderRadius:'50%', background:'#4ADE80', flexShrink:0, animation:'lp-ping 1.5s ease-in-out infinite' }}/>}
                    <span style={{ fontSize:10, color:'#9CA3AF' }}>{c.status === 'Live' ? `Speaking... ${c.dur}` : c.outcome}</span>
                  </div>
                </div>
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20, background:c.status==='Live'?'#DCFCE7':'#E0F2FE', color:c.status==='Live'?'#065F46':S.dark }}>{c.status==='Live'?'Live':c.dur}</span>
              </div>
            ))}

            {/* Live transcript snippet */}
            <div style={{ background:'#fff', borderRadius:12, padding:'10px 12px', border:'1px solid #BAE6FD', marginTop:6 }}>
              <p style={{ fontSize:9, fontWeight:700, color:S.primary, textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 6px' }}>Live Transcript</p>
              <div style={{ display:'flex', gap:7, marginBottom:6 }}>
                <div style={{ width:18, height:18, borderRadius:'50%', background:S.grad, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:9 }}>🤖</span>
                </div>
                <p style={{ fontSize:11, color:'#374151', margin:0, lineHeight:1.4 }}>
                  "નમસ્તે Ramesh ભાઈ, આજે bus 08:30 વાગ્યે..."
                </p>
              </div>
              <div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
                <p style={{ fontSize:11, color:'#fff', background:S.grad, borderRadius:'10px 2px 10px 10px', padding:'4px 10px', margin:0, maxWidth:'80%', lineHeight:1.4 }}>
                  "હા, સમજ્યો"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat pills */}
      <div style={{ position:'absolute', top:20, right:-70, background:'#fff', borderRadius:12, padding:'8px 12px', boxShadow:'0 4px 20px rgba(14,165,233,.2)', border:`1px solid ${S.border}` }}>
        <p style={{ fontSize:11, fontWeight:800, color:'#0f0f0f', margin:0 }}>78% <span style={{ color:'#10B981' }}>↑</span></p>
        <p style={{ fontSize:9, color:'#9CA3AF', margin:'1px 0 0', fontWeight:600 }}>Answer rate</p>
      </div>
      <div style={{ position:'absolute', bottom:60, left:-60, background:'#fff', borderRadius:12, padding:'8px 12px', boxShadow:'0 4px 20px rgba(14,165,233,.2)', border:`1px solid ${S.border}` }}>
        <p style={{ fontSize:11, fontWeight:800, ...S.gradText, margin:0 }}>₹1.00/min</p>
        <p style={{ fontSize:9, color:'#9CA3AF', margin:'1px 0 0', fontWeight:600 }}>Pay as you go</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [activeUse, setActiveUse] = useState(0)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveUse(a => (a+1)%USE_CASES.length), 2800)
    return () => clearInterval(t)
  }, [])

  const go = path => navigate(path)

  return (
    <div style={{ fontFamily:'"Plus Jakarta Sans","DM Sans",sans-serif', background:'#fff', color:'#0f0f0f', overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes lp-wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
        @keyframes lp-ping{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes lp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes lp-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lp-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .lp-float{animation:lp-float 4s ease-in-out infinite}
        .lp-spin{animation:lp-spin 20s linear infinite}
        .lp-fade{animation:lp-fade-up .6s ease-out both}
      `}</style>

      {/* ══ NAV ══ */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        background: scrolled ? 'rgba(255,255,255,.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${S.border}` : '1px solid transparent',
        transition:'all .3s',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:66, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ cursor:'pointer' }} onClick={() => go('/')}><Logo size="sm"/></div>

          <div style={{ display:'flex', alignItems:'center', gap:36 }} className="hidden lg:flex">
            {[['Features','#features'],['How It Works','#how'],['Use Cases','#cases'],['Pricing','#pricing']].map(([l,h]) => (
              <a key={l} href={h} style={{ fontSize:14, fontWeight:500, color:'#4B5563', textDecoration:'none', transition:'color .15s' }}
                onMouseEnter={e=>e.target.style.color=S.primary} onMouseLeave={e=>e.target.style.color='#4B5563'}>{l}</a>
            ))}
          </div>

          <div style={{ display:'flex', gap:10 }} className="hidden lg:flex">
            <button onClick={() => go('/login')} style={{ padding:'9px 20px', borderRadius:10, fontSize:13, fontWeight:600, color:'#374151', background:'#fff', border:`1.5px solid ${S.border}`, cursor:'pointer', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=S.primary;e.currentTarget.style.color=S.primary}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=S.border;e.currentTarget.style.color='#374151'}}>
              Sign In
            </button>
            <button onClick={() => go('/login?tab=signup')} style={{ padding:'9px 22px', borderRadius:10, fontSize:13, fontWeight:700, color:'#fff', background:S.grad, border:'none', cursor:'pointer', boxShadow:S.glow, transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow=S.glowLg;e.currentTarget.style.transform='translateY(-1px)'}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow=S.glow;e.currentTarget.style.transform='none'}}>
              Get Started Free →
            </button>
          </div>

          <button onClick={() => setMenuOpen(m=>!m)} style={{ background:'none', border:'none', cursor:'pointer', padding:8, display:'flex', flexDirection:'column', gap:5 }} className="block lg:hidden">
            {[0,1,2].map(i => <span key={i} style={{ display:'block', width:22, height:2, background:'#374151', borderRadius:2, transition:'all .2s', transform:menuOpen&&i===0?'rotate(45deg) translateY(7px)':menuOpen&&i===2?'rotate(-45deg) translateY(-7px)':'none', opacity:menuOpen&&i===1?0:1 }}/>)}
          </button>
        </div>
        {menuOpen && (
          <div style={{ background:'#fff', borderTop:`1px solid ${S.border}`, padding:'16px 24px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            {[['Features','#features'],['How It Works','#how'],['Use Cases','#cases']].map(([l,h]) => (
              <a key={l} href={h} onClick={()=>setMenuOpen(false)} style={{ fontSize:14, fontWeight:500, color:'#374151', textDecoration:'none', padding:'6px 0' }}>{l}</a>
            ))}
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={()=>go('/login')}           style={{ flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:600, background:S.light, color:S.dark, border:`1px solid ${S.border}`, cursor:'pointer' }}>Sign In</button>
              <button onClick={()=>go('/login?tab=signup')} style={{ flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:700, background:S.grad, color:'#fff', border:'none', cursor:'pointer' }}>Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO — split layout ══ */}
      <section style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', alignItems:'center', gap:40, maxWidth:1200, margin:'0 auto', padding:'120px 40px 80px', position:'relative' }} className="block lg:grid">
        {/* Decorative bg */}
        <div style={{ position:'fixed', top:0, left:0, right:0, height:'100vh', pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-20%', right:'-10%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,.08) 0%,transparent 70%)' }}/>
          <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,.06) 0%,transparent 70%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(rgba(14,165,233,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.025) 1px,transparent 1px)`, backgroundSize:'56px 56px' }}/>
        </div>

        {/* Left — text */}
        <div style={{ position:'relative', zIndex:1 }}>
          {/* Badge */}
          <div className="lp-fade" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px 6px 8px', borderRadius:99, background:S.light, border:`1px solid ${S.border}`, marginBottom:28 }}>
            <WaveIcon color={S.primary}/>
            <span style={{ fontSize:12, fontWeight:700, color:S.dark }}>AI Voice Calls · Gujarati · Hindi · English</span>
          </div>

          <h1 className="lp-fade" style={{ fontSize:'clamp(34px,4.5vw,58px)', fontWeight:800, lineHeight:1.08, letterSpacing:'-0.03em', color:'#0f0f0f', marginBottom:20, animationDelay:'.1s' }}>
            The AI That Calls<br/>
            <span style={{ ...S.gradText }}>Your Customers</span><br/>
            <span style={{ color:'#374151', fontWeight:600, fontSize:'0.75em' }}>in Their Language</span>
          </h1>

          <p className="lp-fade" style={{ fontSize:17, color:'#6B7280', lineHeight:1.75, marginBottom:36, maxWidth:440, animationDelay:'.2s' }}>
            Automate outbound voice campaigns at scale. Real two-way AI conversations in Gujarati, Hindi & English — for any Indian business.
          </p>

          <div className="lp-fade" style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:44, animationDelay:'.3s' }}>
            <button onClick={() => go('/login?tab=signup')}
              style={{ padding:'14px 28px', borderRadius:12, fontSize:15, fontWeight:800, color:'#fff', background:S.grad, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:S.glowLg, transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 48px rgba(14,165,233,.55)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=S.glowLg}}>
              Start Free — No Card
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <a href="#how" style={{ padding:'14px 24px', borderRadius:12, fontSize:15, fontWeight:600, color:'#374151', background:'#fff', border:`1.5px solid ${S.border}`, cursor:'pointer', textDecoration:'none', transition:'all .2s', display:'inline-flex', alignItems:'center', gap:8 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=S.primary;e.currentTarget.style.color=S.primary;e.currentTarget.style.background=S.light}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=S.border;e.currentTarget.style.color='#374151';e.currentTarget.style.background='#fff'}}>
              ▶ Watch Demo
            </a>
          </div>

          {/* Stat chips */}
          <div className="lp-fade" style={{ display:'flex', gap:20, flexWrap:'wrap', animationDelay:'.4s' }}>
            {STATS.map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:S.light, border:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{s.icon}</div>
                <div>
                  <p style={{ fontSize:16, fontWeight:900, ...S.gradText, margin:0, letterSpacing:'-0.02em' }}>{s.val}</p>
                  <p style={{ fontSize:10, color:'#9CA3AF', margin:0, fontWeight:600 }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — phone mockup */}
        <div className="lp-float hidden lg:block" style={{ position:'relative', zIndex:1, paddingLeft:20 }}>
          <PhoneMockup/>
        </div>
      </section>

      {/* ══ SCROLLING TRUST STRIP ══ */}
      <div style={{ background:S.light, borderTop:`1px solid ${S.border}`, borderBottom:`1px solid ${S.border}`, padding:'16px 0', overflow:'hidden' }}>
        <div style={{ display:'flex', animation:'lp-marquee 20s linear infinite', width:'200%' }}>
          {[...['GSRTC','PM Awas Yojana','IFFCO','Apollo Hospitals','Reliance Jio','Nykaa','HDFC Bank','Zomato','Ola','BigBasket'],...['GSRTC','PM Awas Yojana','IFFCO','Apollo Hospitals','Reliance Jio','Nykaa','HDFC Bank','Zomato','Ola','BigBasket']].map((b,i) => (
            <span key={i} style={{ fontSize:13, fontWeight:700, color:S.border, whiteSpace:'nowrap', padding:'0 32px' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ══ BENTO FEATURES GRID ══ */}
      <section id="features" style={{ padding:'100px 24px', background:'#fff', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:60 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:S.primary, background:S.light, border:`1px solid ${S.border}` }}>Everything You Need</span>
          <h2 style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0 12px' }}>
            Built for Scale.<br/><span style={{ ...S.gradText }}>Built for India.</span>
          </h2>
        </div>

        {/* Bento grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gridTemplateRows:'auto auto', gap:14 }}>
          {/* Big card */}
          <div style={{ gridColumn:'span 2', background:S.heroGrad, borderRadius:24, padding:'36px 40px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
            <div style={{ fontSize:36, marginBottom:16 }}>🗣️</div>
            <h3 style={{ fontSize:24, fontWeight:800, color:'#fff', marginBottom:10, letterSpacing:'-0.02em' }}>Gujarati-First AI</h3>
            <p style={{ fontSize:15, color:'rgba(255,255,255,.65)', lineHeight:1.7, maxWidth:380 }}>Automatically detects and switches between Gujarati, Hindi & English mid-conversation. Your contacts always hear their language.</p>
            <div style={{ display:'flex', gap:8, marginTop:20, flexWrap:'wrap' }}>
              {['ગુજ','हिं','ENG'].map(l => <span key={l} style={{ padding:'4px 12px', borderRadius:20, background:'rgba(255,255,255,.12)', fontSize:12, fontWeight:700, color:'rgba(255,255,255,.85)' }}>{l}</span>)}
            </div>
          </div>

          {/* Tall right card */}
          <div style={{ background:S.light, borderRadius:24, padding:'28px 28px', border:`1px solid ${S.border}`, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:32, marginBottom:14 }}>📞</div>
              <h3 style={{ fontSize:18, fontWeight:800, color:'#0f0f0f', marginBottom:8 }}>Bulk Calling</h3>
              <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.7 }}>Upload CSV, launch thousands of concurrent calls. Auto-retry, DNC list, schedule by time.</p>
            </div>
            <div style={{ background:S.grad, borderRadius:12, padding:'12px 16px', marginTop:16 }}>
              <p style={{ fontSize:22, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-0.03em' }}>10,000+</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.75)', margin:'2px 0 0', fontWeight:600 }}>Calls per hour</p>
            </div>
          </div>

          {/* Bottom row */}
          {FEATURES.slice(2).map(f => (
            <div key={f.n} style={{ background:'#fff', borderRadius:20, padding:'24px', border:`1px solid ${S.border}`, transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=S.primary;e.currentTarget.style.boxShadow=`0 4px 24px rgba(14,165,233,.12)`;e.currentTarget.style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=S.border;e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none'}}>
              <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
              <h3 style={{ fontSize:15, fontWeight:800, color:'#0f0f0f', marginBottom:6 }}>{f.title}</h3>
              <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.7, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ USE CASES — pill selector ══ */}
      <section id="cases" style={{ padding:'100px 24px', background:S.light }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:S.primary, background:'#fff', border:`1px solid ${S.border}` }}>Use Cases</span>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0 40px' }}>
            Any Industry. <span style={{ ...S.gradText }}>One Platform.</span>
          </h2>

          {/* Pill selector */}
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10, marginBottom:40 }}>
            {USE_CASES.map((u,i) => (
              <button key={u.title} onClick={() => setActiveUse(i)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, fontSize:14, fontWeight:activeUse===i?700:500, cursor:'pointer', transition:'all .2s', border:`1.5px solid ${activeUse===i?u.color:S.border}`, background:activeUse===i?u.bg:'#fff', color:activeUse===i?u.color:'#6B7280', fontFamily:'inherit' }}>
                <span style={{ fontSize:18 }}>{u.icon}</span> {u.title}
              </button>
            ))}
          </div>

          {/* Active use case detail */}
          <div style={{ background:'#fff', borderRadius:24, padding:'36px', border:`1px solid ${USE_CASES[activeUse].color}30`, boxShadow:`0 8px 32px ${USE_CASES[activeUse].color}12`, transition:'all .3s' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>{USE_CASES[activeUse].icon}</div>
            <h3 style={{ fontSize:22, fontWeight:800, color:'#0f0f0f', marginBottom:12 }}>{USE_CASES[activeUse].title}</h3>
            <p style={{ fontSize:15, color:'#6B7280', lineHeight:1.75, maxWidth:500, margin:'0 auto 24px' }}>
              {[
                'Driver reminders, departure alerts, route changes — auto-called to thousands in Gujarati.',
                'PM Awas, ration cards, pension schemes — verify beneficiaries at massive scale with AI.',
                'Appointment reminders, prescription follow-ups, health camp notifications — multilingual.',
                'Loan due dates, KYC verification, account update confirmations in regional languages.',
                'Order confirmations, delivery updates, feedback collection — personalised per customer.',
                'Voter outreach, event reminders, survey calls — multi-lingual, high volume, compliant.',
              ][activeUse]}
            </p>
            <button onClick={() => go('/login?tab=signup')} style={{ padding:'12px 28px', borderRadius:10, fontSize:14, fontWeight:700, color:'#fff', background:S.grad, border:'none', cursor:'pointer', boxShadow:S.glow, fontFamily:'inherit' }}>
              Try This Use Case →
            </button>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS — numbered steps ══ */}
      <section id="how" style={{ padding:'100px 24px', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:S.primary, background:S.light, border:`1px solid ${S.border}` }}>How It Works</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0' }}>
              From Zero to Live in <span style={{ ...S.gradText }}>4 Steps</span>
            </h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:0, position:'relative' }}>
            {/* Connecting line */}
            <div style={{ position:'absolute', top:38, left:'12.5%', right:'12.5%', height:2, background:`linear-gradient(90deg,${S.border},${S.primary},${S.border})`, zIndex:0, borderRadius:99 }} className="hidden lg:block"/>

            {STEPS.map((s,i) => (
              <div key={s.n} style={{ padding:'0 16px', textAlign:'center', position:'relative', zIndex:1 }}>
                <div style={{ width:76, height:76, borderRadius:'50%', background: i===1||i===2?S.grad:'#fff', border:`2px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:i===1||i===2?S.glow:'none', transition:'all .3s' }}>
                  <span style={{ fontSize:24, fontWeight:900, ...i===1||i===2?{color:'#fff'}:S.gradText }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize:15, fontWeight:800, color:'#0f0f0f', marginBottom:8 }}>{s.title}</h3>
                <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.75 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING TEASER ══ */}
      <section id="pricing" style={{ padding:'100px 24px', background:S.light }}>
        <div style={{ maxWidth:800, margin:'0 auto', textAlign:'center' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:99, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:S.primary, background:'#fff', border:`1px solid ${S.border}` }}>Pricing</span>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:800, letterSpacing:'-0.025em', lineHeight:1.1, color:'#0f0f0f', margin:'16px 0 12px' }}>
            Simple. <span style={{ ...S.gradText }}>Pay Per Minute.</span>
          </h2>
          <p style={{ fontSize:16, color:'#6B7280', marginBottom:48, lineHeight:1.75 }}>No subscriptions. No hidden fees. Add wallet balance and pay only for calls made.</p>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:40 }}>
            {[
              { label:'Minimum top-up', val:'₹500', sub:'Add any time', icon:'💳', highlight:false },
              { label:'Per minute rate', val:'₹1.00', sub:'All languages included', icon:'⏱️', highlight:true },
            ].map(p => (
              <div key={p.label} style={{ background:p.highlight?S.grad:'#fff', borderRadius:20, padding:'28px 24px', border:p.highlight?'none':`1px solid ${S.border}`, boxShadow:p.highlight?S.glowLg:'none', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>{p.icon}</div>
                <p style={{ fontSize:14, fontWeight:600, color:p.highlight?'rgba(255,255,255,.75)':'#9CA3AF', margin:'0 0 6px' }}>{p.label}</p>
                <p style={{ fontSize:38, fontWeight:900, color:p.highlight?'#fff':'#0f0f0f', margin:'0 0 4px', letterSpacing:'-0.03em' }}>{p.val}</p>
                <p style={{ fontSize:12, color:p.highlight?'rgba(255,255,255,.6)':'#9CA3AF', margin:0 }}>{p.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 24px', marginBottom:40 }}>
            {['18% GST on recharge','TRAI compliant','DNC list maintained','Auto-retry included','No setup fee','Cancel anytime'].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, color:'#374151' }}>
                <span style={{ width:16, height:16, borderRadius:'50%', background:S.light, border:`1px solid ${S.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke={S.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {f}
              </div>
            ))}
          </div>

          <button onClick={() => go('/login?tab=signup')}
            style={{ padding:'14px 36px', borderRadius:12, fontSize:15, fontWeight:800, color:'#fff', background:S.grad, border:'none', cursor:'pointer', boxShadow:S.glowLg, display:'inline-flex', alignItems:'center', gap:8, fontFamily:'inherit', transition:'all .2s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 48px rgba(14,165,233,.55)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=S.glowLg}}>
            Start Free — ₹500 First Recharge
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:'#0C4A6E', padding:'56px 24px 32px', borderTop:'1px solid rgba(56,189,248,.15)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:40, marginBottom:48 }}>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ marginBottom:16 }}><Logo dark size="sm"/></div>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.35)', lineHeight:1.8, maxWidth:280 }}>AI-powered voice call automation for Indian businesses. Built by RiseAscend Technologies, Ahmedabad.</p>
              <div style={{ display:'flex', gap:8, marginTop:18, flexWrap:'wrap' }}>
                {['TRAI Compliant','Made in India 🇮🇳','SOC 2 Ready'].map(t => (
                  <span key={t} style={{ padding:'4px 10px', borderRadius:6, background:'rgba(56,189,248,.08)', border:'1px solid rgba(56,189,248,.15)', fontSize:10, color:'rgba(255,255,255,.3)', fontWeight:600 }}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              <h5 style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:20 }}>Product</h5>
              {['Features','Use Cases','How It Works','Pricing','Simulator'].map(l => (
                <div key={l} style={{ marginBottom:10 }}>
                  <a href="#" style={{ fontSize:13, color:'rgba(255,255,255,.3)', textDecoration:'none', transition:'color .15s' }}
                    onMouseEnter={e=>e.target.style.color=S.light} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.3)'}>{l}</a>
                </div>
              ))}
            </div>
            <div>
              <h5 style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.2)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:20 }}>Company</h5>
              {[['RiseAscend Tech','https://riseascendtech.com'],['About','#'],['Contact','#'],['Careers','#']].map(([l,h]) => (
                <div key={l} style={{ marginBottom:10 }}>
                  <a href={h} target={h.startsWith('http')?'_blank':undefined} rel="noopener noreferrer"
                    style={{ fontSize:13, color:'rgba(255,255,255,.3)', textDecoration:'none', transition:'color .15s' }}
                    onMouseEnter={e=>e.target.style.color=S.light} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.3)'}>{l}</a>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(56,189,248,.1)', paddingTop:24, display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:12 }}>
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
