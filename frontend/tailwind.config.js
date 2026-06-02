/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Surface tiers — deeper-than-pure-black backdrop, with raised levels
        background: '#070708',
        surface: {
          1: '#0e0e11',
          2: '#16161b',
          3: '#1f1f26',
        },
        foreground: '#ededed',
        muted: '#8c8c95',
        // Brand red with a usable hover + glow
        primary: {
          DEFAULT: '#ff3e57',
          hover: '#ff5870',
          glow: 'rgba(255, 62, 87, 0.45)',
        },
        secondary: '#16161b',
        accent: '#7c3aed',
        ok: '#10b981',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #ff3e57 0%, #ff7a3e 50%, #b91c1c 100%)',
        'hero-radial':
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,62,87,0.35), transparent 70%)',
      },
      boxShadow: {
        'glow-primary': '0 0 40px -10px rgba(255, 62, 87, 0.6)',
        'inset-border': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'flow-right': 'flow-right 3s infinite linear',
        'fade-up': 'fade-up 0.5s ease-out both',
        'shimmer': 'shimmer 2.4s linear infinite',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'flow-right': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
