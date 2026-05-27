/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        higame: {
          bg:       '#0A0A14',
          surface:  '#12121F',
          surface2: '#1A1A2E',
          surface3: '#222240',
          border:   '#2A2A45',
          border2:  '#3D3D6B',
          purple:   '#7C3AED',
          purple2:  '#A855F7',
          purple3:  '#C084FC',
          neon:     '#06B6D4',
          neon2:    '#22D3EE',
          neon3:    '#67E8F9',
          gold:     '#F59E0B',
          gold2:    '#FCD34D',
          silver:   '#94A3B8',
          silver2:  '#CBD5E1',
          bronze:   '#CD7F32',
          bronze2:  '#D97706',
          danger:   '#EF4444',
          danger2:  '#FCA5A5',
          success:  '#10B981',
          success2: '#34D399',
          warning:  '#F59E0B',
          text:     '#E2E8F0',
          text2:    '#94A3B8',
          muted:    '#64748B',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter:  ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-higame':    'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
        'gradient-gold':      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gradient-silver':    'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
        'gradient-bronze':    'linear-gradient(135deg, #CD7F32 0%, #92400E 100%)',
        'gradient-surface':   'linear-gradient(135deg, #12121F 0%, #1A1A2E 100%)',
        'gradient-dark':      'linear-gradient(135deg, #0A0A14 0%, #12121F 100%)',
        'gradient-danger':    'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
        'gradient-success':   'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      },
      boxShadow: {
        'glow-purple':  '0 0 20px rgba(124, 58, 237, 0.4)',
        'glow-neon':    '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-gold':    '0 0 20px rgba(245, 158, 11, 0.5)',
        'glow-silver':  '0 0 20px rgba(148, 163, 184, 0.4)',
        'glow-bronze':  '0 0 20px rgba(205, 127, 50, 0.4)',
        'glow-danger':  '0 0 20px rgba(239, 68, 68, 0.4)',
        'card':         '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover':   '0 8px 40px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease-out',
        'slide-up':     'slideUp 0.4s ease-out',
        'slide-in':     'slideIn 0.3s ease-out',
        'pulse-glow':   'pulseGlow 2s ease-in-out infinite',
        'float':        'float 3s ease-in-out infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'count-up':     'countUp 1s ease-out',
        'bar-fill':     'barFill 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(124, 58, 237, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        barFill: {
          '0%':   { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
