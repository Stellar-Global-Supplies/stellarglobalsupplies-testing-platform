/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg:      '#0A0C10',
        surface: '#111318',
        raised:  '#1C1F27',
        border:  '#252932',
        accent:  '#38BDF8',
        pass:    '#10B981',
        fail:    '#EF4444',
        warn:    '#F59E0B',
        muted:   '#64748B',
        subtle:  '#94A3B8',
        primary: '#E2E8F0',
      },
      keyframes: {
        pulse2: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        slideIn: { from: { transform: 'translateX(100%)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        fadeUp:  { from: { transform: 'translateY(8px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
      },
      animation: {
        pulse2:  'pulse2 2s ease-in-out infinite',
        slideIn: 'slideIn 0.25s ease-out',
        fadeUp:  'fadeUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
