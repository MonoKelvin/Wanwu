import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { MusicPlatformId, MusicPlatformLoginType, MusicPlatformSessionSnapshot } from './types'

const SESSION_FILE = 'netease-session.json'

export class PlatformSessionStore {
  private data: MusicPlatformSessionSnapshot

  constructor(
    private readonly platformId: MusicPlatformId,
    private readonly basePath: string
  ) {
    this.data = { platformId, loginType: 'none' }
    this.load()
  }

  private filePath(): string {
    const dir = join(this.basePath, 'db')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return join(dir, this.platformId === 'netease' ? SESSION_FILE : `${this.platformId}-session.json`)
  }

  private load(): void {
    try {
      const raw = readFileSync(this.filePath(), 'utf8')
      const parsed = JSON.parse(raw) as MusicPlatformSessionSnapshot
      this.data = { ...this.data, ...parsed, platformId: this.platformId }
    } catch {
      /* fresh session */
    }
  }

  private persist(): void {
    writeFileSync(this.filePath(), JSON.stringify(this.data, null, 0), 'utf8')
  }

  snapshot(): MusicPlatformSessionSnapshot {
    return { ...this.data }
  }

  getMusicU(): string | undefined {
    return this.data.musicU
  }

  getLoginType(): MusicPlatformLoginType {
    return this.data.loginType
  }

  cookieObject(): Record<string, string> {
    if (this.platformId === 'kugou') {
      const cookie: Record<string, string> = {
        userid: this.data.userId ? String(this.data.userId) : '0',
        token: this.data.musicU ?? ''
      }
      if (this.data.kugouGuid) cookie.KUGOU_API_GUID = this.data.kugouGuid
      if (this.data.kugouMid) cookie.KUGOU_API_MID = this.data.kugouMid
      if (this.data.dfid) cookie.dfid = this.data.dfid
      return cookie
    }
    const cookie: Record<string, string> = { os: 'pc' }
    if (this.data.musicU) cookie.MUSIC_U = this.data.musicU
    return cookie
  }

  cookieHeader(): string {
    const parts = Object.entries(this.cookieObject()).map(([k, v]) => `${k}=${v}`)
    return parts.join('; ')
  }

  setMusicU(musicU: string, profile?: { userId?: number; nickname?: string; avatarUrl?: string }): void {
    this.data.musicU = musicU.trim()
    this.data.loginType = 'normal'
    if (profile?.userId) this.data.userId = profile.userId
    if (profile?.nickname) this.data.nickname = profile.nickname
    if (profile?.avatarUrl) this.data.avatarUrl = profile.avatarUrl
    this.data.refreshedAt = new Date().toISOString()
    this.persist()
  }

  setProfile(profile: { userId?: number; nickname?: string; avatarUrl?: string }): void {
    if (profile.userId) this.data.userId = profile.userId
    if (profile.nickname) this.data.nickname = profile.nickname
    if (profile.avatarUrl) this.data.avatarUrl = profile.avatarUrl
    this.persist()
  }

  setKugouDevice(device: { kugouGuid: string; kugouMid: string; dfid: string }): void {
    this.data.kugouGuid = device.kugouGuid
    this.data.kugouMid = device.kugouMid
    this.data.dfid = device.dfid
    this.persist()
  }

  clear(): void {
    if (this.platformId === 'kugou') {
      const { kugouGuid, kugouMid, dfid } = this.data
      this.data = { platformId: this.platformId, loginType: 'none', kugouGuid, kugouMid, dfid }
    } else {
      this.data = { platformId: this.platformId, loginType: 'none' }
    }
    this.persist()
  }

  markRefreshed(): void {
    this.data.refreshedAt = new Date().toISOString()
    this.persist()
  }

  needsRefresh(maxAgeMs = 3 * 24 * 60 * 60 * 1000): boolean {
    if (!this.data.musicU || !this.data.refreshedAt) return false
    return Date.now() - new Date(this.data.refreshedAt).getTime() > maxAgeMs
  }
}
