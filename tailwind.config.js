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
          bg:       '#111111', // Fundo bem escuro
          surface:  '#222222', // Blocos neutros
          surface2: '#333333',
          border:   '#ffffff', // Bordas brancas marcantes
          text:     '#ffffff',
          muted:    '#888888',
          // Cores Tetris
          cyan:     '#00FFFF', // I
          blue:     '#0000FF', // J
          orange:   '#FFA500', // L
          yellow:   '#FFFF00', // O
          green:    '#00FF00', // S
          purple:   '#800080', // T
          red:      '#FF0000', // Z
          // Cores de Tiers (Adaptadas para blocos)
          gold:     '#FFFF00',
          silver:   '#AAAAAA',
          bronze:   '#CD7F32',
          success:  '#00FF00',
          danger:   '#FF0000',
          // Aliases para compatibilidade
          neon:     '#FFFF00',
          warning:  '#FFA500',
        },
      },
      fontFamily: {
        tetris: ['"Press Start 2P"', 'cursive'],
        outfit: ['Outfit', 'sans-serif'],
        inter:  ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Sombra de bloco duro (estilo botão antigo)
        'block': 'inset -4px -4px 0px 0px rgba(0,0,0,0.3)',
        'block-hover': 'inset -2px -2px 0px 0px rgba(0,0,0,0.3)',
        'block-active': 'inset 4px 4px 0px 0px rgba(0,0,0,0.3)',
        // Sombra externa dura
        'hard': '4px 4px 0px 0px #000000',
        'hard-sm': '2px 2px 0px 0px #000000',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'blink':        'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        }
      },
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '0',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(to right, #222 1px, transparent 1px), linear-gradient(to bottom, #222 1px, transparent 1px)',
        'gradient-higame': 'linear-gradient(135deg, #00FFFF 0%, #00FFFF 100%)',
        'gradient-gold': 'linear-gradient(135deg, #FFFF00 0%, #FFFF00 100%)',
        'gradient-silver': 'linear-gradient(135deg, #AAAAAA 0%, #AAAAAA 100%)',
        'gradient-bronze': 'linear-gradient(135deg, #CD7F32 0%, #CD7F32 100%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      }
    },
  },
  plugins: [],
}
