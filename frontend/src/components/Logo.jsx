// src/components/Logo.jsx
// Usage:
//   <Logo />              — default, dark text (light bg)
//   <Logo dark />         — white text (dark bg)
//   <Logo size="sm" />    — small (sidebar)
//   <Logo size="lg" />    — large (landing/login)
//   <Logo iconOnly />     — icon only, no text

export default function Logo({ dark = false, size = 'md', iconOnly = false }) {
  const s = {
    sm: { icon: 36, core: 26, mic: 12, ring: 36, t1: 17, t2: 8,  gap: 10 },
    md: { icon: 52, core: 38, mic: 18, ring: 52, t1: 26, t2: 10, gap: 15 },
    lg: { icon: 64, core: 48, mic: 22, ring: 64, t1: 34, t2: 12, gap: 20 },
  }[size] || { icon: 52, core: 38, mic: 18, ring: 52, t1: 26, t2: 10, gap: 15 }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>

      {/* Animated sonar icon */}
      <div style={{
        width: s.icon, height: s.icon, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {[0, 0.8, 1.6].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: s.ring, height: s.ring,
            borderRadius: '50%',
            border: '1.5px solid #f5a623',
            animation: `voiceai-sonar 2.4s cubic-bezier(0.4,0,0.6,1) ${delay}s infinite`,
          }}/>
        ))}
        <div style={{
          width: s.core, height: s.core, borderRadius: '50%',
          background: 'linear-gradient(145deg, #f5a623, #d4880a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 2,
          boxShadow: '0 0 24px rgba(245,166,35,0.5), 0 0 8px rgba(245,166,35,0.3)',
        }}>
          <svg width={s.mic} height={s.mic} viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="11" rx="3" fill="white"/>
            <path d="M5 10C5 14.418 8.134 18 12 18C15.866 18 19 14.418 19 10"
              stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="9"  y1="22" x2="15" y2="22" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Text */}
      {!iconOnly && (
        <div>
          {/* VoiceAI India — stretched letter spacing to match subtitle width */}
          <div style={{
            fontFamily: '"Raleway", sans-serif',
            fontWeight: 900,
            fontSize: s.t1,
            letterSpacing: '1.5px',
            lineHeight: 1,
            color: dark ? '#ffffff' : '#1a1a1a',
          }}>
            VoiceAI <span style={{ color: '#f5a623' }}>India</span>
          </div>
          {/* By RiseAscend Tech — wide spacing to match title width */}
          <div style={{
            fontFamily: '"Raleway", sans-serif',
            fontWeight: 600,
            fontSize: s.t2,
            color: dark ? '#555555' : '#b0b0b0',
            letterSpacing: '5.8px',
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            By RiseAscend Tech
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@600;900&display=swap');
        @keyframes voiceai-sonar {
          0%   { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
