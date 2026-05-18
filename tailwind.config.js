/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui'

export default {
  darkMode: ['selector', '[class="p-dark"]'],
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  plugins: [PrimeUI],
  theme: {
    extend: {
      colors: {
        ww: {
          canvas: 'var(--ww-canvas)',
          rail: 'var(--ww-rail)',
          panel: 'var(--ww-panel)',
          content: 'var(--ww-content)',
          inset: 'var(--ww-inset)',
          elevated: 'var(--ww-elevated)',
          ink: 'var(--ww-ink)',
          'ink-muted': 'var(--ww-ink-muted)',
          accent: 'var(--ww-accent)',
          'accent-soft': 'var(--ww-accent-soft)'
        }
      },
      fontFamily: {
        sans: ['Inter', '"PingFang SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif']
      },
      transitionTimingFunction: {
        'ww-out': 'var(--ww-ease-out)',
        'ww-out-slow': 'var(--ww-ease-out-slow)'
      }
    }
  }
}
