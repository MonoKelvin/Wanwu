import { appLogoFor } from '@shared/assets/app-logo'
import type { ColorScheme } from '@shared/types/settings'

function currentScheme(): ColorScheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** 页面 favicon 与 assets/logo 同源，无需 public/ 目录 */
export function setDocumentFavicon(scheme?: ColorScheme): void {
  const head = document.head
  for (const el of head.querySelectorAll('link[data-ww-favicon]')) {
    el.remove()
  }

  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.sizes = '32x32'
  link.href = appLogoFor(scheme ?? currentScheme(), 32)
  link.setAttribute('data-ww-favicon', '')
  head.append(link)
}
