/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', '"DM Sans"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // ── Brand — Saffron Coral ──────────────────────────────
        brand: {
          50:  '#FFF4F0',
          100: '#FFE4D6',
          200: '#FFD4C2',
          300: '#FFB99A',
          400: '#FF8C42',
          500: '#FF6B35',   // primary
          600: '#E63946',   // secondary (coral-red)
          700: '#C22A35',
          800: '#9E1B28',
          900: '#7A1020',
        },

        // ── Neutral / Slate ────────────────────────────────────
        ink: {
          950: '#0f0f0f',
          900: '#1a1a1a',
          800: '#2d2d2d',
          700: '#374151',
          600: '#4B5563',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50:  '#F9FAFB',
        },

        // ── Surfaces ───────────────────────────────────────────
        surface: {
          page:    '#F7F8FA',
          card:    '#FFFFFF',
          muted:   '#F3F4F6',
          subtle:  '#FAFAFA',
        },

        // ── Status ────────────────────────────────────────────
        success: { DEFAULT: '#10B981', light: '#ECFDF5', dark: '#065F46' },
        danger:  { DEFAULT: '#EF4444', light: '#FEF2F2', dark: '#991B1B' },
        warning: { DEFAULT: '#F59E0B', light: '#FFFBEB', dark: '#92400E' },
        info:    { DEFAULT: '#3B82F6', light: '#EFF6FF', dark: '#1E40AF' },
      },

      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '24px',
        '2xl':'32px',
      },

      boxShadow: {
        xs:    '0 1px 2px rgba(0,0,0,0.05)',
        sm:    '0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        md:    '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        lg:    '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
        brand: '0 4px 20px rgba(255,107,53,0.35)',
        'brand-lg': '0 8px 32px rgba(255,107,53,0.45)',
      },

      animation: {
        'fade-up':    'fadeUp 0.5s ease-out both',
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.35s ease-out',
        'wave':       'wave 1.1s ease-in-out infinite',
        'float':      'float 4s ease-in-out infinite',
        'spin-slow':  'spinSlow 12s linear infinite',
        'pulse-brand':'pulseBrand 2s ease-in-out infinite',
      },

      keyframes: {
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        wave:    { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
        float:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        spinSlow:{ 'from': { transform: 'rotate(0deg)' }, 'to': { transform: 'rotate(360deg)' } },
        pulseBrand: {
          '0%,100%': { boxShadow: '0 4px 20px rgba(255,107,53,0.35)' },
          '50%':      { boxShadow: '0 6px 30px rgba(255,107,53,0.55)' },
        },
      },
    },
  },
  plugins: [],
}
