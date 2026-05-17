/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        ww: {
          bg: 'var(--ww-bg)',
          subtle: 'var(--ww-bg-subtle)',
          text: 'var(--ww-text)',
          muted: 'var(--ww-text-muted)',
          border: 'var(--ww-border)',
          accent: 'var(--ww-accent)'
        }
      },
      fontFamily: {
        sans: ['"Source Han Sans SC"', '"PingFang SC"', 'Inter', 'system-ui', 'sans-serif']
      },
      transitionDuration: {
        ww: '300ms'
      }
    }
  },
  plugins: []
}
