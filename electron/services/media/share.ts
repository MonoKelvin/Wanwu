import { createRequire } from 'module'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { tmpdir } from 'os'
import { getMainWindow } from '../../windowState'

const require = createRequire(import.meta.url)

type NativeShareModule = {
  canShare: () => boolean
  share: (
    options: { title?: string; text?: string; files?: string[] },
    browserWindow?: unknown
  ) => Promise<{ method: 'native' | 'cancelled' }>
}

function loadNativeShare(): NativeShareModule | null {
  try {
    return require('electron-native-share') as NativeShareModule
  } catch {
    return null
  }
}

const nativeShare = loadNativeShare()

const LITTERBOX_API = 'https://litterbox.catbox.moe/resources/internals/api.php'

export type TempUploadExpire = '1h' | '12h' | '24h' | '72h'

const EXPIRE_HOURS: Record<TempUploadExpire, number> = {
  '1h': 1,
  '12h': 12,
  '24h': 24,
  '72h': 72
}

export function canNativeShare(): boolean {
  try {
    return nativeShare?.canShare() ?? false
  } catch {
    return false
  }
}

export async function openNativeShare(params: {
  title?: string
  text?: string
  filePath: string
}): Promise<{ ok: boolean; canceled?: boolean; error?: string }> {
  if (!nativeShare || !canNativeShare()) {
    return { ok: false, error: 'unsupported' }
  }

  try {
    const win = getMainWindow()
    const result = await nativeShare.share(
      {
        title: params.title,
        text: params.text,
        files: [params.filePath]
      },
      win ?? undefined
    )
    return { ok: result.method === 'native', canceled: result.method === 'cancelled' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'share_failed'
    return { ok: false, error: message }
  }
}

function writeDataUrlToFile(dataUrl: string, filePath: string): boolean {
  const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i)
  if (!match) return false
  writeFileSync(filePath, Buffer.from(match[2], 'base64'))
  return true
}

export function writeShareTempFile(params: {
  dataUrl?: string
  textContent?: string
  fileName: string
}): { ok: true; path: string; cleanup: () => void } | { ok: false; error: string } {
  const dir = mkdtempSync(join(tmpdir(), 'wanwu-share-'))
  const filePath = join(dir, params.fileName)

  try {
    if (params.dataUrl) {
      if (!writeDataUrlToFile(params.dataUrl, filePath)) {
        rmSync(dir, { recursive: true, force: true })
        return { ok: false, error: 'invalid_data_url' }
      }
    } else if (params.textContent != null) {
      writeFileSync(filePath, params.textContent, 'utf8')
    } else {
      rmSync(dir, { recursive: true, force: true })
      return { ok: false, error: 'empty_content' }
    }

    return {
      ok: true,
      path: filePath,
      cleanup: () => rmSync(dir, { recursive: true, force: true })
    }
  } catch {
    rmSync(dir, { recursive: true, force: true })
    return { ok: false, error: 'write_failed' }
  }
}

export async function uploadTempShareFile(
  filePath: string,
  expire: TempUploadExpire = '24h'
): Promise<
  | { ok: true; url: string; expire: TempUploadExpire; expiresInHours: number }
  | { ok: false; error: string }
> {
  try {
    const fileBuffer = readFileSync(filePath)
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('time', expire)
    form.append('fileToUpload', new Blob([fileBuffer]), basename(filePath))

    const res = await fetch(LITTERBOX_API, { method: 'POST', body: form })
    const text = (await res.text()).trim()
    if (!res.ok || !/^https?:\/\//i.test(text)) {
      return { ok: false, error: 'upload_failed' }
    }

    return {
      ok: true,
      url: text,
      expire,
      expiresInHours: EXPIRE_HOURS[expire]
    }
  } catch {
    return { ok: false, error: 'network_error' }
  }
}
