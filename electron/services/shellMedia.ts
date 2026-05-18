import { dialog, shell } from 'electron'
import { copyFileSync, existsSync } from 'fs'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import { getMainWindow } from '../windowState'
import { resolveLibraryMediaAbsolute } from './libraryMedia'

export function resolveMediaUrlToAbsolute(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  if (/^wanwu-media:\/\//i.test(trimmed)) {
    const raw = decodeURIComponent(trimmed.replace(/^wanwu-media:\/\//i, ''))
    return resolveLibraryMediaAbsolute(raw)
  }

  if (trimmed.startsWith('file://')) {
    try {
      return fileURLToPath(trimmed)
    } catch {
      return null
    }
  }

  return null
}

export async function downloadMediaFile(
  url: string,
  defaultName?: string
): Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }> {
  const abs = resolveMediaUrlToAbsolute(url)
  if (!abs || !existsSync(abs)) {
    return { ok: false, error: 'not_found' }
  }

  const win = getMainWindow()
  const saveOptions = { defaultPath: defaultName?.trim() || basename(abs) }
  const result = win
    ? await dialog.showSaveDialog(win, saveOptions)
    : await dialog.showSaveDialog(saveOptions)

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true }
  }

  copyFileSync(abs, result.filePath)
  return { ok: true, path: result.filePath }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!url.trim()) return
  await shell.openExternal(url)
}

export async function showMediaInFolder(url: string): Promise<{ ok: boolean }> {
  const abs = resolveMediaUrlToAbsolute(url)
  if (!abs || !existsSync(abs)) return { ok: false }
  shell.showItemInFolder(abs)
  return { ok: true }
}
