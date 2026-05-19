import { clipboard, dialog, shell } from 'electron'
import { copyFileSync, existsSync, writeFileSync } from 'fs'
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

export function copyTextToClipboard(text: string): void {
  clipboard.writeText(text)
}

export async function pickImageFile(): Promise<{
  ok: boolean
  path?: string
  canceled?: boolean
}> {
  const win = getMainWindow()
  const options = {
    properties: ['openFile'] as ('openFile')[],
    filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)

  if (result.canceled || !result.filePaths?.length) {
    return { ok: false, canceled: true }
  }
  return { ok: true, path: result.filePaths[0] }
}

export async function savePngDataUrl(
  dataUrl: string,
  defaultName?: string
): Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }> {
  return saveImageDataUrl(dataUrl, defaultName)
}

export async function saveImageDataUrl(
  dataUrl: string,
  defaultName?: string
): Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }> {
  const png = dataUrl.match(/^data:image\/png;base64,(.+)$/i)
  const jpeg = dataUrl.match(/^data:image\/jpe?g;base64,(.+)$/i)
  const match = png ?? jpeg
  if (!match) return { ok: false, error: 'invalid_data_url' }

  const isJpeg = Boolean(jpeg)
  const win = getMainWindow()
  const saveOptions = {
    defaultPath: defaultName?.trim() || (isJpeg ? 'wanwu-share.jpg' : 'wanwu-share.png'),
    filters: isJpeg
      ? [{ name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] }]
      : [{ name: 'PNG 图片', extensions: ['png'] }]
  }
  const result = win
    ? await dialog.showSaveDialog(win, saveOptions)
    : await dialog.showSaveDialog(saveOptions)

  if (result.canceled || !result.filePath) return { ok: false, canceled: true }

  writeFileSync(result.filePath, Buffer.from(match[1], 'base64'))
  return { ok: true, path: result.filePath }
}

export async function saveTextFile(
  content: string,
  defaultName?: string,
  extension = 'html'
): Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }> {
  const win = getMainWindow()
  const saveOptions = {
    defaultPath: defaultName?.trim() || `wanwu-share.${extension}`,
    filters: [{ name: 'HTML 文件', extensions: [extension] }]
  }
  const result = win
    ? await dialog.showSaveDialog(win, saveOptions)
    : await dialog.showSaveDialog(saveOptions)

  if (result.canceled || !result.filePath) return { ok: false, canceled: true }

  writeFileSync(result.filePath, content, 'utf8')
  return { ok: true, path: result.filePath }
}
