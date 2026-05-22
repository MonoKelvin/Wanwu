import { setDocumentFavicon } from '@app/setDocumentFavicon'
import type { ColorScheme } from '@shared/types/settings'

const STORAGE_KEY = 'wanwu.colorScheme'

export function applyColorScheme(scheme: ColorScheme): void {
  const root = document.documentElement
  root.dataset.theme = scheme
  root.classList.toggle('p-dark', scheme === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, scheme)
  } catch {
    /* ignore */
  }
  setDocumentFavicon(scheme)
}

/** 启动时同步应用，避免首屏闪白 */
export function readStoredColorScheme(): ColorScheme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}
