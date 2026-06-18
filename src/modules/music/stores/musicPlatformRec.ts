import { defineStore } from 'pinia'
import type { NormalizedTrack } from '@modules/music/domain/types'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useMusicPlatformRecStore = defineStore('musicPlatformRec', {
  state: () => ({
    dailyDate: '' as string,
    dailyTracks: [] as NormalizedTrack[],
    fmTracks: [] as NormalizedTrack[],
    loadingDaily: false,
    loadingFm: false
  }),
  actions: {
    async ensureDaily(force = false) {
      if (!force && this.dailyDate === todayKey() && this.dailyTracks.length) return
      this.loadingDaily = true
      try {
        this.dailyTracks = await window.wanwu.music.getDailyRecommend()
        this.dailyDate = todayKey()
      } finally {
        this.loadingDaily = false
      }
    },
    async refreshFm() {
      this.loadingFm = true
      try {
        this.fmTracks = await window.wanwu.music.getPersonalFm()
      } finally {
        this.loadingFm = false
      }
    },
    async trashFmSong(songId: string) {
      await window.wanwu.music.trashPersonalFm(songId)
      this.fmTracks = this.fmTracks.filter((t) => t.videoId !== songId)
    }
  }
})
