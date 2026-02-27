import { useState, useEffect, useRef } from 'react'
import { campaignApi, simulateApi } from '../hooks/api'
import toast from 'react-hot-toast'
import { Phone, PhoneOff, Send, Mic, Bot, User, ChevronDown, Loader, Zap, Info } from 'lucide-react'

const langNames  = { gu: 'Gujarati', hi: 'Hindi', en: 'English' }
const langColors = { gu: '#f5a623', hi: '#2fa05c', en: '#0ea5e9' }

const actionLabels = {
  continue:   null,
  end_call:   '📴 Call ended by AI',
  transfer:   '🔀 Transfer to human requested',
  dnc:        '🚫 Contact said do not call',
  reschedule: '📅 Rescheduled',
}

// Quick reply suggestions per language
const QUICK_REPLIES = {
  gu: ['હા, બરાબર છે', 'ના, હું વ્યસ્ત છું', 'મને સમજ નથી પડ્યું', 'ઠીક છે, આગળ ચાલો', 'Human agent સાથે વાત કરવી છે'],
  hi: ['हाँ, ठीक है', 'नहीं, मैं व्यस्त हूँ', 'मुझे समझ नहीं आया', 'ठीक है, आगे बढ़ें', 'मानव एजेंट से बात करें'],
  en: ['Yes, that\'s correct', 'No, I\'m busy', 'I don\'t understand', 'OK, continue', 'Transfer to human'],
}

function MessageBubble({ msg }) {
  const isAI     = msg.role === 'assistant'
  const actionLabel = actionLabels[msg.action]
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} gap-2.5 mb-3`}>
      {isAI && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
          style={{ background: '#f5a623' }}>
          <Bot size={13} className="text-white" />
        </div>
      )}
      <div className={`max-w-[78%]`}>
        <div className="px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed"
          style={isAI
            ? { background: '#fff', border: '1px solid #e8e3db', color: '#1a1a1a', borderRadius: '4px 18px 18px 18px' }
            : { background: '#1a1a1a', color: '#fff', borderRadius: '18px 4px 18px 18px' }}>
          {msg.content}
        </div>
        {actionLabel && (
          <div className="mt-1.5 text-[11px] px-2" style={{ color: '#a8a8a8' }}>{actionLabel}</div>
        )}
        <div className="mt-1 text-[10px] px-2" style={{ color: '#c4c4c4' }}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
        </div>
      </div>
      {!isAI && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
          style={{ background: '#e8e3db' }}>
          <User size={13} style={{ color: '#6b6b6b' }} />
        </div>
      )}
    </div>
  )
}

export default function Simulate() {
  const [campaigns,   setCampaigns]   = useState([])
  const [selectedCamp, setSelectedCamp] = useState('')
  const [session,     setSession]     = useState(null)   // active sim session
  const [transcript,  setTranscript]  = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [starting,    setStarting]    = useState(false)
  const [lang,        setLang]        = useState('gu')
  const [sessionEnded, setSessionEnded] = useState(false)
  const [collectedData, setCollectedData] = useState({})
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load campaigns on mount
  useEffect(() => {
    campaignApi.list()
      .then(r => {
        const camps = r.data.campaigns || []
        setCampaigns(camps)
        if (camps.length > 0) setSelectedCamp(camps[0].id)
      })
      .catch(() => toast.error('Could not load campaigns'))
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  async function startSim() {
    if (!selectedCamp) { toast.error('Select a campaign first'); return }
    setStarting(true)
    setSessionEnded(false)
    setCollectedData({})
    try {
      const res = await simulateApi.start(selectedCamp)
      const d   = res.data
      setSession(d)
      setLang(d.language || 'gu')
      setTranscript(d.transcript || [])
      toast.success('Simulation started!')
      setTimeout(() => inputRef.current?.focus(), 300)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start simulation')
    } finally {
      setStarting(false)
    }
  }

  async function sendMessage(text) {
    const msg = (text || input).trim()
    if (!msg || !session || sessionEnded) return
    setInput('')
    setLoading(true)
    try {
      const res = await simulateApi.message(session.session_id, msg)
      const d   = res.data
      setTranscript(d.transcript || [])
      setLang(d.detected_language || lang)
      if (d.collected_data && Object.keys(d.collected_data).length > 0) {
        setCollectedData(prev => ({ ...prev, ...d.collected_data }))
      }
      if (d.session_status === 'ended') {
        setSessionEnded(true)
        toast(`Call ended: ${actionLabels[d.action] || d.action}`, { icon: '📴' })
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message')
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
      setSessionEnded(true)
      setTranscript(res.data.transcript || transcript)
      toast.success(`Simulation ended · ${res.data.duration_sec}s · ${res.data.total_turns} turns`)
    } catch (err) {
      toast.error('Failed to end simulation')
    } finally {
      setLoading(false)
    }
  }

  function resetSim() {
    setSession(null)
    setTranscript([])
    setSessionEnded(false)
    setCollectedData({})
    setInput('')
  }

  const quickReplies = QUICK_REPLIES[lang] || QUICK_REPLIES.gu
  const selectedCampaign = campaigns.find(c => c.id === selectedCamp)

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl" style={{ color: '#1a1a1a', fontFamily: '"DM Serif Display",serif' }}>
          Call Simulator
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8a8a8a' }}>
          Test your campaign AI without making real calls — uses Groq LLM with your real script
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-6"
        style={{ background: '#f0faf4', border: '1px solid #b8e6cb' }}>
        <Info size={15} style={{ color: '#228248', flexShrink: 0, marginTop: 1 }} />
        <div className="text-[13px]" style={{ color: '#1c673a' }}>
          <strong>How it works:</strong> Select a campaign → Start simulation → Type what the contact would say →
          The AI responds exactly as it would in a real call. No phone or Vobiz needed.
          Your Groq API key powers the AI responses.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Setup + Info ── */}
        <div className="space-y-4">

          {/* Campaign selector */}
          <div className="card p-5">
            <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b6b6b' }}>
              Campaign
            </p>
            <div className="relative mb-4">
              <select value={selectedCamp} onChange={e => setSelectedCamp(e.target.value)}
                disabled={!!session}
                className="input-field pr-8 appearance-none cursor-pointer text-[13px]"
                style={{ paddingRight: '32px' }}>
                {campaigns.length === 0
                  ? <option value="">No campaigns — create one first</option>
                  : campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                }
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#a8a8a8' }} />
            </div>

            {selectedCampaign && (
              <div className="space-y-2 mb-4 p-3 rounded-xl" style={{ background: '#faf8f4' }}>
                {[
                  { label: 'Language', value: langNames[selectedCampaign.language_priority] || 'Gujarati' },
                  { label: 'Agent',    value: selectedCampaign.persona_name || 'Priya' },
                  { label: 'Type',     value: selectedCampaign.campaign_type || 'custom' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[12px]">
                    <span style={{ color: '#a8a8a8' }}>{label}</span>
                    <span className="font-medium capitalize" style={{ color: '#3d3d3d' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {!session ? (
              <button onClick={startSim} disabled={starting || !selectedCamp || campaigns.length === 0}
                className="btn-primary w-full justify-center gap-2"
                style={{ background: '#2fa05c' }}>
                {starting
                  ? <><Loader size={14} className="animate-spin" /> Starting...</>
                  : <><Phone size={14} /> Start Simulation</>
                }
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: '#dcf3e5' }}>
                  <div className="w-2 h-2 rounded-full dot-live" style={{ background: '#52b87c' }} />
                  <span className="text-[12px] font-semibold" style={{ color: '#228248' }}>
                    {sessionEnded ? 'Ended' : 'Simulation Active'}
                  </span>
                  {!sessionEnded && (
                    <span className="text-[11px] ml-auto" style={{ color: '#52b87c' }}>
                      Lang: {lang.toUpperCase()}
                    </span>
                  )}
                </div>
                {!sessionEnded ? (
                  <button onClick={endSim} disabled={loading}
                    className="btn-secondary w-full justify-center gap-2 text-[13px]"
                    style={{ borderColor: '#fecdd3', color: '#e11d48' }}>
                    <PhoneOff size={13} /> End Call
                  </button>
                ) : (
                  <button onClick={resetSim} className="btn-primary w-full justify-center gap-2">
                    <Phone size={13} /> New Simulation
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Collected data */}
          {Object.keys(collectedData).length > 0 && (
            <div className="card p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b6b6b' }}>
                Collected Data
              </p>
              <div className="space-y-2">
                {Object.entries(collectedData).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-start gap-2">
                    <span className="text-[11px] font-medium" style={{ color: '#a8a8a8' }}>{k}</span>
                    <span className="text-[12px] font-semibold text-right" style={{ color: '#1a1a1a' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact info */}
          {session && (
            <div className="card p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b6b6b' }}>
                Simulated Contact
              </p>
              <p className="text-[13px] font-medium mb-1" style={{ color: '#1a1a1a' }}>
                {session.contact?.variables?.name || 'Contact'}
              </p>
              <p className="text-[12px]" style={{ color: '#8a8a8a' }}>{session.contact?.phone}</p>
              {session.contact?.variables && Object.entries(session.contact.variables).map(([k, v]) => (
                k !== 'name' && (
                  <p key={k} className="text-[11px] mt-1" style={{ color: '#a8a8a8' }}>
                    {k}: <span style={{ color: '#6b6b6b' }}>{v}</span>
                  </p>
                )
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Chat window ── */}
        <div className="lg:col-span-2 flex flex-col" style={{ minHeight: '520px' }}>
          <div className="card flex flex-col h-full overflow-hidden">

            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid #f5f1ea' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#fef3d0' }}>
                <Bot size={17} style={{ color: '#f5a623' }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: '#1a1a1a' }}>
                  {session?.campaign_name
                    ? `${selectedCampaign?.persona_name || 'Priya'} · ${session.campaign_name}`
                    : 'AI Voice Agent'}
                </p>
                <p className="text-[11px]" style={{ color: '#a8a8a8' }}>
                  {session && !sessionEnded
                    ? `Live · ${langNames[lang]} · Powered by Groq`
                    : session && sessionEnded
                      ? 'Call ended'
                      : 'Start a simulation to begin'}
                </p>
              </div>
              {session && !sessionEnded && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: '#dcf3e5', color: '#228248' }}>
                  <div className="w-1.5 h-1.5 rounded-full dot-live" style={{ background: '#52b87c' }} />
                  LIVE
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5" style={{ background: '#fdfcfa', minHeight: '340px' }}>
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f5f1ea' }}>
                    <Zap size={24} style={{ color: '#d0c9be' }} />
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: '#6b6b6b', fontFamily: '"DM Serif Display",serif' }}>
                    No conversation yet
                  </p>
                  <p className="text-[12px]" style={{ color: '#a8a8a8' }}>
                    Select a campaign and click "Start Simulation"
                  </p>
                </div>
              ) : (
                <>
                  {transcript.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                  {loading && (
                    <div className="flex justify-start gap-2.5 mb-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f5a623' }}>
                        <Bot size={13} className="text-white" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl" style={{ background: '#fff', border: '1px solid #e8e3db', borderRadius: '4px 18px 18px 18px' }}>
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#d0c9be', animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Quick replies */}
            {session && !sessionEnded && transcript.length > 0 && (
              <div className="px-4 py-2.5 flex gap-2 overflow-x-auto" style={{ borderTop: '1px solid #f5f1ea', background: '#fdfcfa' }}>
                {quickReplies.map(reply => (
                  <button key={reply} onClick={() => sendMessage(reply)} disabled={loading}
                    className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                    style={{ background: '#f5f1ea', color: '#525252', border: '1px solid #e8e3db', whiteSpace: 'nowrap' }}>
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4" style={{ borderTop: '1px solid #f5f1ea' }}>
              {!session ? (
                <div className="text-center text-[12px] py-1" style={{ color: '#c4c4c4' }}>
                  Start a simulation to type messages
                </div>
              ) : sessionEnded ? (
                <div className="text-center text-[12px] py-1" style={{ color: '#a8a8a8' }}>
                  Call ended · Click "New Simulation" to start again
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type what the contact would say... (Press Enter to send)"
                    disabled={loading}
                    className="input-field flex-1 text-[13px]"
                  />
                  <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                    className="btn-primary flex-shrink-0 px-4"
                    style={{ background: loading || !input.trim() ? '#dcdcdc' : '#1a1a1a' }}>
                    {loading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
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
