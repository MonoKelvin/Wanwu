import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { buildKugouRequestCookie, parseKugouCookieStrings } from './kugou/kugouCookie'
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
      this.migrateKugouSession()
    } catch {
      /* fresh session */
    }
  }

  /** 旧版仅保存 musicU，补齐 kugouCookies 以便复用完整 Cookie */
  private migrateKugouSession(): void {
    if (this.platformId !== 'kugou' || this.data.kugouCookies) return
    if (!this.data.musicU) return
    this.data.kugouCookies = {
      token: this.data.musicU,
      userid: this.data.userId ? String(this.data.userId) : '0'
    }
    this.persist()
  }

  private persist(): void {
    writeFileSync(this.filePath(), JSON.stringify(this.data, null, 0), 'utf8')
  }

  snapshot(): MusicPlatformSessionSnapshot {
    return { ...this.data }
  }

  getMusicU(): string | undefined {
    if (this.platformId === 'kugou') {
      const token = (this.data.musicU ?? this.data.kugouCookies?.token)?.trim()
      return token || undefined
    }
    return this.data.musicU
  }

  getLoginType(): MusicPlatformLoginType {
    return this.data.loginType
  }

  cookieObject(): Record<string, string> {
    if (this.platformId === 'kugou') {
      return buildKugouRequestCookie({
        kugouCookies: this.data.kugouCookies,
        kugouGuid: this.data.kugouGuid,
        kugouMid: this.data.kugouMid,
        dfid: this.data.dfid,
        musicU: this.getMusicU(),
        userId: this.data.userId
      })
    }
    const cookie: Record<string, string> = { os: 'pc' }
    if (this.data.musicU) cookie.MUSIC_U = this.data.musicU
    return cookie
  }

  cookieHeader(): string {
    const parts = Object.entries(this.cookieObject()).map(([k, v]) => `${k}=${v}`)
    return parts.join('; ')
  }

  mergeKugouCookies(partial: Record<string, string>): void {
    if (this.platformId !== 'kugou') return
    this.data.kugouCookies = { ...(this.data.kugouCookies ?? {}), ...partial }

    const token = this.data.kugouCookies.token?.trim()
    const useridRaw = this.data.kugouCookies.userid
    if (token) {
      this.data.musicU = token
      this.data.loginType = 'normal'
      const uid = Number(useridRaw)
      if (Number.isFinite(uid) && uid > 0) this.data.userId = uid
    }

    this.data.refreshedAt = new Date().toISOString()
    this.persist()
  }

  mergeKugouCookieStrings(rows: string[]): void {
    if (!rows.length) return
    this.mergeKugouCookies(parseKugouCookieStrings(rows))
  }

  setMusicU(musicU: string, profile?: { userId?: number; nickname?: string; avatarUrl?: string }): void {
    this.data.musicU = musicU.trim()
    this.data.loginType = 'normal'
    if (profile?.userId) this.data.userId = profile.userId
    if (profile?.nickname) this.data.nickname = profile.nickname
    if (profile?.avatarUrl) this.data.avatarUrl = profile.avatarUrl
    if (this.platformId === 'kugou') {
      this.mergeKugouCookies({
        token: this.data.musicU,
        userid: profile?.userId ? String(profile.userId) : this.data.kugouCookies?.userid ?? '0'
      })
      return
    }
    this.data.refreshedAt = new Date().toISOString()
    this.persist()
  }

  setProfile(profile: { userId?: number; nickname?: string; avatarUrl?: string }): void {
    if (profile.userId) this.data.userId = profile.userId
    if (profile.nickname) this.data.nickname = profile.nickname
    if (profile.avatarUrl) this.data.avatarUrl = profile.avatarUrl
    if (this.platformId === 'kugou' && profile.userId) {
      this.mergeKugouCookies({ userid: String(profile.userId) })
      return
    }
    this.persist()
  }

  setKugouDevice(device: { kugouGuid: string; kugouMid: string; dfid: string }): void {
    this.data.kugouGuid = device.kugouGuid
    this.data.kugouMid = device.kugouMid
    this.data.dfid = device.dfid
    this.mergeKugouCookies({
      KUGOU_API_GUID: device.kugouGuid,
      KUGOU_API_MID: device.kugouMid,
      dfid: device.dfid
    })
  }

  clear(): void {
    if (this.platformId === 'kugou') {
      const { kugouGuid, kugouMid, dfid } = this.data
      this.data = {
        platformId: this.platformId,
        loginType: 'none',
        kugouGuid,
        kugouMid,
        dfid,
        kugouCookies: buildKugouRequestCookie({ kugouGuid, kugouMid, dfid })
      }
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
    if (!this.getMusicU() || !this.data.refreshedAt) return false
    return Date.now() - new Date(this.data.refreshedAt).getTime() > maxAgeMs
  }
}
