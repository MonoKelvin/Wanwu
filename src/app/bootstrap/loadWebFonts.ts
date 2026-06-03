import type { BootMode } from '@app/bootstrap/bootMode'

const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;500&display=swap'

/** 托盘/日签小窗不加载 Web 字体，减少网络与首屏阻塞；主窗口与便笺窗保持原有字体栈 */
export function loadWebFonts(mode: BootMode): void {
  if (mode === 'tray-menu' || mode === 'daily-widget') return
  if (document.querySelector('link[data-ww-webfonts]')) return

  const preconnectGoogle = document.createElement('link')
  preconnectGoogle.rel = 'preconnect'
  preconnectGoogle.href = 'https://fonts.googleapis.com'
  document.head.appendChild(preconnectGoogle)

  const preconnectStatic = document.createElement('link')
  preconnectStatic.rel = 'preconnect'
  preconnectStatic.href = 'https://fonts.gstatic.com'
  preconnectStatic.crossOrigin = ''
  document.head.appendChild(preconnectStatic)

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = FONT_STYLESHEET
  link.dataset.wwWebfonts = '1'
  document.head.appendChild(link)
}
