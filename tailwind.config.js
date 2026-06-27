/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        xs: '0 2px 4px rgba(0, 0, 0, 0.08)',
        sm: '0 4px 6px rgba(0, 0, 0, 0.1)',
        md: '0 10px 15px rgba(0, 0, 0, 0.1)',
        lg: '0 15px 30px rgba(0, 0, 0, 0.12)',
        xl: '0 20px 50px rgba(11, 95, 255, 0.15)',
        card: '0 10px 30px -12px rgba(11, 95, 255, 0.2)',
      },
      animation: {
        fadeIn: 'fadeIn 300ms ease-out',
        slideUp: 'slideUp 400ms ease-out',
        scaleIn: 'scaleIn 250ms ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
