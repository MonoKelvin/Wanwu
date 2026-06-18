import { createWriteStream, existsSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, relative } from 'path'
import { ensureWanwuDataLayout, getWanwuPathLayout } from '../../../../../electron/services/data/paths'
import { toWanwuMediaUrl } from '../../../../../electron/services/media/wanwu'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import type { VeromeClient } from './veromeClient'
import { musicCacheAudioDir } from '../musicPaths'
import {
  extensionForFormat,
  pickBestAudioStream,
  type AudioStreamFormat,
  type PickedStream
} from './streamUrl'

export class StreamCacheService {
  private readonly layout: ReturnType<typeof getWanwuPathLayout>
  private static readonly MAX_CACHE_FILES = 48

  constructor(
    basePath: string,
    private readonly verome: VeromeClient
  ) {
    const root = ensureWanwuDataLayout(basePath)
    this.layout = getWanwuPathLayout(root)
  }

  private get basePath(): string {
    return this.layout.root
  }

  private audioDir(): string {
    return musicCacheAudioDir(this.layout)
  }

  private evictOldCacheFiles(): void {
    try {
      const dir = this.audioDir()
      const files = readdirSync(dir)
        .map((name) => {
          const path = join(dir, name)
          return { path, mtime: statSync(path).mtimeMs }
        })
        .sort((a, b) => a.mtime - b.mtime)
      while (files.length > StreamCacheService.MAX_CACHE_FILES) {
        const old = files.shift()
        if (old) unlinkSync(old.path)
      }
    } catch {
      /* ignore */
    }
  }

  cacheKey(provider: string, videoId: string): string {
    return `${provider}:${videoId}`
  }

  localPath(provider: string, videoId: string, format: AudioStreamFormat = 'mp4'): string {
    const safe = this.cacheKey(provider, videoId).replace(/[^a-zA-Z0-9:_-]/g, '_')
    return join(this.audioDir(), `${safe}.${extensionForFormat(format)}`)
  }

  private cachedMediaUrl(
    provider: string,
    videoId: string
  ): { url: string; cachedPath: string; format: AudioStreamFormat } | null {
    for (const ext of ['m4a', 'mp3', 'webm', 'ogg'] as const) {
      const path = join(
        this.audioDir(),
        `${this.cacheKey(provider, videoId).replace(/[^a-zA-Z0-9:_-]/g, '_')}.${ext}`
      )
      if (existsSync(path) && statSync(path).size > 0) {
        const rel = relative(this.basePath, path).replace(/\\/g, '/')
        const url = toWanwuMediaUrl(rel) ?? `wanwu-media://${encodeURI(rel)}`
        const fmt: AudioStreamFormat =
          ext === 'm4a' ? 'mp4' : ext === 'mp3' ? 'mp3' : ext === 'webm' ? 'webm' : 'ogg'
        return { url, cachedPath: path, format: fmt }
      }
    }
    return null
  }

  async resolveVeromeStream(
    videoId: string,
    hint?: { title?: string; artist?: string }
  ): Promise<PickedStream> {
    const hit = this.cachedMediaUrl('verome', videoId)
    if (hit) return { url: hit.url, format: hit.format }

    let picked = await this.fetchVeromeStream(videoId)

    if (!picked && hint?.title) {
      const q = `${hint.title} ${hint.artist ?? ''}`.trim()
      try {
        const searchData = await this.verome.search(q, 'songs')
        const candidates = extractSearchVideoIds(searchData)
        for (const id of candidates.slice(0, 4)) {
          picked = await this.fetchVeromeStream(id)
          if (picked) break
        }
      } catch {
        /* ignore */
      }
    }

    if (!picked) throw new Error('无法获取音频流地址')

    return {
      url: picked.url.startsWith('http') ? this.verome.proxyUrl(picked.url) : picked.url,
      format: picked.format,
      mimeType: picked.mimeType
    }
  }

  private async fetchVeromeStream(videoId: string): Promise<PickedStream | undefined> {
    try {
      const streamData = await this.verome.getStream(videoId)
      const picked = pickBestAudioStream(streamData)
      if (picked) return picked
    } catch {
      /* try song */
    }

    try {
      const song = await this.verome.getSong(videoId)
      return pickBestAudioStream(song)
    } catch {
      return undefined
    }
  }

  async downloadToCache(
    provider: string,
    videoId: string,
    streamUrl: string,
    format: AudioStreamFormat = 'mp4'
  ): Promise<{ url: string; format: AudioStreamFormat }> {
    const dest = this.localPath(provider, videoId, format)
    if (existsSync(dest) && statSync(dest).size > 0) {
      const rel = relative(this.basePath, dest).replace(/\\/g, '/')
      return {
        url: toWanwuMediaUrl(rel) ?? `wanwu-media://${encodeURI(rel)}`,
        format
      }
    }

    const res = await fetch(streamUrl)
    if (!res.ok || !res.body) throw new Error(`下载失败 ${res.status}`)
    await pipeline(
      Readable.fromWeb(res.body as import('stream/web').ReadableStream),
      createWriteStream(dest)
    )
    this.evictOldCacheFiles()
    const rel = relative(this.basePath, dest).replace(/\\/g, '/')
    return {
      url: toWanwuMediaUrl(rel) ?? `wanwu-media://${encodeURI(rel)}`,
      format
    }
  }

  async resolveWithCache(
    track: Pick<NormalizedTrack, 'provider' | 'videoId'>,
    remote: PickedStream,
    useCache: boolean
  ): Promise<MusicStreamResultInternal> {
    const hit = this.cachedMediaUrl(track.provider, track.videoId)
    if (hit) return hit

    if (useCache && remote.url.startsWith('http') && track.provider !== 'kuwo') {
      try {
        const cached = await this.downloadToCache(
          track.provider,
          track.videoId,
          remote.url,
          remote.format
        )
        return {
          url: cached.url,
          format: cached.format,
          cachedPath: this.localPath(track.provider, track.videoId, remote.format)
        }
      } catch {
        return { url: remote.url, format: remote.format }
      }
    }
    return { url: remote.url, format: remote.format }
  }
}

interface MusicStreamResultInternal {
  url: string
  format: AudioStreamFormat
  cachedPath?: string
}

function extractSearchVideoIds(data: unknown): string[] {
  const ids: string[] = []
  const walk = (node: unknown, depth = 0) => {
    if (depth > 6 || !node) return
    if (Array.isArray(node)) {
      node.forEach((x) => walk(x, depth + 1))
      return
    }
    if (typeof node !== 'object') return
    const o = node as Record<string, unknown>
    const id = o.videoId ?? o.video_id ?? o.id
    if (typeof id === 'string' && id.trim()) ids.push(id.trim())
    for (const v of Object.values(o)) walk(v, depth + 1)
  }
  walk(data)
  return [...new Set(ids)]
}
