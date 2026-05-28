import { clipboard, dialog, nativeImage, shell } from 'electron'
import { randomUUID } from 'crypto'
import { copyFileSync, existsSync, realpathSync, unlinkSync, writeFileSync } from 'fs'
import { basename, dirname, extname, isAbsolute, join, normalize, resolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath, pathToFileURL } from 'url'
import { getMainWindow } from '../../windowState'
import { resolveWanwuMediaAbsolute } from '../media/wanwu'

export function resolveMediaUrlToAbsolute(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  if (/^wanwu-media:\/\//i.test(trimmed)) {
    const raw = decodeURIComponent(trimmed.replace(/^wanwu-media:\/\//i, '')).split(/[?#]/)[0]
    return resolveWanwuMediaAbsolute(raw)
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

function stripSurroundingQuotes(input: string): string {
  const trimmed = input.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

/** 媒体 URL 或本机绝对路径（备份 zip、诊断日志等） */
export function resolvePathOrMediaUrl(input: string): string | null {
  const trimmed = stripSurroundingQuotes(input)
  if (!trimmed) return null

  const fromMedia = resolveMediaUrlToAbsolute(trimmed)
  if (fromMedia && existsSync(fromMedia)) {
    try {
      return realpathSync.native(fromMedia)
    } catch {
      return normalize(fromMedia)
    }
  }

  const candidates = new Set<string>()
  candidates.add(trimmed)
  candidates.add(normalize(trimmed))
  if (process.platform === 'win32') {
    const winSlashes = trimmed.replace(/\//g, '\\')
    candidates.add(winSlashes)
    candidates.add(normalize(winSlashes))
  }
  if (!isAbsolute(trimmed)) {
    candidates.add(resolve(trimmed))
    candidates.add(normalize(resolve(trimmed)))
  }

  for (const candidate of candidates) {
    if (!candidate || !existsSync(candidate)) continue
    try {
      return realpathSync.native(candidate)
    } catch {
      return normalize(candidate)
    }
  }

  return null
}

/** 保存对话框返回的路径，解析为当前存在的绝对路径 */
export function resolveExistingFilePath(filePath: string): string {
  return resolvePathOrMediaUrl(filePath) ?? normalize(filePath)
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

export async function showMediaInFolder(
  urlOrPath: string
): Promise<{ ok: boolean; error?: string }> {
  const abs = resolvePathOrMediaUrl(urlOrPath)
  if (!abs) {
    console.warn('[wanwu] showItemInFolder: path not found', urlOrPath)
    return { ok: false, error: 'not_found' }
  }

  try {
    shell.showItemInFolder(abs)
    return { ok: true }
  } catch (err) {
    console.warn('[wanwu] showItemInFolder failed, fallback openPath', abs, err)
    const openErr = await shell.openPath(dirname(abs))
    if (openErr) {
      return { ok: false, error: openErr }
    }
    return { ok: true }
  }
}

export function copyTextToClipboard(text: string): void {
  clipboard.writeText(text)
}

export function copyImageToClipboard(
  urlOrPath: string
): { ok: boolean; error?: string } {
  const abs = resolveMediaUrlToAbsolute(urlOrPath) ?? resolvePathOrMediaUrl(urlOrPath)
  if (!abs || !existsSync(abs)) {
    return { ok: false, error: 'not_found' }
  }
  const image = nativeImage.createFromPath(abs)
  if (image.isEmpty()) {
    return { ok: false, error: 'empty' }
  }
  clipboard.writeImage(image)
  return { ok: true }
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

export function saveClipboardImageDataUrlToTemp(
  dataUrl: string
): { ok: boolean; path?: string; error?: string } {
  const png = dataUrl.match(/^data:image\/png;base64,(.+)$/i)
  const jpeg = dataUrl.match(/^data:image\/jpe?g;base64,(.+)$/i)
  const webp = dataUrl.match(/^data:image\/webp;base64,(.+)$/i)
  const gif = dataUrl.match(/^data:image\/gif;base64,(.+)$/i)
  const match = png ?? jpeg ?? webp ?? gif
  if (!match) return { ok: false, error: 'invalid_data_url' }
  const ext = png ? 'png' : jpeg ? 'jpg' : webp ? 'webp' : 'gif'
  const tempPath = join(tmpdir(), `wanwu-note-paste-${randomUUID()}.${ext}`)
  writeFileSync(tempPath, Buffer.from(match[1], 'base64'))
  return { ok: true, path: tempPath }
}

/** 大图查看器：远程图临时缓存路径，关闭查看器后释放 */
const viewerTempById = new Map<number, string[]>()
let viewerTempSeq = 0

function extFromUrlOrMime(url: string, contentType: string | null): string {
  const fromMime =
    contentType?.includes('png') ? 'png'
    : contentType?.includes('webp') ? 'webp'
    : contentType?.includes('gif') ? 'gif'
    : contentType?.includes('jpeg') || contentType?.includes('jpg') ? 'jpg'
    : null
  if (fromMime) return fromMime
  const m = url.match(/\.(jpe?g|png|webp|gif)(\?|#|$)/i)
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg')
  return 'jpg'
}

/** 解析为可在 ImageViewer 中加载的 URL（本地库直链 file://，远程图写入临时文件） */
export async function cacheImageForViewer(
  url: string
): Promise<{ ok: boolean; displayUrl?: string; cacheId?: number; error?: string }> {
  const trimmed = url.trim()
  if (!trimmed) return { ok: false, error: 'empty' }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return { ok: true, displayUrl: trimmed }
  }

  const localAbs = resolveMediaUrlToAbsolute(trimmed)
  if (localAbs && existsSync(localAbs)) {
    return { ok: true, displayUrl: pathToFileURL(localAbs).href }
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'unsupported' }
  }

  try {
    const res = await fetch(trimmed, {
      headers: { 'User-Agent': 'Wanwu/1.0', Accept: 'image/*,*/*;q=0.8' }
    })
    if (!res.ok) return { ok: false, error: 'fetch_failed' }

    const buf = Buffer.from(await res.arrayBuffer())
    const ext = extFromUrlOrMime(trimmed, res.headers.get('content-type'))
    const tempPath = join(tmpdir(), `wanwu-viewer-${randomUUID()}.${ext}`)
    writeFileSync(tempPath, buf)

    const cacheId = ++viewerTempSeq
    viewerTempById.set(cacheId, [tempPath])
    return { ok: true, displayUrl: pathToFileURL(tempPath).href, cacheId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch_failed'
    return { ok: false, error: message }
  }
}

export function releaseViewerImageCache(cacheId: number): void {
  const paths = viewerTempById.get(cacheId)
  if (!paths) return
  for (const p of paths) {
    try {
      unlinkSync(p)
    } catch {
      /* ignore */
    }
  }
  viewerTempById.delete(cacheId)
}
