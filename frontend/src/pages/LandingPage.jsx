import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

// ── Icons ────────────────────────────────────────────────────
function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm6.9 8a1 1 0 00-2 .1A5 5 0 017 9.1 1 1 0 005 9a7 7 0 006 6.9V19H9a1 1 0 000 2h6a1 1 0 000-2h-2v-3.1A7 7 0 0018.9 9z"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function ArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}

// ── Animated wave bars ────────────────────────────────────────
function WaveBars({ color = '#f5a623', size = 16 }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: size }}>
      {[0, 0.15, 0.30, 0.45, 0.60].map((delay, i) => (
        <div key={i} className="wave-bar rounded-sm" style={{ background: color, width: 3, height: size, animationDelay: `${delay}s` }} />
      ))}
    </div>
  )
}

// ── Use cases data ────────────────────────────────────────────
const USE_CASES = [
  { icon: '🚌', title: 'Bus & Transport Reminders', desc: 'Departure time confirmations, delay alerts, route changes — auto-called to drivers and passengers in Gujarati.' },
  { icon: '🏛️', title: 'Government Scheme Surveys', desc: 'Verify beneficiary status, collect confirmations for PM Awas, ration cards, pension schemes at scale.' },
  { icon: '🏥', title: 'Hospital Appointments', desc: 'Appointment reminders, prescription follow-ups, health camp notifications in Hindi and Gujarati.' },
  { icon: '🏦', title: 'Banking & Finance', desc: 'Loan due date reminders, KYC verification calls, account update confirmations in regional languages.' },
  { icon: '🛒', title: 'E-commerce & Retail', desc: 'Order confirmations, delivery status, feedback collection — personalised per customer in their language.' },
  { icon: '🗳️', title: 'Political Campaigns', desc: 'Voter outreach, survey calls, event reminders — multi-lingual, personalised, high volume.' },
]

const FEATURES = [
  { icon: '🗣️', title: 'Gujarati-First AI', desc: 'Auto-detects and switches between Gujarati, Hindi & English mid-conversation. Starts in your chosen language.' },
  { icon: '📞', title: 'Bulk Outbound Calling', desc: 'Upload CSV with thousands of contacts and launch in one click. Concurrent calls, auto-retries, time scheduling.' },
  { icon: '🔄', title: 'Smart Rescheduling', desc: '"Call me tomorrow at 3pm" — AI understands in any language and auto-schedules the callback.' },
  { icon: '📊', title: 'Live Call Dashboard', desc: 'Watch calls happen in real-time. Full transcripts, outcomes, collected data — all visible instantly.' },
  { icon: '📋', title: 'Google Sheets Sync', desc: 'Every call result auto-appends to your spreadsheet. Share live data with your team effortlessly.' },
  { icon: '👤', title: 'Human Handoff', desc: 'Contact asks for a human? AI transfers instantly to your agent. No gaps, no confusion.' },
]

const STEPS = [
  { n: '01', icon: '📤', title: 'Upload Contacts', desc: 'Drop your CSV with phone numbers and variables like name, route, scheme ID.' },
  { n: '02', icon: '✍️', title: 'Write Your Script', desc: 'Paste your script. Use {{name}}, {{time}} for personalisation. Or upload a PDF.' },
  { n: '03', icon: '🤖', title: 'Configure Agent', desc: 'Pick language, agent name, tone, and what data to collect from each call.' },
  { n: '04', icon: '🚀', title: 'Launch & Monitor', desc: 'Hit launch. Watch live transcripts and outcomes as calls go out.' },
]

// ── Minimal dashboard preview ─────────────────────────────────
function DashboardPreview() {
  return (
    <div style={{ background: '#fdfcfa', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e3db' }}>
      {/* Fake browser bar */}
      <div style={{ background: '#f5f1ea', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e8e3db' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: '#ede7dc', borderRadius: 6, padding: '3px 10px', fontSize: 10, color: '#a8a8a8', marginLeft: 8 }}>
          ai-voice-call-automation.vercel.app/dashboard
        </div>
      </div>
      {/* Dashboard content */}
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 0, minHeight: 220 }}>
        {/* Sidebar */}
        <div style={{ background: '#fff', borderRight: '1px solid #ede7dc', padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '4px 0' }}>
            <div style={{ width: 24, height: 24, background: '#f5a623', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🎙</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#1a1a1a' }}>VoiceAI India</span>
          </div>
          {[['Dashboard', true], ['Campaigns', false], ['Simulator', false], ['Billing', false]].map(([l, a]) => (
            <div key={l} style={{ padding: '6px 8px', borderRadius: 6, marginBottom: 2, background: a ? '#fef3d0' : 'transparent', fontSize: 10, color: a ? '#b86f0e' : '#8a8a8a', fontWeight: a ? 600 : 400 }}>{l}</div>
          ))}
        </div>
        {/* Main */}
        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {[['3', 'Campaigns'], ['1,284', 'Total Calls'], ['87%', 'Success Rate'], ['Active', 'Status']].map(([n, l]) => (
              <div key={l} style={{ background: '#faf8f4', border: '1px solid #ede7dc', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: '"DM Serif Display", serif' }}>{n}</div>
                <div style={{ fontSize: 9, color: '#a8a8a8', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid #ede7dc', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f5f1ea', fontSize: 10, fontWeight: 600, color: '#3d3d3d' }}>Recent Campaigns</div>
            {[
              ['Bus Driver Reminder', '186/248', '75%', 'Active'],
              ['PM Awas Survey', '520/520', '100%', 'Done'],
              ['Hospital Follow-up', '42/85', '49%', 'Paused'],
            ].map(([name, calls, pct, status]) => (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 40px 45px', padding: '6px 12px', borderBottom: '1px solid #f5f1ea', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: '#525252', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ fontSize: 9, color: '#a8a8a8' }}>{calls}</span>
                <span style={{ fontSize: 9, color: '#f5a623', fontWeight: 700 }}>{pct}</span>
                <span style={{ fontSize: 8, fontWeight: 600, padding: '2px 4px', borderRadius: 4,
                  background: status === 'Active' ? '#dcf3e5' : status === 'Done' ? '#f5f1ea' : '#fef3d0',
                  color: status === 'Active' ? '#228248' : status === 'Done' ? '#6b6b6b' : '#b86f0e' }}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function LandingPage() {
  const navigate   = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCase, setActiveCase] = useState(0)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Auto-cycle use cases
  useEffect(() => {
    const t = setInterval(() => setActiveCase(a => (a + 1) % USE_CASES.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif', background: '#fdfcfa', color: '#1a1a1a', overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? 'rgba(253,252,250,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #ede7dc' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: 34, height: 34, background: '#f5a623', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <MicIcon />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: '"DM Serif Display", serif', lineHeight: 1 }}>VoiceAI India</div>
              <div style={{ fontSize: 9, color: '#a8a8a8', marginTop: 1, letterSpacing: '0.5px' }}>by Rise Ascend Tech</div>
            </div>
          </div>

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden lg:flex">
            {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Use Cases', '#use-cases']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 14, color: '#6b6b6b', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#1a1a1a'}
                onMouseLeave={e => e.target.style.color = '#6b6b6b'}>{l}</a>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="hidden lg:flex">
            <button onClick={() => navigate('/login')}
              style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, color: '#3d3d3d', background: 'transparent', border: '1.5px solid #e8e3db', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f5a623'; e.currentTarget.style.color = '#1a1a1a' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e3db'; e.currentTarget.style.color = '#3d3d3d' }}>
              Sign In
            </button>
            <button onClick={() => navigate('/login')}
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#fff', background: '#1a1a1a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)' }}>
              Get Started <ArrowRight />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(m => !m)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }} className="block lg:hidden">
            <div style={{ width: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ display: 'block', height: 1.5, background: '#1a1a1a', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translateY(6.5px)' : 'none' }} />
              <span style={{ display: 'block', height: 1.5, background: '#1a1a1a', borderRadius: 2, opacity: menuOpen ? 0 : 1, transition: 'all 0.2s' }} />
              <span style={{ display: 'block', height: 1.5, background: '#1a1a1a', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translateY(-6.5px)' : 'none' }} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: '#fff', borderTop: '1px solid #ede7dc', padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Features', 'How It Works', 'Use Cases'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} onClick={() => setMenuOpen(false)}
                style={{ fontSize: 14, color: '#3d3d3d', textDecoration: 'none', fontWeight: 500, padding: '4px 0' }}>{l}</a>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => navigate('/login')} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: '#f5f1ea', color: '#1a1a1a', border: 'none', cursor: 'pointer' }}>Sign In</button>
              <button onClick={() => navigate('/login')} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer' }}>Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>

        {/* Background blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,160,92,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          {/* Grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        {/* Live badge */}
        <div className="animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: '#fef3d0', border: '1px solid #fde59a', marginBottom: 28 }}>
          <WaveBars color="#f5a623" size={12} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#b86f0e' }}>AI Voice Calls in Gujarati · Hindi · English</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up" style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1.08, letterSpacing: '-1.5px', color: '#1a1a1a', maxWidth: 800, marginBottom: 24, animationDelay: '0.1s' }}>
          Automate Outbound Calls<br />
          <span style={{ color: '#f5a623' }}>Built for Indian Businesses</span>
        </h1>

        {/* Sub */}
        <p className="animate-fade-up" style={{ fontSize: 18, color: '#6b6b6b', maxWidth: 520, lineHeight: 1.7, marginBottom: 36, animationDelay: '0.2s' }}>
          Real two-way AI conversations at scale. Bus reminders, government surveys, hospital follow-ups — in the language your contacts speak.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 56, animationDelay: '0.3s' }}>
          <button onClick={() => navigate('/login')}
            style={{ padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', background: '#1a1a1a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)' }}>
            Start Free Trial <ArrowRight />
          </button>
          <button onClick={() => { const el = document.getElementById('how-it-works'); el?.scrollIntoView({ behavior: 'smooth' }) }}
            style={{ padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#3d3d3d', background: '#fff', border: '1.5px solid #e8e3db', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f5a623'; e.currentTarget.style.background = '#fffbf0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e3db'; e.currentTarget.style.background = '#fff' }}>
            See How It Works
          </button>
        </div>

        {/* Stats */}
        <div className="animate-fade-up" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0, background: '#fff', border: '1px solid #e8e3db', borderRadius: 16, overflow: 'hidden', maxWidth: 560, width: '100%', marginBottom: 64, animationDelay: '0.4s' }}>
          {[['3', 'Languages'], ['Real-time', 'Transcripts'], ['Auto', 'Reschedule'], ['TRAI', 'Compliant']].map(([n, l], i) => (
            <div key={l} style={{ flex: '1 1 120px', padding: '18px 12px', textAlign: 'center', borderRight: i < 3 ? '1px solid #f5f1ea' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', fontFamily: '"DM Serif Display", serif' }}>{n}</div>
              <div style={{ fontSize: 11, color: '#a8a8a8', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Dashboard preview */}
        <div className="animate-fade-up" style={{ width: '100%', maxWidth: 860, animationDelay: '0.5s', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', borderRadius: 14 }}>
          <DashboardPreview />
        </div>
      </section>

      {/* ── TRUSTED BY ──────────────────────────────────────── */}
      <section style={{ background: '#fff', borderTop: '1px solid #f5f1ea', borderBottom: '1px solid #f5f1ea', padding: '28px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#c4c4c4', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 20 }}>Built for businesses across India</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '8px 32px' }}>
            {['GSRTC', 'PM Awas Yojana', 'IFFCO', 'Apollo Hospitals', 'Reliance Jio', 'Nykaa'].map(b => (
              <span key={b} style={{ fontSize: 13, fontWeight: 600, color: '#c4c4c4', fontFamily: '"DM Serif Display", serif' }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────── */}
      <section id="use-cases" style={{ padding: '96px 24px', background: '#fdfcfa' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>
              <span style={{ width: 20, height: 1.5, background: '#f5a623', display: 'inline-block' }} /> Use Cases
            </div>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(26px, 4vw, 44px)', letterSpacing: '-1px', lineHeight: 1.1, color: '#1a1a1a', marginBottom: 12 }}>
              Any Industry. Any Language.
            </h2>
            <p style={{ fontSize: 16, color: '#8a8a8a', maxWidth: 440, margin: '0 auto' }}>One platform handles every outbound call use case</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {USE_CASES.map((u, i) => (
              <div key={u.title}
                onClick={() => setActiveCase(i)}
                style={{
                  padding: '24px 28px', borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s',
                  background: activeCase === i ? '#fff' : '#fff',
                  border: activeCase === i ? '1.5px solid #f5a623' : '1.5px solid #f5f1ea',
                  boxShadow: activeCase === i ? '0 4px 20px rgba(245,166,35,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => { if (activeCase !== i) { e.currentTarget.style.borderColor = '#e0d9ce'; e.currentTarget.style.transform = 'translateY(-2px)' }}}
                onMouseLeave={e => { if (activeCase !== i) { e.currentTarget.style.borderColor = '#f5f1ea'; e.currentTarget.style.transform = 'translateY(0)' }}}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{u.icon}</div>
                <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 17, color: '#1a1a1a', marginBottom: 8 }}>{u.title}</h3>
                <p style={{ fontSize: 13, color: '#8a8a8a', lineHeight: 1.7 }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 24px', background: '#1a1a1a', position: 'relative', overflow: 'hidden' }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>
              <span style={{ width: 20, height: 1.5, background: '#f5a623', display: 'inline-block' }} /> Features
            </div>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(26px, 4vw, 44px)', letterSpacing: '-1px', lineHeight: 1.1, color: '#fff', marginBottom: 12 }}>
              Everything You Need to Scale
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 440, margin: '0 auto' }}>From Gujarati reminders to political surveys — one platform.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            {FEATURES.map(f => (
              <div key={f.title}
                style={{ padding: '24px 28px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(245,166,35,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '96px 24px', background: '#fdfcfa' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#f5a623', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>
              <span style={{ width: 20, height: 1.5, background: '#f5a623', display: 'inline-block' }} /> How It Works
            </div>
            <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(26px, 4vw, 44px)', letterSpacing: '-1px', lineHeight: 1.1, color: '#1a1a1a' }}>
              Launch a Campaign in Minutes
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, position: 'relative' }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ padding: '28px 24px', borderRadius: 16, background: '#fff', border: '1px solid #f5f1ea', position: 'relative' }}>
                <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 36, color: '#f5f1ea', lineHeight: 1, marginBottom: 12 }}>{s.n}</div>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{s.icon}</div>
                <h3 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, color: '#1a1a1a', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#8a8a8a', lineHeight: 1.7 }}>{s.desc}</p>
                {i < 3 && <div style={{ position: 'absolute', top: '40%', right: -12, fontSize: 16, color: '#e8e3db', display: 'none' }} className="hidden lg:block">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: '#fff', borderTop: '1px solid #f5f1ea' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#fef3d0', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 26 }}>🚀</div>
          <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 'clamp(26px, 4vw, 44px)', letterSpacing: '-1px', lineHeight: 1.1, color: '#1a1a1a', marginBottom: 16 }}>
            Ready to Automate Your<br />Outbound Calls?
          </h2>
          <p style={{ fontSize: 16, color: '#8a8a8a', marginBottom: 36, lineHeight: 1.7 }}>
            Set up your first campaign today. No technical knowledge needed.<br />
            Works with your existing contacts — just upload a CSV.
          </p>

          {/* Feature checklist */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 24px', marginBottom: 36 }}>
            {['Gujarati, Hindi & English', 'No credit card needed', 'TRAI compliant', 'Live call dashboard', 'Auto-rescheduling', 'Google Sheets sync'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#525252' }}>
                <span style={{ color: '#2fa05c', display: 'flex' }}><CheckIcon /></span> {f}
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/login')}
            style={{ padding: '14px 36px', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', background: '#1a1a1a', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)' }}>
            Create Your Account <ArrowRight />
          </button>
          <p style={{ fontSize: 12, color: '#c4c4c4', marginTop: 14 }}>Made in India 🇮🇳 · TRAI Compliant</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{ background: '#1a1a1a', padding: '56px 24px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>

            {/* Brand */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, background: '#f5a623', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <MicIcon />
                </div>
                <span style={{ fontFamily: '"DM Serif Display", serif', fontSize: 16, color: '#fff', fontWeight: 400 }}>VoiceAI India</span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8, maxWidth: 260 }}>
                AI-powered voice call automation for Indian businesses. Built by Rise Ascend Technologies, Ahmedabad.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {['TRAI Compliant', 'Made in India 🇮🇳'].map(t => (
                  <span key={t} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Product links */}
            <div>
              <h5 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 20 }}>Product</h5>
              {['Features', 'Use Cases', 'How It Works', 'Simulator'].map(l => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = '#f5a623'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</a>
                </div>
              ))}
            </div>

            {/* Company */}
            <div>
              <h5 style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 20 }}>Company</h5>
              {[['Rise Ascend Tech', 'https://riseascendtech.com'], ['About Us', '#'], ['Contact', '#'], ['Careers', '#']].map(([l, h]) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                    style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = '#f5a623'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</a>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 Rise Ascend Technologies Pvt. Ltd. · Ahmedabad, India</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Privacy Policy', 'Terms of Service'].map(l => (
                <a key={l} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.2)'}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
