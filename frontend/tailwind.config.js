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
        // Rise Ascend Brand — Navy Blue + Orange
        navy: {
          50:  '#e8edf7',
          100: '#c5d0ea',
          200: '#9fb1db',
          300: '#7892cc',
          400: '#5879c2',
          500: '#3860b8',
          600: '#2a50a0',
          700: '#1c3d87',
          800: '#0f2a6e',
          900: '#0A1628',   // Primary dark navy
          950: '#060e1a',
        },
        orange: {
          50:  '#fff4ee',
          100: '#ffe5d0',
          200: '#ffc9a0',
          300: '#ffa66a',
          400: '#FF8C5A',
          500: '#FF6B2B',   // Primary brand orange
          600: '#e85510',
          700: '#c04109',
          800: '#9a3408',
          900: '#7a2b09',
        },
        // Dashboard accent colors (kept for app pages)
        jade: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-out',
        'fade-up':    'fadeUp 0.6s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
        'wave':       'wave 1.2s ease-in-out infinite',
        'float':      'float 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'grad-pan':   'gradPan 6s ease infinite',
        'spin-slow':  'spin 8s linear infinite',
        'glow':       'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        wave:    { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
        float:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        gradPan: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        glow:    { '0%,100%': { boxShadow: '0 0 20px rgba(255,107,43,0.4)' }, '50%': { boxShadow: '0 0 40px rgba(255,107,43,0.8)' } },
      },
      backgroundSize: {
        '200': '200% 200%',
      },
    },
  },
  plugins: [],
}
