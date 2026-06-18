import type { NormalizedTrack, MusicLyricsResult } from '@modules/music/domain/types'
import { upgradeCoverUrl } from '@shared/utils/musicCoverUrl'
import { encryptQuery } from './kuwoDes.js'
import { buildSongMatch, isSongMatch, type SongMatchInfo } from './songMatch'

const KUWO_SEARCH =
  'http://search.kuwo.cn/r.s?&correct=1&stype=comprehensive&encoding=utf8&rformat=json&mobi=1&show_copyright_off=1&searchapi=6&all='
const KUWO_PACKAGE = 'kwplayer_ar_5.1.0.0_B_jiakong_vh.apk'
/** 酷我官方榜：16 热歌 / 17 新歌 / 93 飙升（参考 KMusic kbangserver） */
const KUWO_BANG_IDS = ['16', '17', '93'] as const

/** 酷我音乐（参考 SPlayer UnblockAPI，国内中文曲库 + 直链 MP3） */
export class KuwoProvider {
  async searchTracks(query: string, limit = 12): Promise<NormalizedTrack[]> {
    const q = query.trim()
    if (!q) return []

    try {
      const url = `${KUWO_SEARCH}${encodeURIComponent(q)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
      if (!res.ok) return []
      const data = (await res.json()) as {
        content?: Array<{ musicpage?: { abslist?: Array<Record<string, unknown>> } }>
      }
      const list = data.content?.[1]?.musicpage?.abslist ?? []
      const tracks: NormalizedTrack[] = []
      for (const item of list) {
        const mapped = this.mapRow(item)
        if (mapped) tracks.push(mapped)
        if (tracks.length >= limit) break
      }
      return tracks
    } catch {
      return []
    }
  }

  /** 合并酷我官方榜（热歌/新歌/飙升） */
  async fetchChartTracks(totalLimit = 30): Promise<NormalizedTrack[]> {
    const perChart = Math.max(8, Math.ceil(totalLimit / KUWO_BANG_IDS.length))
    const out: NormalizedTrack[] = []
    const seen = new Set<string>()

    for (const bangId of KUWO_BANG_IDS) {
      const batch = await this.fetchBangChart(bangId, perChart)
      for (const track of batch) {
        if (seen.has(track.trackKey)) continue
        seen.add(track.trackKey)
        out.push(track)
        if (out.length >= totalLimit) return out
      }
    }
    return out
  }

  async resolveStreamUrl(trackId: string, match?: SongMatchInfo): Promise<string> {
    let songId = trackId.trim()
    if (match && !/^\d+$/.test(songId)) {
      const found = await this.findSongId(match)
      if (!found) throw new Error('酷我未找到匹配歌曲')
      songId = found
    }
    if (!songId) throw new Error('酷我曲目 ID 无效')

    const query =
      `corp=kuwo&source=${KUWO_PACKAGE}&p2p=1&type=convert_url2&sig=0&format=mp3&rid=` + songId
    const url = `http://mobi.kuwo.cn/mobi.s?f=kuwo&q=${encryptQuery(query)}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'okhttp/3.10.0' },
      signal: AbortSignal.timeout(12_000)
    })
    const text = await res.text()
    const matchUrl = text.match(/https?:\/\/[^\s$"]+/)
    if (!matchUrl?.[0]) throw new Error('酷我无法解析流地址')
    return matchUrl[0]
  }

  async resolveStreamForTrack(track: Pick<NormalizedTrack, 'videoId' | 'title' | 'artist'>): Promise<string> {
    const match = buildSongMatch(track.title, track.artist)
    return this.resolveStreamUrl(track.videoId, match)
  }

  async getLyrics(musicId: string): Promise<MusicLyricsResult> {
    const id = musicId.trim().replace(/^MUSIC_/, '')
    if (!/^\d+$/.test(id)) return {}

    const urls = [
      `http://www.kuwo.cn/openapi/v1/www/lyric/getlyric?musicId=${id}`,
      `http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${id}`
    ]

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://www.kuwo.cn/'
          },
          signal: AbortSignal.timeout(12_000)
        })
        if (!res.ok) continue
        const data = (await res.json()) as Record<string, unknown>
        const lrc = this.formatKuwoLrc(data)
        if (lrc) return { lrc }
      } catch {
        /* try next */
      }
    }
    return {}
  }

  async findMusicId(title: string, artist: string): Promise<string | null> {
    const match = buildSongMatch(title, artist)
    return this.findSongId(match)
  }

  private async fetchBangChart(bangId: string, rn: number): Promise<NormalizedTrack[]> {
    try {
      const url =
        `http://kbangserver.kuwo.cn/ksong.s?from=pc&fmt=json&pn=0&rn=${rn}` +
        `&type=bang&data=content&id=${bangId}&show_copyright_off=0&pcmp4=1&isbang=1&userid=0`
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
      if (!res.ok) return []
      const data = (await res.json()) as { musiclist?: Array<Record<string, unknown>> }
      const tracks: NormalizedTrack[] = []
      for (const item of data.musiclist ?? []) {
        const mapped = this.mapChartRow(item)
        if (mapped) tracks.push(mapped)
      }
      return tracks
    } catch {
      return []
    }
  }

  private formatKuwoLrc(payload: Record<string, unknown>): string | undefined {
    const data = payload.data as Record<string, unknown> | undefined
    const list =
      (data?.lrclist as Array<{ time?: number | string; lineLyric?: string }> | undefined) ??
      (payload.lrclist as Array<{ time?: number | string; lineLyric?: string }> | undefined)
    if (!Array.isArray(list) || !list.length) return undefined

    const lines = list
      .map((item) => {
        const text = String(item.lineLyric ?? '').trim()
        if (!text) return ''
        const sec = Number(item.time)
        if (!Number.isFinite(sec)) return text
        const m = Math.floor(sec / 60)
        const s = sec % 60
        const stamp = `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`
        return `[${stamp}]${text}`
      })
      .filter(Boolean)

    return lines.length ? lines.join('\n') : undefined
  }

  private async findSongId(match: SongMatchInfo): Promise<string | null> {
    const q = match.keyword || `${match.songName} ${match.artist}`.trim()
    if (!q) return null

    try {
      const url = `${KUWO_SEARCH}${encodeURIComponent(q)}`
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) })
      if (!res.ok) return null
      const data = (await res.json()) as {
        content?: Array<{ musicpage?: { abslist?: Array<Record<string, unknown>> } }>
      }
      const list = data.content?.[1]?.musicpage?.abslist ?? []
      for (const item of list) {
        const rid = item.MUSICRID
        if (typeof rid !== 'string' || !rid.startsWith('MUSIC_')) continue
        if (isSongMatch(String(item.SONGNAME ?? ''), String(item.ARTIST ?? ''), match)) {
          return rid.slice('MUSIC_'.length)
        }
      }
    } catch {
      /* ignore */
    }
    return null
  }

  private mapChartRow(item: Record<string, unknown>): NormalizedTrack | null {
    let id = String(item.id ?? '').trim()
    if (!/^\d+$/.test(id)) {
      const param = String(item.param ?? '')
      const m = param.match(/MUSIC_(\d+)/)
      id = m?.[1] ?? ''
    }
    if (!/^\d+$/.test(id)) return null

    const title = String(item.name ?? item.SONGNAME ?? '').trim()
    if (!title) return null
    const artist = String(item.artist ?? item.ARTIST ?? '未知歌手').trim()

    const albumRaw = item.albumid ?? item.ALBUMID
    const albumId =
      typeof albumRaw === 'string'
        ? albumRaw.replace(/^ALBUM_/, '').trim()
        : typeof albumRaw === 'number'
          ? String(albumRaw)
          : ''

    const pic = String(item.albumpic ?? item.pic120 ?? item.pic ?? item.v9_pic2 ?? '')
    let coverUrl = upgradeCoverUrl(pic.replace(/\/120\//, '/500/'), 'card')
    if (!coverUrl && /^\d+$/.test(albumId)) {
      coverUrl = `http://img4.kuwo.cn/star/albumcover/500/${albumId}.jpg`
    }

    const durRaw = item.song_duration ?? item.duration
    const durationSec =
      typeof durRaw === 'number' ? durRaw : typeof durRaw === 'string' ? parseInt(durRaw, 10) : undefined

    return {
      trackKey: `kuwo:${id}`,
      provider: 'kuwo',
      videoId: id,
      title,
      artist,
      album: typeof item.album === 'string' ? item.album : undefined,
      coverUrl: coverUrl || undefined,
      durationSec: durationSec && durationSec > 0 ? durationSec : undefined
    }
  }

  private mapRow(item: Record<string, unknown>): NormalizedTrack | null {
    const rid = item.MUSICRID
    if (typeof rid === 'string' && rid.startsWith('MUSIC_')) {
      return this.mapChartRow({ ...item, id: rid.slice('MUSIC_'.length) })
    }
    return this.mapChartRow(item)
  }
}
