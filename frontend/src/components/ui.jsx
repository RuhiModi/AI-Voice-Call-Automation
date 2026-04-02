// src/components/ui.jsx
// Shared SamwadAI design system components
// Import what you need: import { Btn, Card, PageHeader, Badge, Input, ... } from '../components/ui'

// ─── Brand tokens ────────────────────────────────────────────────
export const B = {
  primary:  '#FF6B35',
  grad:     'linear-gradient(135deg,#FF8C42 0%,#FF6B35 50%,#E63946 100%)',
  glow:     '0 4px 20px rgba(255,107,53,.30)',
  glowHover:'0 6px 28px rgba(255,107,53,.45)',
  gradText: {
    background: 'linear-gradient(135deg,#FF8C42,#FF6B35,#E63946)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
}

// ─── Page wrapper ─────────────────────────────────────────────────
export function Page({ children, style = {} }) {
  return (
    <div style={{ padding: '24px 28px 56px', maxWidth: 1280, margin: '0 auto', ...style }}>
      {children}
    </div>
  )
}

// ─── Page header ─────────────────────────────────────────────────
export function PageHeader({ title, sub, right }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f0f0f', margin:0, letterSpacing:'-0.025em' }}>{title}</h1>
        {sub && <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0', fontWeight:500 }}>{sub}</p>}
      </div>
      {right && <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>{right}</div>}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick, hover = false, padding = '20px 24px' }) {
  const [hov, setHov] = window.React?.useState ? window.React.useState(false) : [false, ()=>{}]
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background:'#fff', borderRadius:16, border:`1px solid ${hov?'#D1D5DB':'#E5E7EB'}`,
        boxShadow: hov ? '0 4px 20px rgba(0,0,0,.08)' : '0 1px 3px rgba(0,0,0,.04)',
        transition:'all .2s', padding, cursor: onClick ? 'pointer' : 'default',
        transform: hov && hover ? 'translateY(-2px)' : 'none',
        ...style,
      }}>
      {children}
    </div>
  )
}

// ─── Primary button ───────────────────────────────────────────────
export function Btn({ children, onClick, disabled, loading, type = 'button', size = 'md', variant = 'primary', style = {} }) {
  const sizes = {
    sm: { padding:'7px 14px', fontSize:12 },
    md: { padding:'10px 20px', fontSize:13 },
    lg: { padding:'13px 28px', fontSize:15 },
  }
  const variants = {
    primary: { background:B.grad, color:'#fff', border:'none', boxShadow:B.glow },
    outline: { background:'#fff', color:'#374151', border:'1.5px solid #E5E7EB', boxShadow:'none' },
    ghost:   { background:'transparent', color:'#9CA3AF', border:'none', boxShadow:'none' },
    danger:  { background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', boxShadow:'none' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{
        display:'inline-flex', alignItems:'center', gap:7, borderRadius:10, fontWeight:700,
        fontFamily:'"Plus Jakarta Sans",sans-serif', cursor:disabled||loading?'not-allowed':'pointer',
        opacity:disabled?0.5:1, transition:'all .15s',
        ...sizes[size], ...variants[variant], ...style,
      }}
      onMouseEnter={e => { if (!disabled && !loading && variant==='primary') e.currentTarget.style.boxShadow = B.glowHover }}
      onMouseLeave={e => { if (!disabled && !loading && variant==='primary') e.currentTarget.style.boxShadow = B.glow }}>
      {loading ? <Spinner size={14}/> : null}
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type='text', hint, required, readOnly, suffix, style={} }) {
  return (
    <div style={{ marginBottom:16, ...style }}>
      {label && (
        <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>
          {label}{required && <span style={{ color:B.primary }}> *</span>}
        </label>
      )}
      <div style={{ position:'relative' }}>
        <input
          type={type} value={value} placeholder={placeholder} readOnly={readOnly}
          onChange={onChange ? e=>onChange(e.target.value) : undefined}
          style={{
            width:'100%', padding:'11px 14px', paddingRight:suffix?44:14,
            border:'1.5px solid #E5E7EB', borderRadius:11, fontSize:14,
            color:'#0f0f0f', background: readOnly?'#F9FAFB':'#fff',
            fontFamily:'"Plus Jakarta Sans",sans-serif', boxSizing:'border-box',
            cursor:readOnly?'not-allowed':'text', transition:'border-color .15s, box-shadow .15s',
          }}
          onFocus={e => { e.target.style.borderColor=B.primary; e.target.style.boxShadow='0 0 0 3px rgba(255,107,53,.10)' }}
          onBlur={e  => { e.target.style.borderColor='#E5E7EB'; e.target.style.boxShadow='none' }}
        />
        {suffix && <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>{suffix}</div>}
      </div>
      {hint && <p style={{ fontSize:11, color:'#9CA3AF', margin:'5px 0 0' }}>{hint}</p>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────
export function Textarea({ label, value, onChange, placeholder, rows=4, hint, required, style={} }) {
  return (
    <div style={{ marginBottom:16, ...style }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>{label}{required && <span style={{ color:B.primary }}> *</span>}</label>}
      <textarea value={value} placeholder={placeholder} rows={rows}
        onChange={onChange ? e=>onChange(e.target.value) : undefined}
        style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:11, fontSize:14, color:'#0f0f0f', background:'#fff', fontFamily:'"Plus Jakarta Sans",sans-serif', boxSizing:'border-box', resize:'vertical', transition:'border-color .15s, box-shadow .15s' }}
        onFocus={e => { e.target.style.borderColor=B.primary; e.target.style.boxShadow='0 0 0 3px rgba(255,107,53,.10)' }}
        onBlur={e  => { e.target.style.borderColor='#E5E7EB'; e.target.style.boxShadow='none' }}
      />
      {hint && <p style={{ fontSize:11, color:'#9CA3AF', margin:'5px 0 0' }}>{hint}</p>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────
export function Select({ label, value, onChange, children, hint, style={} }) {
  return (
    <div style={{ marginBottom:16, ...style }}>
      {label && <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6B7280', marginBottom:6 }}>{label}</label>}
      <select value={value} onChange={onChange ? e=>onChange(e.target.value) : undefined}
        style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:11, fontSize:14, color:'#0f0f0f', background:'#fff', fontFamily:'"Plus Jakarta Sans",sans-serif', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center' }}
        onFocus={e => { e.target.style.borderColor=B.primary; e.target.style.boxShadow='0 0 0 3px rgba(255,107,53,.10)' }}
        onBlur={e  => { e.target.style.borderColor='#E5E7EB'; e.target.style.boxShadow='none' }}>
        {children}
      </select>
      {hint && <p style={{ fontSize:11, color:'#9CA3AF', margin:'5px 0 0' }}>{hint}</p>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────
export function Badge({ children, color = 'gray', dot = false, pulse = false }) {
  const colors = {
    green:  { bg:'#ECFDF5', text:'#065F46', dot:'#10B981' },
    orange: { bg:'#FFF4F0', text:'#C2410C', dot:'#FF6B35' },
    red:    { bg:'#FEF2F2', text:'#991B1B', dot:'#EF4444' },
    amber:  { bg:'#FFFBEB', text:'#92400E', dot:'#F59E0B' },
    blue:   { bg:'#EFF6FF', text:'#1E40AF', dot:'#3B82F6' },
    purple: { bg:'#F5F3FF', text:'#5B21B6', dot:'#8B5CF6' },
    gray:   { bg:'#F9FAFB', text:'#374151', dot:'#9CA3AF' },
  }
  const c = colors[color] || colors.gray
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.text }}>
      {dot && <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot, display:'inline-block', animation:pulse?'ping 1.5s ease-in-out infinite':'none' }}/>}
      {children}
    </span>
  )
}

// ─── Section card (for settings-style sections) ───────────────────
export function Section({ title, desc, badge, children, action }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', marginBottom:16, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #F3F4F6' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f0f0f', margin:0 }}>{title}</h3>
            {badge && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#ECFDF5', color:'#065F46' }}>{badge}</span>}
          </div>
          {desc && <p style={{ fontSize:12, color:'#9CA3AF', margin:'3px 0 0' }}>{desc}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding:'20px 22px' }}>{children}</div>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────
export function ProgressBar({ pct, color = B.primary }) {
  return (
    <div style={{ width:'100%', height:6, background:'#F3F4F6', borderRadius:99, overflow:'hidden' }}>
      <div style={{ height:6, width:`${Math.min(pct,100)}%`, background: color === B.primary ? B.grad : color, borderRadius:99, transition:'width .7s' }}/>
    </div>
  )
}

// ─── Alert banner ─────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const styles = {
    info:    { bg:'#EFF6FF', border:'#BFDBFE', color:'#1E40AF', icon:'ℹ️' },
    success: { bg:'#ECFDF5', border:'#A7F3D0', color:'#065F46', icon:'✅' },
    warning: { bg:'#FFFBEB', border:'#FDE68A', color:'#92400E', icon:'⚠️' },
    danger:  { bg:'#FEF2F2', border:'#FECACA', color:'#991B1B', icon:'❌' },
  }[type]
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', borderRadius:12, background:styles.bg, border:`1px solid ${styles.border}`, color:styles.color, fontSize:13, marginBottom:16 }}>
      <span style={{ fontSize:14 }}>{styles.icon}</span>
      <div style={{ flex:1 }}>{children}</div>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 20, color = B.primary }) {
  return (
    <div style={{ width:size, height:size, border:`2px solid ${color}30`, borderTop:`2px solid ${color}`, borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────
export function Empty({ icon, title, sub, action }) {
  return (
    <div style={{ padding:'52px 24px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
      <div style={{ width:60, height:60, borderRadius:16, background:'#F9FAFB', border:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:26 }}>
        {icon}
      </div>
      <p style={{ fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>{title}</p>
      {sub && <p style={{ fontSize:13, color:'#9CA3AF', margin:'0 0 20px', maxWidth:260 }}>{sub}</p>}
      {action}
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', borderBottom:'1px solid #E5E7EB', marginBottom:20 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding:'12px 20px', fontSize:13, fontWeight:active===t.key?700:500,
          color: active===t.key ? B.primary : '#6B7280',
          borderTop:'none', borderLeft:'none', borderRight:'none',
          borderBottom: active===t.key ? `2px solid ${B.primary}` : '2px solid transparent',
          background:'none', cursor:'pointer', transition:'all .15s',
          fontFamily:'"Plus Jakarta Sans",sans-serif',
          display:'flex', alignItems:'center', gap:7,
        }}>
          {t.icon && t.icon} {t.label}
          {t.count !== undefined && (
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:active===t.key?B.primary+'15':'#F3F4F6', color:active===t.key?B.primary:'#9CA3AF' }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────
export function Table({ cols, rows, onRow, empty }) {
  return (
    <div style={{ overflow:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #F3F4F6' }}>
            {cols.map(c => (
              <th key={c.key} style={{ padding:'10px 16px', textAlign: c.right?'right':'left', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9CA3AF', whiteSpace:'nowrap' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ padding:'40px 16px', textAlign:'center', color:'#D1D5DB', fontSize:13 }}>{empty || 'No data'}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} onClick={onRow ? () => onRow(row) : undefined}
              style={{ borderBottom:'1px solid #F9FAFB', cursor:onRow?'pointer':'default', transition:'background .15s' }}
              onMouseEnter={e => { if(onRow) e.currentTarget.style.background='#F9FAFB' }}
              onMouseLeave={e => { if(onRow) e.currentTarget.style.background='#fff' }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding:'12px 16px', color:'#374151', textAlign:c.right?'right':'left' }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Search input ─────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position:'relative' }}>
      <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
        <path d="m21 21-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ padding:'9px 14px 9px 36px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:13, color:'#374151', background:'#fff', fontFamily:'"Plus Jakarta Sans",sans-serif', width:'100%', boxSizing:'border-box', transition:'border-color .15s' }}
        onFocus={e => e.target.style.borderColor=B.primary}
        onBlur={e  => e.target.style.borderColor='#E5E7EB'}
      />
    </div>
  )
}
