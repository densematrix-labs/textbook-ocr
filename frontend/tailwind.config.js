/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Scholarly warm palette
        parchment: {
          50: '#fdfcfa',
          100: '#f9f6f0',
          200: '#f3ede1',
          300: '#e8dcc6',
          400: '#d4c4a1',
          500: '#c1ab7d',
        },
        ink: {
          50: '#f7f6f5',
          100: '#e8e5e0',
          200: '#d1ccc3',
          300: '#b5aca0',
          400: '#938678',
          500: '#756555',
          600: '#5e5145',
          700: '#4a4037',
          800: '#3d352f',
          900: '#2d2722',
          950: '#1a1714',
        },
        accent: {
          50: '#fef3f2',
          100: '#fee5e2',
          200: '#fdd0ca',
          300: '#fbb0a5',
          400: '#f68271',
          500: '#ec5a45',
          600: '#d93d28',
          700: '#b6301e',
          800: '#962b1c',
          900: '#7c291e',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        cjk: ['Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
