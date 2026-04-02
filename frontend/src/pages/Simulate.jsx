import { useState, useEffect, useRef } from 'react'
import { campaignApi, simulateApi } from '../hooks/api'
import toast from 'react-hot-toast'
import { Phone, PhoneOff, Send, Bot, User, Loader2, RotateCcw, Zap, ChevronDown } from 'lucide-react'

const BRAND = '#FF6B35'
const GRAD  = 'linear-gradient(135deg,#FF8C42,#FF6B35,#E63946)'

const LANGS = [{ code:'gu', label:'ગુજ', full:'Gujarati' },{ code:'hi', label:'हिं', full:'Hindi' },{ code:'en', label:'Eng', full:'English' }]

const QUICK_REPLIES = {
  gu: ['હા, બરાબર છે', 'ના, ભૂલ છે', 'હું વ્યસ્ત છું', 'Human સાથે વાત'],
  hi: ['हाँ, सही है', 'नहीं, गलत है', 'मैं व्यस्त हूं', 'Human से बात'],
  en: ['Yes, correct', 'No, wrong', "I'm busy", 'Transfer to human'],
}

const ACTION_LABELS = {
  end_call:'📴 Call ended by AI', transfer:'🔀 Transfer to human', dnc:'🚫 DNC requested', reschedule:'📅 Callback scheduled',
}

function Bubble({ msg }) {
  const isAI = msg.role === 'assistant'
  return (
    <div style={{ display:'flex', justifyContent:isAI?'flex-start':'flex-end', gap:10, marginBottom:14, alignItems:'flex-end' }}>
      {isAI && (
        <div style={{ width:30, height:30, borderRadius:'50%', background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Bot size={14} color="#fff"/>
        </div>
      )}
      <div style={{ maxWidth:'75%' }}>
        <div style={{
          padding:'10px 14px', fontSize:13, lineHeight:1.6, wordBreak:'break-word',
          ...(isAI
            ? { background:'#fff', border:'1px solid #E5E7EB', borderRadius:'4px 16px 16px 16px', color:'#0f0f0f' }
            : { background:GRAD, borderRadius:'16px 4px 16px 16px', color:'#fff' })
        }}>
          {msg.content}
        </div>
        {msg.action && ACTION_LABELS[msg.action] && (
          <p style={{ fontSize:11, color:'#9CA3AF', margin:'4px 4px 0' }}>{ACTION_LABELS[msg.action]}</p>
        )}
        <p style={{ fontSize:10, color:'#D1D5DB', margin:'3px 4px 0' }}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN',{ hour:'2-digit', minute:'2-digit', second:'2-digit' }) : ''}
        </p>
      </div>
      {!isAI && (
        <div style={{ width:30, height:30, borderRadius:'50%', background:'#F3F4F6', border:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <User size={14} color="#6B7280"/>
        </div>
      )}
    </div>
  )
}

export default function Simulate() {
  const [campaigns,     setCampaigns]    = useState([])
  const [campaignId,    setCampaignId]   = useState('')
  const [session,       setSession]      = useState(null)
  const [transcript,    setTranscript]   = useState([])
  const [input,         setInput]        = useState('')
  const [loading,       setLoading]      = useState(false)
  const [starting,      setStarting]     = useState(false)
  const [ended,         setEnded]        = useState(false)
  const [collectedData, setCollectedData]= useState({})
  const [script,        setScript]       = useState('')
  const [language,      setLanguage]     = useState('en')
  const [contactName,   setContactName]  = useState('Rajesh Bhai')
  const [personaName,   setPersonaName]  = useState('Priya')
  const bottomRef = useRef()
  const inputRef  = useRef()

  useEffect(() => {
    campaignApi.list()
      .then(r => {
        const camps = r.data.campaigns || []
        setCampaigns(camps)
        if (camps.length) {
          const first = camps[0]
          setCampaignId(first.id)
          setLanguage(first.language_priority||'en')
          setPersonaName(first.persona_name||'Priya')
          if (first.script_content) setScript(first.script_content)
        }
      }).catch(()=>{})
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [transcript])

  async function startSession() {
    if (!script.trim()) return toast.error('Enter a script first')
    setStarting(true)
    try {
      const res = await simulateApi.start({
        campaign_id: campaignId||undefined, script_content:script,
        language, contact_name:contactName, persona_name:personaName,
      })
      setSession(res.data)
      setTranscript(res.data.transcript||[])
      setEnded(false); setCollectedData({})
      setTimeout(()=>inputRef.current?.focus(), 100)
    } catch (err) {
      toast.error(err.response?.data?.error||'Failed to start simulation')
    } finally { setStarting(false) }
  }

  async function sendMessage(text) {
    const msg = text||input.trim()
    if (!msg || !session || loading) return
    setInput('')
    setTranscript(t => [...t, { role:'user', content:msg, timestamp:new Date().toISOString() }])
    setLoading(true)
    try {
      const res = await simulateApi.respond({ session_id:session.session_id, message:msg })
      const d = res.data
      if (d.reply) setTranscript(t => [...t, { role:'assistant', content:d.reply, action:d.action, timestamp:new Date().toISOString() }])
      if (d.collected_data) setCollectedData(d.collected_data)
      if (d.action === 'end_call') setEnded(true)
    } catch (err) {
      toast.error(err.response?.data?.error||'Failed to get response')
    } finally { setLoading(false) }
  }

  function reset() {
    setSession(null); setTranscript([]); setEnded(false); setCollectedData({}); setInput('')
  }

  const hasCollected = Object.keys(collectedData).length > 0

  return (
    <div style={{ padding:'24px 28px 56px', maxWidth:1100, margin:'0 auto' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f0f0f', margin:0, letterSpacing:'-0.025em' }}>Simulator</h1>
        <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0' }}>Test your AI script without making real calls</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:session?'360px 1fr':'1fr', gap:16, alignItems:'start' }}>

        {/* Setup panel */}
        <div>
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6' }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:'#0f0f0f', margin:0 }}>Configuration</h3>
            </div>
            <div style={{ padding:'18px 20px' }}>

              {/* Campaign picker */}
              {campaigns.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>Campaign (optional)</label>
                  <select value={campaignId} onChange={e=>{
                    setCampaignId(e.target.value)
                    const c = campaigns.find(c=>c.id===e.target.value)
                    if (c) { setLanguage(c.language_priority||'en'); setPersonaName(c.persona_name||'Priya'); if(c.script_content) setScript(c.script_content) }
                  }} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #E5E7EB', borderRadius:11, fontSize:13, color:'#374151', background:'#fff', fontFamily:'inherit', cursor:'pointer' }}>
                    <option value="">— Manual setup —</option>
                    {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Language */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>Language</label>
                <div style={{ display:'flex', gap:8 }}>
                  {LANGS.map(l => (
                    <button key={l.code} onClick={()=>setLanguage(l.code)} style={{ flex:1, padding:'8px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', background:language===l.code?GRAD:'#F9FAFB', color:language===l.code?'#fff':'#374151', border:`1px solid ${language===l.code?'transparent':'#E5E7EB'}` }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Names */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                {[['Contact Name', contactName, setContactName,'Rajesh Bhai'],['AI Agent Name', personaName, setPersonaName,'Priya']].map(([l,v,fn,ph])=>(
                  <div key={l}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>{l}</label>
                    <input value={v} onChange={e=>fn(e.target.value)} placeholder={ph}
                      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:13, color:'#374151', background:'#fff', fontFamily:'inherit', boxSizing:'border-box' }}
                      onFocus={e=>{e.target.style.borderColor=BRAND}} onBlur={e=>{e.target.style.borderColor='#E5E7EB'}}
                    />
                  </div>
                ))}
              </div>

              {/* Script */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>Script / Prompt</label>
                <textarea value={script} onChange={e=>setScript(e.target.value)} rows={5} placeholder="Enter your call script here. You can use {{name}}, {{time}} placeholders..."
                  style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:11, fontSize:13, color:'#374151', background:'#fff', fontFamily:'inherit', boxSizing:'border-box', resize:'vertical' }}
                  onFocus={e=>{e.target.style.borderColor=BRAND}} onBlur={e=>{e.target.style.borderColor='#E5E7EB'}}
                />
              </div>

              <button onClick={startSession} disabled={starting||!script.trim()||(!!session&&!ended)} style={{ width:'100%', padding:'12px', borderRadius:11, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:14, cursor:starting||!script.trim()||(session&&!ended)?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:session&&!ended?0.5:1, boxShadow:'0 3px 14px rgba(255,107,53,.25)', fontFamily:'inherit' }}>
                {starting ? <Loader2 size={15} style={{ animation:'spin .7s linear infinite' }}/> : <Zap size={15}/>}
                {session && !ended ? 'Session active...' : ended ? 'Start New Session' : 'Start Simulation'}
              </button>

              {session && (
                <button onClick={reset} style={{ width:'100%', marginTop:8, padding:'10px', borderRadius:11, border:'1px solid #E5E7EB', background:'#fff', color:'#6B7280', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit' }}>
                  <RotateCcw size={13}/> Reset
                </button>
              )}
            </div>
          </div>

          {/* Collected data */}
          {hasCollected && (
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', marginTop:14, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6' }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:'#0f0f0f', margin:0 }}>Collected Data</h3>
              </div>
              <div style={{ padding:'14px 20px' }}>
                {Object.entries(collectedData).map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #F9FAFB', fontSize:13 }}>
                    <span style={{ color:'#6B7280', textTransform:'capitalize', fontWeight:500 }}>{k.replace(/_/g,' ')}</span>
                    <span style={{ fontWeight:700, color:'#0f0f0f' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat panel */}
        {session && (
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', overflow:'hidden', display:'flex', flexDirection:'column', height:'calc(100vh - 140px)', minHeight:500 }}>
            {/* Chat header */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:GRAD, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Bot size={16} color="#fff"/>
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'#0f0f0f', margin:0 }}>{personaName} (AI)</p>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:6, height:6, borderRadius:'50%', background:ended?'#D1D5DB':'#10B981', animation:ended?'none':'ping 1.5s ease-in-out infinite', display:'inline-block' }}/>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>{ended?'Call ended':'Live session'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'#FFF4F0', color:BRAND }}>{LANGS.find(l=>l.code===language)?.full}</span>
                {ended && <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:'#F9FAFB', color:'#9CA3AF' }}>Ended</span>}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
              {transcript.length === 0 ? (
                <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, color:'#D1D5DB' }}>
                  <Bot size={36} color="#E5E7EB"/>
                  <p style={{ fontSize:13, color:'#D1D5DB', margin:0 }}>Session started. AI will speak first...</p>
                </div>
              ) : transcript.map((msg,i) => <Bubble key={i} msg={msg}/>)}
              {loading && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-end', marginBottom:14 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Bot size={14} color="#fff"/>
                  </div>
                  <div style={{ padding:'12px 16px', background:'#fff', border:'1px solid #E5E7EB', borderRadius:'4px 16px 16px 16px' }}>
                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                      {[0,.2,.4].map(d=><div key={d} style={{ width:6, height:6, borderRadius:'50%', background:'#D1D5DB', animation:`bounce .9s ease-in-out ${d}s infinite` }}/>)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Quick replies */}
            {!ended && !loading && transcript.length > 0 && (
              <div style={{ padding:'8px 16px', borderTop:'1px solid #F9FAFB', display:'flex', gap:6, overflowX:'auto' }}>
                {(QUICK_REPLIES[language]||QUICK_REPLIES.en).map(r => (
                  <button key={r} onClick={()=>sendMessage(r)} style={{ padding:'6px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:'#F9FAFB', border:'1px solid #E5E7EB', color:'#374151', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit', transition:'all .15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='#FFF4F0';e.currentTarget.style.borderColor=BRAND;e.currentTarget.style.color=BRAND}}
                    onMouseLeave={e=>{e.currentTarget.style.background='#F9FAFB';e.currentTarget.style.borderColor='#E5E7EB';e.currentTarget.style.color='#374151'}}>
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            {!ended && (
              <div style={{ padding:'14px 16px', borderTop:'1px solid #F3F4F6', display:'flex', gap:10 }}>
                <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder={`Reply as ${contactName}...`}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}}
                  disabled={loading}
                  style={{ flex:1, padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:11, fontSize:14, color:'#374151', background:'#fff', fontFamily:'inherit', outline:'none', transition:'border-color .15s' }}
                  onFocus={e=>e.target.style.borderColor=BRAND} onBlur={e=>e.target.style.borderColor='#E5E7EB'}
                />
                <button onClick={()=>sendMessage()} disabled={loading||!input.trim()} style={{ width:44, height:44, borderRadius:11, border:'none', background:input.trim()?GRAD:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', cursor:input.trim()?'pointer':'not-allowed', flexShrink:0, transition:'all .15s' }}>
                  {loading ? <Loader2 size={16} color="#9CA3AF" style={{ animation:'spin .7s linear infinite' }}/> : <Send size={16} color={input.trim()?'#fff':'#D1D5DB'}/>}
                </button>
              </div>
            )}

            {ended && (
              <div style={{ padding:'16px', borderTop:'1px solid #F3F4F6', textAlign:'center' }}>
                <p style={{ fontSize:13, color:'#9CA3AF', margin:'0 0 10px' }}>This simulation has ended.</p>
                <button onClick={reset} style={{ padding:'10px 24px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Start New Simulation
                </button>
              </div>
            )}
          </div>
        )}

        {/* No session yet — placeholder */}
        {!session && (
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'64px 32px', textAlign:'center' }}>
            <div style={{ width:72, height:72, borderRadius:20, background:'#FFF4F0', border:'1px solid #FFD4C2', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, fontSize:32 }}>🤖</div>
            <h3 style={{ fontSize:17, fontWeight:800, color:'#0f0f0f', margin:'0 0 8px' }}>Ready to Test</h3>
            <p style={{ fontSize:14, color:'#9CA3AF', margin:'0 0 4px', maxWidth:320 }}>Configure your script on the left and click Start Simulation to begin a live AI conversation.</p>
            <p style={{ fontSize:12, color:'#D1D5DB', margin:'12px 0 0' }}>No real calls are made · Charges may apply for AI usage</p>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}} @keyframes ping{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  )
}
