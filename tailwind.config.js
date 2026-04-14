/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#eaedf5',
          100: '#d0d4e3',
          200: '#a8aec4',
          300: '#8088a4',
          400: '#646d8c',
          500: '#4a5272',
          600: '#353c5a',
          700: '#252b42',
          800: '#1a1f32',
          900: '#141824',
          950: '#0B0F19',
        },
        accent: {
          50: '#f0ecff',
          100: '#ddd5ff',
          200: '#c0b0ff',
          300: '#a088ff',
          400: '#8b6ffc',
          500: '#7C5CFC', /* Primary Shakuro Accents */
          600: '#6a47e6',
          700: '#5835c7',
          800: '#482ca3',
          900: '#3a2485',
          950: '#1f1252',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 92, 252, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 92, 252, 0.25)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
