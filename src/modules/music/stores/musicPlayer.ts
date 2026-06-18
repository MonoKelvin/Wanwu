import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  MusicPlayMode,
  MusicPlayerLayoutMode,
  NormalizedTrack
} from '@modules/music/domain/types'
import { plainTrack } from '@modules/music/lib/plainTrack'
import { useMusicPlayer } from '@modules/music/composables/useMusicPlayer'
import {
  clearMusicPlaybackSnapshot,
  loadMusicPlaybackSnapshot,
  saveMusicPlaybackSnapshot
} from '@modules/music/lib/musicPlaybackPrefs'
import { formatPlayError } from '@modules/music/lib/formatPlayError'
import { mergeTrackPlaybackMeta } from '@modules/music/lib/mergeTrackPlaybackMeta'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'

export type MusicPlaybackQuality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires'

const QUALITY_CYCLE: MusicPlaybackQuality[] = ['standard', 'higher', 'exhigh', 'lossless', 'hires']

export const useMusicPlayerStore = defineStore('musicPlayer', () => {
  const settingsStore = useSettingsStore()
  const toast = useWanwuToast()
  const account = useMusicAccount()
  const currentTrack = ref<NormalizedTrack | null>(null)
  const queue = ref<NormalizedTrack[]>([])
  const queueIndex = ref(0)
  const playMode = ref<MusicPlayMode>('sequence')
  const layoutMode = ref<MusicPlayerLayoutMode>('gallery')
  const playbackQuality = ref<MusicPlaybackQuality>(
    (settingsStore.settings.musicNeteaseQuality as MusicPlaybackQuality) || 'standard'
  )
  const favoriteKeys = ref<Set<string>>(new Set())
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  const lyricsLrc = ref<string | null>(null)
  const sessionRestored = ref(false)

  const player = useMusicPlayer()

  const isPlaying = computed(() => player.playing.value)
  const progress = computed(() => player.progress.value)
  const duration = computed(() => player.duration.value)
  const volumePercent = computed(() => Math.round(player.volume.value * 100))
  const muted = computed(() => player.muted.value)
  const volumeIcon = computed(() =>
    muted.value || player.volume.value === 0 ? ('volume-x' as const) : ('volume-2' as const)
  )

  let playGeneration = 0
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  let progressPersistTimer: ReturnType<typeof setTimeout> | null = null
  const PROGRESS_PERSIST_MS = 8000

  function persistPlaybackState(wasPlaying?: boolean) {
    if (!currentTrack.value) {
      clearMusicPlaybackSnapshot()
      return
    }
    saveMusicPlaybackSnapshot({
      currentTrack: plainTrack(currentTrack.value),
      queue: queue.value.map(plainTrack),
      queueIndex: queueIndex.value,
      progress: player.progress.value,
      playMode: playMode.value,
      layoutMode: layoutMode.value,
      wasPlaying: wasPlaying ?? player.playing.value,
      savedAt: Date.now()
    })
  }

  function schedulePersist(wasPlaying?: boolean) {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => persistPlaybackState(wasPlaying), 350)
  }

  async function refreshFavorites() {
    if (account.profile.value.loggedIn) {
      try {
        await window.wanwu.music.syncPlatformFavorites()
      } catch {
        /* 同步失败时仍加载本地收藏 */
      }
    }
    const rows = await window.wanwu.music.listFavorites()
    favoriteKeys.value = new Set(rows.map((r) => r.trackKey))
  }

  function isFavorite(track: NormalizedTrack | null): boolean {
    if (!track) return false
    return favoriteKeys.value.has(track.trackKey)
  }

  async function toggleFavorite(track?: NormalizedTrack | null) {
    const t = track ?? currentTrack.value
    if (!t) return
    try {
      const on = await window.wanwu.music.toggleFavorite(plainTrack(t))
      if (on) favoriteKeys.value.add(t.trackKey)
      else favoriteKeys.value.delete(t.trackKey)
      favoriteKeys.value = new Set(favoriteKeys.value)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '收藏操作失败')
    }
  }

  function setQueue(tracks: NormalizedTrack[], startIndex = 0) {
    queue.value = tracks
    queueIndex.value = Math.max(0, Math.min(startIndex, tracks.length - 1))
    schedulePersist()
  }

  async function loadLyricsForTrack(track: NormalizedTrack, gen: number) {
    try {
      const ly = await window.wanwu.music.getLyrics(track.title, track.artist, {
        provider: track.provider,
        videoId: track.videoId,
        trackKey: track.trackKey
      })
      if (gen !== playGeneration) return
      if (currentTrack.value?.trackKey === track.trackKey) {
        lyricsLrc.value = ly.lrc ?? ly.plain ?? null
      }
    } catch {
      /* ignore */
    }
  }

  async function playTrack(track: NormalizedTrack, tracks?: NormalizedTrack[]) {
    const source = plainTrack(track)
    const gen = ++playGeneration

    if (tracks?.length) {
      const plainList = tracks.map(plainTrack)
      setQueue(plainList, plainList.findIndex((t) => t.trackKey === source.trackKey))
    } else if (!queue.value.length) setQueue([source], 0)
    else {
      const idx = queue.value.findIndex((t) => t.trackKey === source.trackKey)
      if (idx >= 0) queueIndex.value = idx
      else setQueue([source, ...queue.value.map(plainTrack)], 0)
    }

    player.pause()
    player.resetProgress()
    currentTrack.value = source
    loading.value = true
    errorMessage.value = null
    lyricsLrc.value = null

    try {
      const stream = await window.wanwu.music.resolveStream(source, false, playbackQuality.value)
      if (gen !== playGeneration) return
      if (!stream.url) throw new Error('无法获取播放地址')

      const playable = mergeTrackPlaybackMeta(
        stream.track ? plainTrack(stream.track) : source,
        { isTrial: stream.isTrial }
      )
      currentTrack.value = playable
      await player.loadAndPlay(stream.url, stream.format)
      if (gen !== playGeneration) {
        player.stop()
        return
      }
      if (!player.playing.value) await player.play()

      void window.wanwu.music.appendHistory(plainTrack(playable))
      void loadLyricsForTrack(playable, gen)
      schedulePersist(true)
    } catch (e) {
      if (gen !== playGeneration) return
      errorMessage.value = formatPlayError(e instanceof Error ? e.message : '播放失败')
    } finally {
      if (gen === playGeneration) loading.value = false
    }
  }

  async function restoreSession() {
    if (sessionRestored.value) return
    sessionRestored.value = true

    const snap = loadMusicPlaybackSnapshot()
    if (!snap?.currentTrack) return

    currentTrack.value = snap.currentTrack
    queue.value = snap.queue
    queueIndex.value = snap.queueIndex
    playMode.value = snap.playMode
    layoutMode.value = snap.layoutMode

    loading.value = true
    try {
      const stream = await window.wanwu.music.resolveStream(plainTrack(snap.currentTrack), false)
      if (!stream.url) return

      const playable = stream.track ? plainTrack(stream.track) : snap.currentTrack
      currentTrack.value = playable
      await player.load(stream.url, stream.format, false)

      const seekTo = Math.max(0, Math.min(snap.progress, player.duration.value || snap.progress))
      if (seekTo > 0) player.seek(seekTo)

      if (snap.wasPlaying) await player.play()
      void loadLyricsForTrack(playable, playGeneration)
    } catch {
      /* 恢复失败时保留曲目信息，用户可手动播放 */
    } finally {
      loading.value = false
    }
  }

  async function playAtIndex(index: number) {
    const t = queue.value[index]
    if (!t) return
    queueIndex.value = index
    await playTrack(t)
  }

  function nextIndex(): number {
    if (!queue.value.length) return -1
    if (playMode.value === 'shuffle') {
      if (queue.value.length === 1) return 0
      let n = queueIndex.value
      while (n === queueIndex.value) n = Math.floor(Math.random() * queue.value.length)
      return n
    }
    if (playMode.value === 'single') return queueIndex.value
    return (queueIndex.value + 1) % queue.value.length
  }

  function prevIndex(): number {
    if (!queue.value.length) return -1
    if (playMode.value === 'shuffle') return nextIndex()
    return (queueIndex.value - 1 + queue.value.length) % queue.value.length
  }

  async function playNext() {
    const idx = nextIndex()
    if (idx < 0) return
    await playAtIndex(idx)
  }

  async function playPrev() {
    if (player.progress.value > 3) {
      player.seek(0)
      schedulePersist()
      return
    }
    const idx = prevIndex()
    if (idx < 0) return
    await playAtIndex(idx)
  }

  function togglePlay() {
    player.toggle()
    schedulePersist()
  }

  function cyclePlayMode() {
    const order: MusicPlayMode[] = ['sequence', 'single', 'shuffle']
    const i = order.indexOf(playMode.value)
    playMode.value = order[(i + 1) % order.length]!
    schedulePersist()
  }

  function cycleLayoutMode() {
    const order: MusicPlayerLayoutMode[] = ['gallery', 'duet', 'immersion']
    const i = order.indexOf(layoutMode.value)
    layoutMode.value = order[(i + 1) % order.length]!
    schedulePersist()
  }

  function cyclePlaybackQuality() {
    const i = QUALITY_CYCLE.indexOf(playbackQuality.value)
    playbackQuality.value = QUALITY_CYCLE[(i + 1) % QUALITY_CYCLE.length]!
    if (currentTrack.value) void playTrack(currentTrack.value)
  }

  player.onEnded(() => {
    if (playMode.value === 'single') {
      player.seek(0)
      void player.play()
      schedulePersist(true)
      return
    }
    void playNext()
  })

  function stop() {
    player.stop()
    currentTrack.value = null
    clearMusicPlaybackSnapshot()
  }

  watch(
    () => player.progress.value,
    () => {
      if (progressPersistTimer) return
      progressPersistTimer = setTimeout(() => {
        progressPersistTimer = null
        schedulePersist()
      }, PROGRESS_PERSIST_MS)
    }
  )

  watch([playMode, layoutMode, currentTrack, queueIndex], () => schedulePersist())

  watch(
    () => account.profile.value.loggedIn,
    (loggedIn, wasLoggedIn) => {
      if (loggedIn || wasLoggedIn) void refreshFavorites()
    }
  )

  void refreshFavorites()

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => persistPlaybackState())
  }

  return {
    currentTrack,
    queue,
    queueIndex,
    playMode,
    layoutMode,
    playbackQuality,
    favoriteKeys,
    loading,
    errorMessage,
    lyricsLrc,
    isPlaying,
    progress,
    duration,
    volumePercent,
    muted,
    volumeIcon,
    refreshFavorites,
    isFavorite,
    toggleFavorite,
    setQueue,
    playTrack,
    playAtIndex,
    playNext,
    playPrev,
    togglePlay,
    cyclePlayMode,
    cycleLayoutMode,
    cyclePlaybackQuality,
    restoreSession,
    stop,
    seek: (s: number) => {
      player.seek(s)
      schedulePersist()
    },
    seekAndPlay: (s: number) => {
      player.seek(s)
      if (!player.playing.value) void player.play()
      schedulePersist()
    },
    setVolumePercent: (p: number) => player.setVolumePercent(p),
    toggleMute: () => player.toggleMute()
  }
})
