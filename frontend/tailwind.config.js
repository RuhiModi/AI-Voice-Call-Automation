/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        // ── RISE ASCEND TECH — EXACT BRAND COLORS ──
        // Primary dark navy (used on riseascendtech.com hero/nav)
        'brand-blue':    '#0D1B2A',
        'brand-blue-dk': '#07111B',   // darker shade / footer
        'brand-blue-md': '#162840',   // mid shade
        'brand-blue-lt': '#EEF3FA',   // very light blue tint for cards

        // Primary orange (buttons, accents, CTAs on riseascendtech.com)
        'brand-orange':    '#E8451C',
        'brand-orange-dk': '#C93A17',  // hover / pressed
        'brand-orange-lt': '#FEF0EC',  // very light orange tint for cards

        // Text colours (matching their clean enterprise look)
        'ink-900': '#0D1B2A',  // primary text
        'ink-700': '#2D3E50',
        'ink-500': '#4E6070',
        'ink-400': '#627384',
        'ink-300': '#8A9BAA',
        'ink-200': '#B5C2CB',
        'ink-100': '#DCE4EA',

        // Surface / background
        'surface-50':  '#F5F7FA',
        'surface-100': '#EDF0F5',
        'surface-200': '#DDE3EC',

        // Status colours for dashboard
        jade: {
          50:  '#ecfdf5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        violet: {
          50:  '#f5f3ff',
          400: '#a78bfa',
          500: '#8b5cf6',
        },
        amber: {
          50:  '#fffbeb',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-out',
        'fade-up':    'fadeUp 0.6s ease-out both',
        'slide-up':   'slideUp 0.4s ease-out',
        'wave':       'wave 1.2s ease-in-out infinite',
        'float':      'float 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'grad-pan':   'gradPan 6s ease infinite',
        'glow':       'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        wave:    { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
        float:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        gradPan: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        glow:    { '0%,100%': { boxShadow: '0 0 20px rgba(232,69,28,0.4)' }, '50%': { boxShadow: '0 0 40px rgba(232,69,28,0.7)' } },
      },
      backgroundSize: { '200': '200% 200%' },
      fontWeight: {
        500: '500',
        600: '600',
        700: '700',
        800: '800',
        900: '900',
      },
    },
  },
  plugins: [],
}
