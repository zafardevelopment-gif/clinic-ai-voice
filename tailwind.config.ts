import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        syne:    ['Syne', 'sans-serif'],
        figtree: ['Figtree', 'sans-serif'],
        sans:    ['Figtree', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border:     'var(--b1)',
        'app-bg':   'var(--bg)',
        's1':       'var(--s1)',
        's2':       'var(--s2)',
        's3':       'var(--s3)',
        's4':       'var(--s4)',
        'acc':      'var(--acc)',
        'teal':     'var(--teal)',
        'amber':    'var(--amber)',
        'rose':     'var(--rose)',
        'violet':   'var(--violet)',
      },
      animation: {
        fadeUp:    'fadeUp .5s ease',
        modalIn:   'modalIn .25s ease',
        livePulse: 'livePulse 1.8s infinite',
        aiPulse:   'aiPulse 1.5s infinite',
      },
      keyframes: {
        fadeUp:    { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        modalIn:   { from: { opacity: '0', transform: 'scale(.95) translateY(10px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
        livePulse: { '0%': { boxShadow: '0 0 0 0 rgba(0,212,170,0.5)' }, '70%': { boxShadow: '0 0 0 7px rgba(0,212,170,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(0,212,170,0)' } },
        aiPulse:   { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(1.3)' } },
      },
    },
  },
  plugins: [],
}
export default config
