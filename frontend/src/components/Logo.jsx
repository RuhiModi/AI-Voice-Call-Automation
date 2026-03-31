// src/components/Logo.jsx — SamwadAI
// Usage:
//   <Logo />              — default (light bg)
//   <Logo dark />         — white text (dark bg)
//   <Logo size="sm" />    — sidebar
//   <Logo size="md" />    — default
//   <Logo size="lg" />    — landing/login
//   <Logo iconOnly />     — icon only

export default function Logo({ dark = false, size = 'md', iconOnly = false }) {
  const s = {
    sm: { wrap: 34, core: 34, mic: 14, ring: 34, t1: 17, t2: 9,  gap: 10 },
    md: { wrap: 46, core: 46, mic: 19, ring: 46, t1: 24, t2: 10, gap: 13 },
    lg: { wrap: 60, core: 60, mic: 24, ring: 60, t1: 32, t2: 12, gap: 18 },
  }[size] || { wrap: 46, core: 46, mic: 19, ring: 46, t1: 24, t2: 10, gap: 13 }

  const uid = `sw-${size}`   // unique keyframe names per size

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, userSelect: 'none' }}>

      {/* ── Animated icon ── */}
      <div style={{
        width: s.wrap, height: s.wrap, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {/* Sound-wave rings — 3 concentric pulses */}
        {[0, 0.7, 1.4].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: s.ring, height: s.ring, borderRadius: '50%',
            border: `1.5px solid #FF6B35`,
            animation: `${uid}-pulse 2.1s cubic-bezier(0.4,0,0.6,1) ${delay}s infinite`,
            opacity: 0,
          }} />
        ))}

        {/* Core circle — gradient saffron→coral */}
        <div style={{
          width: s.core, height: s.core, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 40%, #E63946 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 2,
          boxShadow: '0 4px 20px rgba(255,107,53,0.40), 0 1px 4px rgba(255,107,53,0.20)',
          animation: `${uid}-breathe 3s ease-in-out infinite`,
        }}>
          {/* Mic icon — white, clean */}
          <svg width={s.mic} height={s.mic} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
            <rect x="9" y="2" width="6" height="11" rx="3" fill="white"/>
            <path d="M5 10C5 14.418 8.134 18 12 18C15.866 18 19 14.418 19 10"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="9"  y1="22" x2="15" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Animated sound bars — sit at bottom-right of icon */}
        <div style={{
          position: 'absolute', bottom: -2, right: -4,
          display: 'flex', alignItems: 'flex-end', gap: 2,
          zIndex: 3,
        }}>
          {[1, 1.5, 0.8, 1.2, 0.6].map((h, i) => (
            <div key={i} style={{
              width: 2.5, borderRadius: 2,
              background: dark ? '#FF8C42' : '#FF6B35',
              animation: `${uid}-bar 1.1s ease-in-out ${i * 0.12}s infinite`,
              height: `${h * (s.core * 0.18)}px`,
            }} />
          ))}
        </div>
      </div>

      {/* ── Wordmark ── */}
      {!iconOnly && (
        <div style={{ lineHeight: 1 }}>
          <div style={{
            fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif',
            fontWeight: 800,
            fontSize: s.t1,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: dark ? '#ffffff' : '#0f0f0f',
          }}>
            Samwad<span style={{
              background: 'linear-gradient(135deg, #FF8C42, #E63946)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>AI</span>
          </div>
          <div style={{
            fontFamily: '"Plus Jakarta Sans", "DM Sans", sans-serif',
            fontWeight: 500,
            fontSize: s.t2,
            color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 3,
          }}>
            Voice Intelligence
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

        @keyframes ${uid}-pulse {
          0%   { transform: scale(0.4); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes ${uid}-breathe {
          0%, 100% { box-shadow: 0 4px 20px rgba(255,107,53,0.40), 0 1px 4px rgba(255,107,53,0.20); }
          50%       { box-shadow: 0 6px 28px rgba(255,107,53,0.60), 0 2px 8px rgba(255,107,53,0.30); }
        }
        @keyframes ${uid}-bar {
          0%, 100% { transform: scaleY(0.4); }
          50%       { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  )
}
