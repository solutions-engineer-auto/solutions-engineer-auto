import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        volcanic: {
          navy: '#0A0F1E',
          black: '#05070C',
          ash: {
            light: '#3A3E4A',
            DEFAULT: '#2C2F38',
            dark: '#1A1C22'
          },
          foam: {
            light: '#E8F4F8',
            DEFAULT: '#B8D4E3',
            dark: '#7FA9C3'
          },
          lava: {
            orange: '#FF4500',
            red: '#CF1020',
            glow: '#FF6B35'
          }
        }
      },
      backgroundImage: {
        'volcanic-gradient': 'linear-gradient(to bottom, #0A0F1E, #05070C)',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '12px',
        'frosted': '18px',
      },
      boxShadow: {
        'glow-sm': '0 2px 10px rgba(184, 212, 227, 0.1)',
        'glow': '0 4px 20px rgba(184, 212, 227, 0.15)',
        'glow-lg': '0 8px 30px rgba(184, 212, 227, 0.2)',
        'lava-glow': '0 0 20px rgba(255, 69, 0, 0.4)',
        'lava-glow-lg': '0 0 30px rgba(255, 69, 0, 0.6)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        }
      }
    },
  },
  plugins: [
    typography
  ],
} 