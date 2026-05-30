import { setDocumentFavicon } from '@app/setDocumentFavicon'
import type { ColorScheme, ResolvedColorScheme } from '@shared/types/settings'

const STORAGE_KEY = 'wanwu.colorScheme'

export function resolveColorScheme(preference: ColorScheme): ResolvedColorScheme {
  if (preference === 'light' || preference === 'dark') return preference
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function applyColorScheme(preference: ColorScheme): void {
  const resolved = resolveColorScheme(preference)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.colorScheme = preference
  root.classList.toggle('p-dark', resolved === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    /* ignore */
  }
  setDocumentFavicon(resolved)
}

/** 跟随系统时监听 OS 主题变化 */
export function watchSystemColorScheme(onSystemChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => onSystemChange()
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

/** 启动时同步应用，避免首屏闪白 */
export function readStoredColorScheme(): ColorScheme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dark' || v === 'light' || v === 'system' ? v : null
  } catch {
    return null
  }
}
