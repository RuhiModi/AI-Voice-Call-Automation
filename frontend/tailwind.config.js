/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // ── Primary — warm charcoal (not blue) ──
        ink: {
          950: '#1a1a1a',
          900: '#2c2c2c',
          800: '#3d3d3d',
          700: '#525252',
          600: '#6b6b6b',
          500: '#8a8a8a',
          400: '#a8a8a8',
          300: '#c4c4c4',
          200: '#dcdcdc',
          100: '#f0f0f0',
          50:  '#f8f8f8',
        },

        // ── Accent — warm amber/saffron ──
        saffron: {
          50:  '#fffbf0',
          100: '#fef3d0',
          200: '#fde59a',
          300: '#fbd060',
          400: '#f9bc30',
          500: '#f5a623',
          600: '#e08c10',
          700: '#b86f0e',
          800: '#8f540f',
          900: '#6b3f0e',
        },

        // ── Success — sage green ──
        sage: {
          50:  '#f0faf4',
          100: '#dcf3e5',
          200: '#b8e6cb',
          300: '#84d0a4',
          400: '#52b87c',
          500: '#2fa05c',
          600: '#228248',
          700: '#1c673a',
          800: '#19522f',
          900: '#163f25',
        },

        // ── Surface — warm whites and creams ──
        cream: {
          50:  '#fdfcfa',
          100: '#faf8f4',
          200: '#f5f1ea',
          300: '#ede7dc',
          400: '#e0d9ce',
          500: '#cfc6b9',
        },

        // ── Danger ──
        rose: {
          50:  '#fff1f2',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },

        // ── Blue (for info states only — not dominant) ──
        sky: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },

      animation: {
        'fade-in':  'fadeIn 0.4s ease-out',
        'fade-up':  'fadeUp 0.5s ease-out both',
        'slide-up': 'slideUp 0.35s ease-out',
        'wave':     'wave 1.2s ease-in-out infinite',
        'float':    'float 5s ease-in-out infinite',
        'shimmer':  'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        wave:    { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
        float:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
