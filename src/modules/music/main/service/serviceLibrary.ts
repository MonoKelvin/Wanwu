import type { MusicDatabase } from './db'
import type { IMusicPlatformService } from './platform/IMusicPlatformService'
import type { MusicFavoriteRow, MusicHistoryRow, NormalizedTrack } from '@modules/music/domain/types'
import { randomUUID } from 'crypto'

export interface MusicServiceLibraryHost {
  musicDb: MusicDatabase
  platformLikedKeys: Set<string> | null
  refreshApiClient(): Promise<unknown>
  accountPlatform(): IMusicPlatformService
  accountPlatformId(): 'netease' | 'kugou'
  getPlatformLikedTracks(limit?: number): Promise<NormalizedTrack[]>
}

export class MusicServiceLibrary {
  constructor(readonly host: MusicServiceLibraryHost) {}

  listFavorites(): MusicFavoriteRow[] {
    const rows = this.host.musicDb
      .getDb()
      .prepare(
        'SELECT track_key, title, artist, video_id, cover_url, payload_json, created_at FROM music_favorites ORDER BY created_at DESC'
      )
      .all() as Array<{
      track_key: string
      title: string
      artist: string
      video_id: string
      cover_url: string | null
      payload_json: string
      created_at: string
    }>
    return rows.map((r) => ({
      trackKey: r.track_key,
      title: r.title,
      artist: r.artist,
      videoId: r.video_id,
      coverUrl: r.cover_url,
      payloadJson: r.payload_json,
      createdAt: r.created_at
    }))
  }

  isFavorite(trackKey: string): boolean {
    const row = this.host.musicDb
      .getDb()
      .prepare('SELECT 1 FROM music_favorites WHERE track_key = ?')
      .get(trackKey)
    if (row) return true
    return this.host.platformLikedKeys?.has(trackKey) ?? false
  }

  private patchPlatformLikedCache(trackKey: string, liked: boolean): void {
    if (!this.host.platformLikedKeys) this.host.platformLikedKeys = new Set()
    if (liked) this.host.platformLikedKeys.add(trackKey)
    else this.host.platformLikedKeys.delete(trackKey)
  }

  async refreshPlatformLikedCache(): Promise<void> {
    await this.host.refreshApiClient()
    const platform = this.host.accountPlatform()
    const status = await platform.getLoginStatus()
    if (!status.loggedIn) {
      this.host.platformLikedKeys = null
      return
    }
    const keys = new Set<string>()
    if (this.host.accountPlatformId() === 'netease') {
      const ids = await platform.getLikedSongIds()
      for (const id of ids) keys.add(`netease:${id}`)
    } else {
      const tracks = await this.host.getPlatformLikedTracks(500)
      for (const t of tracks) keys.add(t.trackKey)
    }
    this.host.platformLikedKeys = keys
  }

  /** 将平台「我喜欢」合并进本地收藏表，并刷新平台红心缓存 */
  async syncPlatformFavorites(limit = 300): Promise<void> {
    await this.host.refreshApiClient()
    const platform = this.host.accountPlatform()
    const status = await platform.getLoginStatus()
    if (!status.loggedIn) {
      this.host.platformLikedKeys = null
      return
    }
    const tracks = await this.host.getPlatformLikedTracks(limit)
    const db = this.host.musicDb.getDb()
    const now = new Date().toISOString()
    const insert = db.prepare(
      `INSERT OR IGNORE INTO music_favorites (track_key, title, artist, video_id, cover_url, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    for (const track of tracks) {
      insert.run(
        track.trackKey,
        track.title,
        track.artist,
        track.videoId,
        track.coverUrl ?? null,
        JSON.stringify(track),
        now
      )
    }
    await this.refreshPlatformLikedCache()
  }

  async toggleFavorite(track: NormalizedTrack): Promise<boolean> {
    await this.host.refreshApiClient()
    const db = this.host.musicDb.getDb()
    const existing = db.prepare('SELECT 1 FROM music_favorites WHERE track_key = ?').get(track.trackKey)
    const nextLiked = !existing

    const accountId = this.host.accountPlatformId()
    const platform = this.host.accountPlatform()
    const status = await platform.getLoginStatus()
    const syncPlatform = status.loggedIn && track.provider === accountId

    if (syncPlatform) {
      await platform.likeSong(track.videoId, nextLiked)
      this.patchPlatformLikedCache(track.trackKey, nextLiked)
    }

    if (existing) {
      db.prepare('DELETE FROM music_favorites WHERE track_key = ?').run(track.trackKey)
    } else {
      db.prepare(
        `INSERT INTO music_favorites (track_key, title, artist, video_id, cover_url, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        track.trackKey,
        track.title,
        track.artist,
        track.videoId,
        track.coverUrl ?? null,
        JSON.stringify(track),
        new Date().toISOString()
      )
    }
    return nextLiked
  }

  listHistory(limit = 50): MusicHistoryRow[] {
    this.compactHistoryDuplicates()
    const rows = this.host.musicDb
      .getDb()
      .prepare(
        `SELECT id, track_key, title, artist, video_id, cover_url, payload_json, played_at
         FROM music_history ORDER BY played_at DESC LIMIT ?`
      )
      .all(limit) as Array<{
      id: string
      track_key: string
      title: string
      artist: string
      video_id: string
      cover_url: string | null
      payload_json: string
      played_at: string
    }>
    return rows.map((r) => ({
      id: r.id,
      trackKey: r.track_key,
      title: r.title,
      artist: r.artist,
      videoId: r.video_id,
      coverUrl: r.cover_url,
      payloadJson: r.payload_json,
      playedAt: r.played_at
    }))
  }

  appendHistory(track: NormalizedTrack): void {
    const db = this.host.musicDb.getDb()
    const playedAt = new Date().toISOString()
    const payload = JSON.stringify(track)
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM music_history WHERE track_key = ?').run(track.trackKey)
      db.prepare(
        `INSERT INTO music_history (id, track_key, title, artist, video_id, cover_url, payload_json, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        track.trackKey,
        track.title,
        track.artist,
        track.videoId,
        track.coverUrl ?? null,
        payload,
        playedAt
      )
    })
    tx()
  }

  /** 保留每首歌最近一条播放记录，删除更早的重复项 */
  private compactHistoryDuplicates(): void {
    this.host.musicDb.getDb().exec(`
      DELETE FROM music_history
      WHERE id IN (
        SELECT h1.id
        FROM music_history h1
        INNER JOIN music_history h2
          ON h1.track_key = h2.track_key AND h1.played_at < h2.played_at
      )
    `)
  }

  clearHistory(): void {
    this.host.musicDb.getDb().prepare('DELETE FROM music_history').run()
  }
}
