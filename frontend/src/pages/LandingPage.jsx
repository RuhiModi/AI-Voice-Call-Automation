import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  function goDemo() {
    localStorage.setItem('demo_mode', 'true')
    localStorage.setItem('user', JSON.stringify({
      id: 'demo', email: 'demo@voiceai.in',
      company_name: 'Rise Ascend Technologies',
    }))
    navigate('/dashboard')
  }

  return (
    <div className="font-body bg-white text-ink-900 overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled ? 'bg-brand-blue shadow-lg shadow-brand-blue/20' : 'bg-brand-blue'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-[68px] flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center shadow-md">
              <MicIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-800 text-[17px] text-white leading-none">
                VoiceAI <span className="text-brand-orange">India</span>
              </div>
              <div className="text-[9px] text-white/40 mt-0.5 tracking-widest uppercase">by Rise Ascend Technologies</div>
            </div>
          </div>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-7">
            {[['Product','#product'],['Use Cases','#use-cases'],['Pricing','#pricing'],['Company','https://riseascendtech.com']].map(([l,h]) => (
              <a key={l} href={h}
                className="text-[13.5px] font-500 text-white/65 hover:text-white transition-colors">{l}</a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-2.5">
            <button onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-lg text-sm font-600 text-white/80 bg-white/10 hover:bg-white/18 transition-all border border-white/15">
              Login
            </button>
            <button onClick={goDemo}
              className="px-5 py-2 rounded-lg text-sm font-600 text-white/75 border border-dashed border-white/30 hover:border-brand-orange/70 hover:text-white hover:bg-brand-orange/10 transition-all">
              👁 Demo
            </button>
            <button onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-lg text-sm font-700 text-white bg-brand-orange hover:bg-brand-orange-dk shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Start Free →
            </button>
          </div>

          {/* Mobile menu */}
          <button className="lg:hidden text-white p-2" onClick={() => setMenuOpen(m => !m)}>
            <div className="w-5 space-y-1.5">
              <span className={`block h-0.5 bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}/>
              <span className={`block h-0.5 bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`}/>
              <span className={`block h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}/>
            </div>
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden bg-brand-blue-dk border-t border-white/10 px-6 py-4 flex flex-col gap-3">
            {['Product','Use Cases','Pricing','Company'].map(l => (
              <a key={l} href="#" className="text-sm text-white/60 hover:text-white py-1">{l}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/login')} className="flex-1 py-2.5 rounded-lg text-sm font-600 text-white bg-white/10 border border-white/15">Login</button>
              <button onClick={goDemo} className="flex-1 py-2.5 rounded-lg text-sm font-700 text-white bg-brand-orange">Try Demo</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen bg-brand-blue flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
        {/* Subtle background pattern matching riseascendtech.com */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-brand-blue-md/20 blur-[80px]" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-blue-dk/40 blur-[80px]" />
          <div className="absolute inset-0"
            style={{backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        </div>

        {/* Badge */}
        <div className="animate-fade-up relative z-10 flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-brand-orange/15 border border-brand-orange/30">
          <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse-slow" />
          <span className="text-[12.5px] font-600 text-brand-orange">GPT-4o mini · Google STT/TTS · TRAI Compliant</span>
        </div>

        {/* Heading */}
        <h1 className="animate-fade-up relative z-10 font-display font-900 text-white leading-[1.06] tracking-tight mb-5"
          style={{fontSize:'clamp(38px,6vw,78px)',animationDelay:'.1s'}}>
          AI Voice Agents That Call<br/>
          <span className="text-brand-orange">In Gujarati, Hindi & English</span>
        </h1>

        <p className="animate-fade-up relative z-10 text-white/55 text-lg leading-relaxed max-w-[540px] mb-8"
          style={{animationDelay:'.2s'}}>
          Automate thousands of outbound calls with real two-way AI conversations.
          Campaigns, surveys, reminders — built for India at{' '}
          <strong className="text-white/85">~₹1 per call.</strong>
        </p>

        {/* CTAs */}
        <div className="animate-fade-up relative z-10 flex flex-wrap items-center justify-center gap-3 mb-10"
          style={{animationDelay:'.3s'}}>
          <button onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-700 text-white bg-brand-orange hover:bg-brand-orange-dk shadow-xl shadow-brand-orange/30 hover:-translate-y-0.5 transition-all text-[15px]">
            🚀 Start Free Trial
          </button>
          <button onClick={goDemo}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-600 text-white/80 bg-white/10 border border-white/20 hover:bg-white/16 hover:text-white transition-all text-[15px]">
            👁 View Demo — No Signup
          </button>
        </div>

        {/* Stats bar */}
        <div className="animate-fade-up relative z-10 flex flex-wrap justify-center gap-0 max-w-[620px] w-full rounded-2xl border border-white/10 bg-white/6 overflow-hidden mb-14"
          style={{animationDelay:'.4s'}}>
          {[
            {num:'10M+',label:'Calls Automated'},
            {num:'~₹1',label:'Per Call'},
            {num:'3',label:'Languages'},
            {num:'99.9%',label:'Uptime'},
          ].map((s,i) => (
            <div key={i} className="flex-1 min-w-[120px] py-5 px-4 text-center border-r border-white/10 last:border-0">
              <div className="font-display font-900 text-2xl text-white">{s.num}</div>
              <div className="text-xs text-white/40 font-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard preview */}
        <div className="animate-fade-up relative z-10 w-full max-w-[860px] rounded-2xl overflow-hidden border border-white/12 shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
          style={{animationDelay:'.5s'}}>
          <div className="h-8 bg-brand-blue-dk flex items-center px-4 gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            <span className="ml-auto text-[10px] text-white/25">voiceai.riseascendtech.com/dashboard</span>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* ── TRUSTED BY ── */}
      <section className="bg-surface-50 border-y border-surface-200 py-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-700 text-ink-300 uppercase tracking-widest mb-7">Trusted by businesses across India</p>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {['GSRTC','PM Awas Yojana','IFFCO','Apollo Hospitals','Reliance Jio','Zomato'].map(b => (
              <span key={b} className="font-display font-700 text-ink-400 text-sm">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="product" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-brand-orange font-700 text-xs uppercase tracking-widest mb-4">
              <span className="w-5 h-0.5 bg-brand-orange rounded" /> Features
            </div>
            <h2 className="font-display font-900 text-ink-900 mb-4"
              style={{fontSize:'clamp(26px,4vw,48px)',letterSpacing:'-1px',lineHeight:1.1}}>
              Everything to Automate<br/>Voice Calls at Scale
            </h2>
            <p className="text-ink-400 text-lg max-w-[480px] mx-auto leading-relaxed">
              From Gujarati bus driver reminders to political surveys — one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {icon:'🗣️',bg:'bg-brand-blue-lt border-brand-blue/10',title:'Gujarati-First AI',desc:'Auto-detects and switches between Gujarati, Hindi, and English mid-call. Starts in your chosen language.'},
              {icon:'📞',bg:'bg-brand-orange-lt border-brand-orange/10',title:'Bulk Outbound Calling',desc:'Upload CSV with thousands of contacts and launch in one click. Concurrent calls, retries, scheduling.'},
              {icon:'🔄',bg:'bg-jade-50 border-jade-400/15',title:'Auto-Rescheduling',desc:'User says "call me tomorrow at 3pm" — AI understands and reschedules. Works in any language.'},
              {icon:'📊',bg:'bg-violet-50 border-violet-400/15',title:'Real-Time Analytics',desc:'Live call monitoring, full transcripts, outcome tracking and collected data — all visible instantly.'},
              {icon:'📋',bg:'bg-amber-50 border-amber-400/15',title:'Google Sheets Sync',desc:'Every call result auto-appends to your Google Sheet. Share live data with your team effortlessly.'},
              {icon:'👤',bg:'bg-rose-50 border-rose-400/15',title:'Human Handoff',desc:'User asks for a human? AI instantly transfers to your agent. Seamless, no gaps, no confusion.'},
            ].map(f => (
              <div key={f.title} className={`group p-7 rounded-2xl border ${f.bg} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display font-700 text-ink-900 text-[17px] mb-2">{f.title}</h3>
                <p className="text-ink-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="use-cases" className="py-24 px-6 bg-brand-blue">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-brand-orange font-700 text-xs uppercase tracking-widest mb-4">
              <span className="w-5 h-0.5 bg-brand-orange rounded" /> How It Works
            </div>
            <h2 className="font-display font-900 text-white mb-4"
              style={{fontSize:'clamp(26px,4vw,48px)',letterSpacing:'-1px',lineHeight:1.1}}>
              Launch a Campaign in Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {n:'01',icon:'📤',title:'Upload Contacts',desc:'Drop your CSV with phone numbers and custom variables like name, bus time, scheme ID.'},
              {n:'02',icon:'✍️',title:'Write Script',desc:'Paste your script or upload PDF. Use {{name}}, {{time}} for personalization.'},
              {n:'03',icon:'🤖',title:'Configure Agent',desc:'Choose language, agent name, tone, and what data to collect from each call.'},
              {n:'04',icon:'🚀',title:'Launch & Monitor',desc:'Hit launch. Watch calls go out in real-time with live transcripts and outcomes.'},
            ].map((s,i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 hover:border-brand-orange/30 transition-all group">
                <div className="font-display font-900 text-brand-orange/25 text-4xl mb-4 group-hover:text-brand-orange/50 transition-colors">{s.n}</div>
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-display font-700 text-white text-[16px] mb-2">{s.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{s.desc}</p>
                {i < 3 && <div className="hidden lg:block absolute top-10 -right-3 text-white/20 text-xl z-10">→</div>}
              </div>
            ))}
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {title:'🚌 GSRTC Bus Reminders',desc:'Departure time reminders to 248 drivers. Auto-confirm in Gujarati. 87% answer rate.'},
              {title:'🏛️ PM Awas Yojana',desc:'Verify beneficiary status in Gujarati. 520 calls completed in 4 hours.'},
              {title:'🏥 Hospital Appointments',desc:'Remind patients in Hindi. Auto-reschedule if busy. 34% fewer no-shows.'},
            ].map(u => (
              <div key={u.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-orange/30 transition-all">
                <div className="font-display font-700 text-white mb-2">{u.title}</div>
                <p className="text-white/45 text-sm leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 bg-surface-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-brand-orange font-700 text-xs uppercase tracking-widest mb-4">
              <span className="w-5 h-0.5 bg-brand-orange rounded" /> Pricing
            </div>
            <h2 className="font-display font-900 text-ink-900 mb-3"
              style={{fontSize:'clamp(26px,4vw,48px)',letterSpacing:'-1px',lineHeight:1.1}}>
              Simple, Honest Pricing
            </h2>
            <p className="text-ink-400 text-lg">~₹1 per call. No surprises. Scale as you grow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {name:'Starter',price:'₹0',period:'Free forever · Pay per call',popular:false,
               features:['500 calls/month free','3 campaigns','Gujarati + Hindi + English','Google Sheets export','—Custom caller ID','—Priority support'],
               cta:'Start Free',fn:() => navigate('/login')},
              {name:'Growth',price:'₹4,999',period:'/month + ₹0.90/call',popular:true,
               features:['Unlimited campaigns','10 concurrent calls','Custom AI personas','Human handoff','Analytics dashboard','Priority support'],
               cta:'Start Trial',fn:() => navigate('/login')},
              {name:'Enterprise',price:'Custom',period:'Volume pricing',popular:false,
               features:['Unlimited everything','50+ concurrent calls','Dedicated infrastructure','SLA guarantee','TRAI compliance','Dedicated manager'],
               cta:'Contact Sales',fn:() => {}},
            ].map(p => (
              <div key={p.name} className={`relative rounded-2xl p-8 border transition-all ${p.popular
                ? 'bg-brand-blue border-brand-blue shadow-2xl shadow-brand-blue/20'
                : 'bg-white border-surface-200 hover:border-brand-blue/20 hover:shadow-lg'}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[11px] font-800 px-4 py-1.5 rounded-full tracking-wide uppercase">
                    Most Popular
                  </div>
                )}
                <div className={`text-sm font-600 mb-3 ${p.popular ? 'text-brand-orange' : 'text-ink-400'}`}>{p.name}</div>
                <div className={`font-display font-900 text-4xl mb-1 ${p.popular ? 'text-white' : 'text-ink-900'}`}>{p.price}</div>
                <div className={`text-sm mb-7 ${p.popular ? 'text-white/40' : 'text-ink-300'}`}>{p.period}</div>
                <ul className="space-y-2.5 mb-8">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm
                      ${f.startsWith('—') ? 'opacity-35' : ''}
                      ${p.popular ? 'text-white/80' : 'text-ink-600'}`}>
                      <span className={`text-xs font-700 flex-shrink-0 ${f.startsWith('—') ? 'text-current' : 'text-jade-500'}`}>
                        {f.startsWith('—') ? '—' : '✓'}
                      </span>
                      {f.startsWith('—') ? f.slice(1) : f}
                    </li>
                  ))}
                </ul>
                <button onClick={p.fn}
                  className={`w-full py-3 rounded-xl font-700 text-sm transition-all ${p.popular
                    ? 'bg-brand-orange text-white hover:bg-brand-orange-dk shadow-lg'
                    : 'bg-brand-blue text-white hover:bg-brand-blue-dk'}`}>
                  {p.cta} →
                </button>
              </div>
            ))}
          </div>

          {/* Cost breakdown */}
          <div className="mt-10 p-6 rounded-2xl bg-white border border-surface-200 flex flex-wrap gap-6 items-center justify-between">
            <div>
              <div className="font-display font-700 text-ink-900 mb-1">What makes up ~₹1/call?</div>
              <div className="text-sm text-ink-400">Fully transparent cost breakdown</div>
            </div>
            <div className="flex flex-wrap gap-5">
              {[['Vobiz call (2min)','₹0.90'],['Google STT','₹0.06'],['GPT-4o mini','₹0.04'],['Google TTS','₹0.04']].map(([l,v]) => (
                <div key={l} className="text-center">
                  <div className="font-display font-800 text-ink-900 text-lg">{v}</div>
                  <div className="text-xs text-ink-400">{l}</div>
                </div>
              ))}
              <div className="text-center border-l border-surface-200 pl-5">
                <div className="font-display font-900 text-brand-orange text-2xl">~₹1.05</div>
                <div className="text-xs text-ink-400 font-700">Total / call</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24 px-6 bg-brand-blue relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-brand-orange/8 blur-[80px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="font-display font-900 text-white mb-5"
            style={{fontSize:'clamp(26px,4vw,48px)',letterSpacing:'-1px',lineHeight:1.1}}>
            Ready to Automate Your<br/>Outbound Calls?
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto">
            Join 500+ businesses. Start free — first 500 calls on us. No credit card needed.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl font-700 text-white bg-brand-orange hover:bg-brand-orange-dk shadow-xl shadow-brand-orange/30 hover:-translate-y-0.5 transition-all text-base">
              🚀 Start Free — 500 Calls Free
            </button>
            <button onClick={goDemo}
              className="px-8 py-4 rounded-xl font-700 text-white/75 bg-white/10 border border-white/20 hover:bg-white/16 hover:text-white transition-all text-base">
              👁 Explore Demo First
            </button>
          </div>
          <p className="text-white/25 text-xs mt-6">No credit card · TRAI Compliant · Made in India 🇮🇳</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-brand-blue-dk border-t border-white/8 pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center">
                  <MicIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-display font-800 text-lg text-white">VoiceAI</span>
                  <span className="font-display font-800 text-lg text-brand-orange"> India</span>
                </div>
              </div>
              <p className="text-white/35 text-sm leading-relaxed max-w-xs">
                AI-powered voice call automation for India. Gujarati, Hindi & English. Built by Rise Ascend Technologies, Ahmedabad.
              </p>
              <div className="mt-5 flex gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-white/6 border border-white/10 text-xs text-white/40 font-600">TRAI Compliant</span>
                <span className="px-3 py-1.5 rounded-lg bg-white/6 border border-white/10 text-xs text-white/40 font-600">Made in India 🇮🇳</span>
              </div>
            </div>
            <div>
              <h5 className="text-xs font-700 text-white/30 uppercase tracking-widest mb-5">Product</h5>
              {['Features','Pricing','Changelog','API Docs','Status'].map(l => (
                <div key={l} className="mb-3"><a href="#" className="text-sm text-white/40 hover:text-brand-orange transition-colors">{l}</a></div>
              ))}
            </div>
            <div>
              <h5 className="text-xs font-700 text-white/30 uppercase tracking-widest mb-5">Company</h5>
              {[['Rise Ascend Tech','https://riseascendtech.com'],['About Us','#'],['Blog','#'],['Contact','#'],['Careers','#']].map(([l,h]) => (
                <div key={l} className="mb-3">
                  <a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                    className="text-sm text-white/40 hover:text-brand-orange transition-colors">{l}</a>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-white/8 pt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-white/25">© 2025 Rise Ascend Technologies Pvt. Ltd. · Ahmedabad, India</p>
            <div className="flex gap-5">
              {['Privacy Policy','Terms of Service'].map(l => (
                <a key={l} href="#" className="text-xs text-white/25 hover:text-white/50 transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm6.9 8a1 1 0 00-2 .1A5 5 0 017 9.1 1 1 0 005 9a7 7 0 006 6.9V19H9a1 1 0 000 2h6a1 1 0 000-2h-2v-3.1A7 7 0 0018.9 9z"/>
    </svg>
  )
}

function DashboardPreview() {
  return (
    <div className="bg-[#0e2254] p-4 grid gap-3" style={{gridTemplateColumns:'170px 1fr',minHeight:'260px'}}>
      <div className="bg-[#0a1a42] rounded-xl p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 p-2 mb-2">
          <div className="w-6 h-6 bg-[#F15A2B] rounded-lg flex items-center justify-center text-[10px]">🎙</div>
          <span className="text-white text-[11px] font-700">VoiceAI</span>
        </div>
        {[['Dashboard',true],['Campaigns',false],['New Campaign',false],['Settings',false]].map(([l,a]) => (
          <div key={l} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-500 ${a ? 'bg-white/15 text-white' : 'text-white/40'}`}>
            <div className={`w-3 h-3 rounded-sm ${a ? 'bg-[#F15A2B]' : 'bg-white/10'}`}/>
            {l}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-4 gap-2">
          {[['1,284','Calls Today','↑23%'],['87%','Answer Rate','↑5%'],['4','Campaigns','Live'],['₹1,342','Cost Today','']].map(([n,l,b]) => (
            <div key={l} className="bg-[#0a1a42] rounded-lg p-2.5 border border-white/6">
              <div className="font-display font-900 text-white text-base leading-none">{n}</div>
              <div className="text-white/35 text-[9px] mt-1">{l}</div>
              {b && <div className="text-[#10B981] text-[8px] font-700 mt-1">{b}</div>}
            </div>
          ))}
        </div>
        <div className="bg-[#0a1a42] rounded-lg border border-white/6 overflow-hidden flex-1">
          <div className="grid px-3 py-2 border-b border-white/6" style={{gridTemplateColumns:'1fr 70px 60px 50px'}}>
            {['Campaign','Progress','Status','Calls'].map(h => (
              <span key={h} className="text-[8px] font-700 text-white/25 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {[
            ['Bus Driver Reminder','75%','Live','186/248','active'],
            ['PM Awas Survey','100%','Done','520/520','done'],
            ['Hospital Reminder','49%','Paused','42/85','paused'],
          ].map(([n,p,s,c,st]) => (
            <div key={n} className="grid px-3 py-2 border-b border-white/4 items-center" style={{gridTemplateColumns:'1fr 70px 60px 50px'}}>
              <span className="text-white/65 text-[9px] truncate">{n}</span>
              <span className="text-[#F15A2B] text-[9px] font-700">{p}</span>
              <span className={`text-[8px] font-700 px-1.5 py-0.5 rounded w-fit
                ${st==='active'?'bg-green-500/15 text-green-400':st==='done'?'bg-purple-500/15 text-purple-400':'bg-yellow-500/15 text-yellow-400'}`}>{s}</span>
              <span className="text-white/40 text-[9px]">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
