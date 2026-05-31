const VOLUME_KEY = 'wanwu.music.volume'
const MUTED_KEY = 'wanwu.music.muted'

export function loadMusicVolumePrefs(): { volume: number; muted: boolean } {
  try {
    const rawVol = localStorage.getItem(VOLUME_KEY)
    const rawMuted = localStorage.getItem(MUTED_KEY)
    const volume = rawVol != null ? Number(rawVol) : 0.85
    const muted = rawMuted === '1'
    return {
      volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.85,
      muted
    }
  } catch {
    return { volume: 0.85, muted: false }
  }
}

export function saveMusicVolumePrefs(volume: number, muted: boolean): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(1, volume))))
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}
