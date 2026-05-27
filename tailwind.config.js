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
          bg:       '#020617', // slate-950 (Fundo profundo)
          surface:  'rgba(15, 23, 42, 0.6)', // slate-900 translúcido
          surface2: 'rgba(30, 41, 59, 0.7)', // slate-800 translúcido
          surface3: 'rgba(51, 65, 85, 0.72)', // slate-700 translúcido
          border:   'rgba(255, 255, 255, 0.08)', // Bordas hyper sutis
          border2:  'rgba(255, 255, 255, 0.15)',
          
          text:     '#F8FAFC', // slate-50
          text2:    '#CBD5E1', // slate-300
          muted:    '#94A3B8', // slate-400
          
          // Cores Premium/Gamer (Discord/Linear/Arc)
          purple:   '#7C3AED', // Violeta intenso
          blurple:  '#5865F2', // Blurple estilo Discord
          neon:     '#06B6D4', // Ciano brilhante
          green:    '#10B981', // Verde Esmeralda (Sucesso/XP)
          red:      '#EF4444', // Vermelho (Erro)
          orange:   '#F59E0B', // Laranja (Warning/Streaks)
          
          // Cores de Tiers/Raridades
          common:   '#94A3B8', // slate-400
          rare:     '#3B82F6', // blue-500
          epic:     '#A855F7', // purple-500
          legendary:'#F59E0B', // amber-500
          mythic:   '#EF4444', // red-500
          
          // Manter aliases de Tiers antigos para compatibilidade
          gold:     '#F59E0B',
          silver:   '#94A3B8',
          bronze:   '#CD7F32',
          success:  '#10B981',
          danger:   '#EF4444',
          warning:  '#F59E0B',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter:  ['Inter', 'sans-serif'],
        tetris: ['"Press Start 2P"', 'cursive'], // Apenas para números muito específicos
      },
      backgroundImage: {
        'gradient-higame': 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
        'gradient-blurple': 'linear-gradient(135deg, #5865F2 0%, #7C3AED 100%)',
        'gradient-gold': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gradient-silver': 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
        'gradient-bronze': 'linear-gradient(135deg, #CD7F32 0%, #92400E 100%)',
        'radial-glow': 'radial-gradient(circle at top right, rgba(124, 58, 237, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent 40%)',
      },
      boxShadow: {
        'glow-purple':  '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-neon':    '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-green':   '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-gold':    '0 0 20px rgba(245, 158, 11, 0.32)',
        'glow-silver':  '0 0 20px rgba(148, 163, 184, 0.28)',
        'glow-bronze':  '0 0 20px rgba(205, 127, 50, 0.3)',
        'glow-danger':  '0 0 20px rgba(239, 68, 68, 0.28)',
        'glass':        '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover':  '0 12px 40px 0 rgba(0, 0, 0, 0.5)',
        'card':         '0 18px 48px rgba(0, 0, 0, 0.35)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'level-up': 'levelUp 1s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(124, 58, 237, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(124, 58, 237, 0.5)' },
        },
        levelUp: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
    },
  },
  plugins: [],
}
