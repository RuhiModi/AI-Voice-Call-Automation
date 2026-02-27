import { useState, useEffect, useRef } from 'react'
import { campaignApi, simulateApi } from '../hooks/api'
import toast from 'react-hot-toast'
import {
  Phone, PhoneOff, Send, Bot, User, ChevronDown,
  Loader, Zap, FileText, Globe, Upload, Info, RotateCcw
} from 'lucide-react'

const langNames = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }

const actionLabels = {
  end_call:   '📴 AI ended the call',
  transfer:   '🔀 Transfer to human requested',
  dnc:        '🚫 Do not call requested',
  reschedule: '📅 Callback requested',
}

const QUICK_REPLIES = {
  gu: ['હા, બરાબર છે', 'ના, ભૂલ છે', 'હું વ્યસ્ત છું', 'મને સમજ ન પડ્યું', 'Human સાથે વાત'],
  hi: ['हाँ, सही है', 'नहीं, गलत है', 'मैं व्यस्त हूं', 'समझ नहीं आया', 'Human से बात करें'],
  en: ['Yes, correct', 'No, that\'s wrong', 'I\'m busy right now', 'I don\'t understand', 'Transfer to human'],
}

// ── Chat bubble ───────────────────────────────────────────────
function Bubble({ msg }) {
  const isAI = msg.role === 'assistant'
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} gap-2 mb-3`}>
      {isAI && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 mt-1 flex items-center justify-center" style={{ background: '#f5a623' }}>
          <Bot size={13} color="#fff" />
        </div>
      )}
      <div className="max-w-[80%]">
        <div className="px-4 py-2.5 text-[13px] leading-relaxed"
          style={isAI
            ? { background: '#fff', border: '1px solid #e8e3db', borderRadius: '4px 16px 16px 16px', color: '#1a1a1a' }
            : { background: '#1a1a1a', borderRadius: '16px 4px 16px 16px', color: '#fff' }}>
          {msg.content}
        </div>
        {msg.action && actionLabels[msg.action] && (
          <p className="text-[11px] mt-1 px-1" style={{ color: '#a8a8a8' }}>{actionLabels[msg.action]}</p>
        )}
        <p className="text-[10px] mt-0.5 px-1" style={{ color: '#d0c9be' }}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
        </p>
      </div>
      {!isAI && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 mt-1 flex items-center justify-center" style={{ background: '#e8e3db' }}>
          <User size={13} color="#6b6b6b" />
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Simulate() {
  const [campaigns,     setCampaigns]     = useState([])
  const [campaignId,    setCampaignId]    = useState('')
  const [session,       setSession]       = useState(null)
  const [transcript,    setTranscript]    = useState([])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [starting,      setStarting]      = useState(false)
  const [ended,         setEnded]         = useState(false)
  const [collectedData, setCollectedData] = useState({})
  const [showSetup,     setShowSetup]     = useState(true)

  // Script config
  const [script,      setScript]      = useState('')
  const [language,    setLanguage]    = useState('en')
  const [contactName, setContactName] = useState('Rajesh Bhai')
  const [personaName, setPersonaName] = useState('Priya')

  // Script input mode
  const [scriptTab,   setScriptTab]   = useState('text')
  const [urlInput,    setUrlInput]    = useState('')
  const [urlLoading,  setUrlLoading]  = useState(false)
  const [pdfLoading,  setPdfLoading]  = useState(false)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const fileRef   = useRef(null)

  useEffect(() => {
    campaignApi.list()
      .then(r => {
        const camps = r.data.campaigns || []
        setCampaigns(camps)
        if (camps.length) {
          const first = camps[0]
          setCampaignId(first.id)
          setLanguage(first.language_priority || 'en')
          setPersonaName(first.persona_name   || 'Priya')
          if (first.script_content) setScript(first.script_content)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  function handleCampaignChange(id) {
    setCampaignId(id)
    if (!id) return
    const camp = campaigns.find(c => c.id === id)
    if (!camp) return
    setLanguage(camp.language_priority || 'en')
    setPersonaName(camp.persona_name   || 'Priya')
    if (camp.script_content) setScript(camp.script_content)
  }

  async function fetchUrl() {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    try {
      const res = await simulateApi.extractUrl(urlInput.trim())
      setScript(res.data.text || '')
      setScriptTab('text')
      toast.success('Website content extracted!')
    } catch {
      toast.error('Could not fetch URL — paste content manually instead')
    } finally { setUrlLoading(false) }
  }

  async function uploadPdf(file) {
    if (!file) return
    setPdfLoading(true)
    try {
      const form = new FormData()
      form.append('pdf', file)
      const res = await simulateApi.extractPdf(form)
      setScript(res.data.text || '')
      setScriptTab('text')
      toast.success(`PDF extracted: ${file.name}`)
    } catch {
      toast.error('Could not read PDF')
    } finally { setPdfLoading(false) }
  }

  async function startSim() {
    setStarting(true)
    setEnded(false)
    setCollectedData({})
    try {
      const res = await simulateApi.start(
        campaignId || null,
        script,
        personaName,
        language,
        contactName
      )
      setSession(res.data)
      setTranscript(res.data.transcript || [])
      setShowSetup(false)
      toast.success('Simulation started!')
      setTimeout(() => inputRef.current?.focus(), 200)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start simulation')
    } finally { setStarting(false) }
  }

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || !session || ended) return
    setInput('')
    setLoading(true)
    try {
      const res = await simulateApi.message(session.session_id, msg)
      setTranscript(res.data.transcript || [])
      if (res.data.collected_data) setCollectedData(res.data.collected_data)
      if (res.data.session_status === 'ended') {
        setEnded(true)
        toast('Call ended', { icon: '📴' })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error sending message')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function endSim() {
    if (!session) return
    setLoading(true)
    try {
      const res = await simulateApi.end(session.session_id, 'manual')
      setEnded(true)
      setTranscript(res.data.transcript || transcript)
      toast.success(`Ended · ${res.data.duration_sec}s · ${res.data.total_turns} turns`)
    } catch { toast.error('Failed to end') }
    finally { setLoading(false) }
  }

  function reset() {
    setSession(null); setTranscript([])
    setEnded(false);  setCollectedData({})
    setInput('');     setShowSetup(true)
  }

  const quickReplies = QUICK_REPLIES[language] || QUICK_REPLIES.en

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>Call Simulator</h1>
          <p className="text-sm mt-1" style={{ color: '#8a8a8a' }}>Test your AI agent without making real calls</p>
        </div>
        {session && (
          <button onClick={reset} className="btn-secondary gap-2 text-[13px]">
            <RotateCcw size={13} /> New Simulation
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-5" style={{ background: '#f0faf4', border: '1px solid #b8e6cb' }}>
        <Info size={14} style={{ color: '#228248', flexShrink: 0, marginTop: 1 }} />
        <p className="text-[12px]" style={{ color: '#1c673a' }}>
          <strong>No Vobiz or phone needed.</strong> Type/upload your script → set language & agent name → Start → 
          type what the contact would say. The AI responds using your actual script via Groq.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Config ── */}
        <div className="space-y-4">

          {/* Campaign selector */}
          <div className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#a8a8a8' }}>Campaign (optional)</p>
            <div className="relative">
              <select value={campaignId} onChange={e => handleCampaignChange(e.target.value)}
                disabled={!!session}
                className="input-field appearance-none text-[13px]" style={{ paddingRight: 28 }}>
                <option value="">— No campaign (use script below) —</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8a8a8' }} />
            </div>
          </div>

          {/* Setup — only before starting */}
          {showSetup && (
            <>
              {/* Basic config */}
              <div className="card p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#a8a8a8' }}>Settings</p>

                <div>
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: '#6b6b6b' }}>Language</label>
                  <div className="relative">
                    <select value={language} onChange={e => setLanguage(e.target.value)}
                      className="input-field appearance-none text-[13px]" style={{ paddingRight: 28 }}>
                      <option value="en">English</option>
                      <option value="gu">Gujarati</option>
                      <option value="hi">Hindi</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8a8a8' }} />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: '#6b6b6b' }}>Contact Name</label>
                  <input value={contactName} onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. Rajesh Bhai" className="input-field text-[13px]" />
                </div>

                <div>
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: '#6b6b6b' }}>Agent / Persona Name</label>
                  <input value={personaName} onChange={e => setPersonaName(e.target.value)}
                    placeholder="e.g. Priya, Rahul" className="input-field text-[13px]" />
                </div>
              </div>

              {/* Script input */}
              <div className="card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#a8a8a8' }}>Script / Context</p>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-lg mb-3" style={{ background: '#f5f1ea' }}>
                  {[
                    ['text', <FileText size={11} />, 'Type'],
                    ['url',  <Globe size={11} />,    'URL'],
                    ['pdf',  <Upload size={11} />,   'PDF'],
                  ].map(([key, icon, label]) => (
                    <button key={key} onClick={() => setScriptTab(key)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
                      style={scriptTab === key
                        ? { background: '#fff', color: '#1a1a1a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                        : { color: '#8a8a8a' }}>
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {/* Text */}
                {scriptTab === 'text' && (
                  <>
                    <textarea value={script} onChange={e => setScript(e.target.value)} rows={7}
                      placeholder={`Paste your call script here...\n\nExample:\nHello! I'm calling to confirm your appointment tomorrow at 10 AM. Can you confirm attendance?\n\nIf they can't make it, ask for a preferred reschedule time.`}
                      className="input-field w-full resize-none text-[12px] leading-relaxed"
                      style={{ fontFamily: 'monospace' }} />
                    {script && (
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px]" style={{ color: '#a8a8a8' }}>{script.length} chars</span>
                        <button onClick={() => setScript('')} className="text-[10px]" style={{ color: '#f43f5e' }}>Clear</button>
                      </div>
                    )}
                  </>
                )}

                {/* URL */}
                {scriptTab === 'url' && (
                  <div className="space-y-2">
                    <p className="text-[11px]" style={{ color: '#8a8a8a' }}>Extract content from any website to use as script context</p>
                    <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchUrl()}
                      placeholder="https://yourwebsite.com/product-page"
                      className="input-field text-[13px]" />
                    <button onClick={fetchUrl} disabled={urlLoading || !urlInput.trim()}
                      className="btn-primary w-full justify-center gap-2 text-[13px]"
                      style={{ background: urlLoading || !urlInput.trim() ? '#d0c9be' : '#1a1a1a' }}>
                      {urlLoading
                        ? <><Loader size={13} className="animate-spin" /> Fetching...</>
                        : <><Globe size={13} /> Extract Content</>}
                    </button>
                    {script && <p className="text-[11px] text-center" style={{ color: '#52b87c' }}>✅ Content extracted — switch to Text tab to review</p>}
                  </div>
                )}

                {/* PDF */}
                {scriptTab === 'pdf' && (
                  <div className="space-y-2">
                    <p className="text-[11px]" style={{ color: '#8a8a8a' }}>Upload a PDF — script, brochure, policy doc</p>
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                      onChange={e => uploadPdf(e.target.files[0])} />
                    <button onClick={() => fileRef.current?.click()} disabled={pdfLoading}
                      className="w-full flex flex-col items-center gap-2 py-7 rounded-xl border-2 border-dashed transition-all"
                      style={{ borderColor: '#e8e3db', background: '#faf8f4', cursor: 'pointer' }}>
                      {pdfLoading
                        ? <><Loader size={18} className="animate-spin" style={{ color: '#a8a8a8' }} /><span className="text-[11px]" style={{ color: '#a8a8a8' }}>Reading PDF...</span></>
                        : <><Upload size={18} style={{ color: '#a8a8a8' }} /><span className="text-[11px]" style={{ color: '#6b6b6b' }}>Click to upload PDF (max 5MB)</span></>
                      }
                    </button>
                    {script && <p className="text-[11px] text-center" style={{ color: '#52b87c' }}>✅ PDF extracted — switch to Text tab to review</p>}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Start button */}
          {!session ? (
            <button onClick={startSim} disabled={starting}
              className="btn-primary w-full justify-center gap-2"
              style={{ background: '#2fa05c', padding: '13px' }}>
              {starting
                ? <><Loader size={14} className="animate-spin" /> Starting...</>
                : <><Phone size={14} /> Start Simulation</>}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: ended ? '#f5f1ea' : '#dcf3e5' }}>
                {!ended && <div className="w-2 h-2 rounded-full" style={{ background: '#52b87c', boxShadow: '0 0 0 3px rgba(82,184,124,0.2)', animation: 'pulse 1.5s infinite' }} />}
                <span className="text-[12px] font-semibold" style={{ color: ended ? '#6b6b6b' : '#228248' }}>
                  {ended ? 'Call Ended' : `Live · ${langNames[language]}`}
                </span>
              </div>
              {!ended
                ? <button onClick={endSim} disabled={loading}
                    className="btn-secondary w-full justify-center gap-2 text-[13px]"
                    style={{ borderColor: '#fecdd3', color: '#e11d48' }}>
                    <PhoneOff size={13} /> End Call
                  </button>
                : <button onClick={reset} className="btn-primary w-full justify-center gap-2 text-[13px]">
                    <Phone size={13} /> New Simulation
                  </button>
              }
            </div>
          )}

          {/* Collected data */}
          {Object.keys(collectedData).length > 0 && (
            <div className="card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#a8a8a8' }}>Collected Data</p>
              {Object.entries(collectedData).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 text-[12px]" style={{ borderBottom: '1px solid #f5f1ea' }}>
                  <span style={{ color: '#a8a8a8' }}>{k}</span>
                  <span className="font-semibold" style={{ color: '#1a1a1a' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Chat ── */}
        <div className="lg:col-span-2 flex flex-col" style={{ minHeight: 560 }}>
          <div className="card flex flex-col h-full overflow-hidden">

            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid #f5f1ea' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#fef3d0' }}>
                <Bot size={17} style={{ color: '#f5a623' }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>
                  {personaName} · {session?.campaign_name || 'Custom Script'}
                </p>
                <p className="text-[11px]" style={{ color: '#a8a8a8' }}>
                  {!session ? 'Configure on the left → Start'
                    : ended ? 'Call ended'
                    : `Active · ${langNames[language]} · Groq AI`}
                </p>
              </div>
              {session && !ended && (
                <span className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: '#dcf3e5', color: '#228248' }}>
                  🔴 LIVE
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5" style={{ background: '#fdfcfa', minHeight: 360 }}>
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f5f1ea' }}>
                    <Zap size={24} style={{ color: '#d0c9be' }} />
                  </div>
                  <p style={{ fontFamily: '"DM Serif Display",serif', fontSize: 15, color: '#6b6b6b' }}>Ready to simulate</p>
                  <p className="text-[12px] max-w-xs" style={{ color: '#a8a8a8' }}>
                    {script ? '✅ Script loaded — click Start Simulation' : 'Add a script or select a campaign, then start'}
                  </p>
                </div>
              ) : (
                <>
                  {transcript.map((msg, i) => <Bubble key={i} msg={msg} />)}
                  {loading && (
                    <div className="flex gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#f5a623' }}>
                        <Bot size={13} color="#fff" />
                      </div>
                      <div className="px-4 py-3" style={{ background: '#fff', border: '1px solid #e8e3db', borderRadius: '4px 16px 16px 16px' }}>
                        <div className="flex gap-1">
                          {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#d0c9be', animationDelay: `${i*0.15}s` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Quick replies */}
            {session && !ended && transcript.length > 0 && (
              <div className="px-4 py-2.5 flex gap-2 overflow-x-auto" style={{ borderTop: '1px solid #f5f1ea' }}>
                {quickReplies.map(r => (
                  <button key={r} onClick={() => send(r)} disabled={loading}
                    className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full"
                    style={{ background: '#f5f1ea', color: '#525252', border: '1px solid #e8e3db', whiteSpace: 'nowrap' }}>
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4" style={{ borderTop: '1px solid #f5f1ea' }}>
              {!session ? (
                <p className="text-center text-[12px] py-1" style={{ color: '#c4c4c4' }}>Start a simulation to begin chatting</p>
              ) : ended ? (
                <p className="text-center text-[12px] py-1" style={{ color: '#a8a8a8' }}>Call ended — click "New Simulation" to start again</p>
              ) : (
                <div className="flex gap-2">
                  <input ref={inputRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder={`Type what ${contactName || 'the contact'} would say... (Enter to send)`}
                    disabled={loading} className="input-field flex-1 text-[13px]" />
                  <button onClick={() => send()} disabled={loading || !input.trim()}
                    className="btn-primary flex-shrink-0 px-4"
                    style={{ background: loading || !input.trim() ? '#d0c9be' : '#1a1a1a' }}>
                    {loading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
