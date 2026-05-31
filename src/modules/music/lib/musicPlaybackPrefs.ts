import type { MusicPlayMode, MusicPlayerLayoutMode, NormalizedTrack } from '@shared/types/music'

const PLAYBACK_KEY = 'wanwu.music.playback'

export interface MusicPlaybackSnapshot {
  currentTrack: NormalizedTrack
  queue: NormalizedTrack[]
  queueIndex: number
  progress: number
  playMode: MusicPlayMode
  layoutMode: MusicPlayerLayoutMode
  wasPlaying: boolean
  savedAt: number
}

export function loadMusicPlaybackSnapshot(): MusicPlaybackSnapshot | null {
  try {
    const raw = localStorage.getItem(PLAYBACK_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as MusicPlaybackSnapshot
    if (!data?.currentTrack?.trackKey) return null
    return data
  } catch {
    return null
  }
}

export function saveMusicPlaybackSnapshot(snapshot: MusicPlaybackSnapshot): void {
  try {
    localStorage.setItem(PLAYBACK_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore */
  }
}

export function clearMusicPlaybackSnapshot(): void {
  try {
    localStorage.removeItem(PLAYBACK_KEY)
  } catch {
    /* ignore */
  }
}
