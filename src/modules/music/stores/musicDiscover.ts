import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'
import type { DiscoverSectionKey, MusicChartCard, NormalizedTrack } from '@shared/types/music'

const SECTION_KEYS: DiscoverSectionKey[] = [
  'forYou',
  'trending',
  'newReleases',
  'chartTracks',
  'chartPlaylists'
]

const AUTO_REFRESH_MS = 120_000

type SectionState<T> = {
  data: T
  loading: boolean
  refreshing: boolean
  loaded: boolean
  error: string | null
}

function emptySection<T>(data: T): SectionState<T> {
  return { data, loading: false, refreshing: false, loaded: false, error: null }
}

export const useMusicDiscoverStore = defineStore('musicDiscover', () => {
  const forYou = ref(emptySection<NormalizedTrack[]>([]))
  const trending = ref(emptySection<NormalizedTrack[]>([]))
  const newReleases = ref(emptySection<NormalizedTrack[]>([]))
  const chartTracks = ref(emptySection<NormalizedTrack[]>([]))
  const chartPlaylists = ref(emptySection<MusicChartCard[]>([]))

  const initialized = ref(false)
  let autoTimer: ReturnType<typeof setInterval> | null = null

  function sectionRef(key: DiscoverSectionKey) {
    switch (key) {
      case 'forYou':
        return forYou
      case 'trending':
        return trending
      case 'newReleases':
        return newReleases
      case 'chartTracks':
        return chartTracks
      case 'chartPlaylists':
        return chartPlaylists
    }
  }

  async function loadSection(key: DiscoverSectionKey, force = false) {
    const state = sectionRef(key)
    if (state.value.loaded && !force) return
    if (state.value.loading && !force) return

    state.value.loading = true
    state.value.error = null
    try {
      const data = await window.wanwu.music.getDiscoverSection(key)
      state.value.data = data as never
      state.value.loaded = true
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : '加载失败'
    } finally {
      state.value.loading = false
    }
  }

  async function refreshSection(key: DiscoverSectionKey) {
    const state = sectionRef(key)
    if (state.value.refreshing) return

    state.value.refreshing = true
    state.value.error = null
    try {
      const data = await window.wanwu.music.refreshDiscoverSection(key)
      state.value.data = data as never
      state.value.loaded = true
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : '刷新失败'
    } finally {
      state.value.refreshing = false
    }
  }

  async function ensureLoaded() {
    if (initialized.value) return
    initialized.value = true
    for (const key of SECTION_KEYS) {
      sectionRef(key).value.loading = true
    }
    await Promise.all(SECTION_KEYS.map((key) => loadSection(key)))
  }

  function startAutoRefresh() {
    if (autoTimer) return
    autoTimer = setInterval(() => {
      for (const key of SECTION_KEYS) {
        void refreshSection(key)
      }
    }, AUTO_REFRESH_MS)
  }

  function stopAutoRefresh() {
    if (!autoTimer) return
    clearInterval(autoTimer)
    autoTimer = null
  }

  onScopeDispose(stopAutoRefresh)

  return {
    forYou,
    trending,
    newReleases,
    chartTracks,
    chartPlaylists,
    ensureLoaded,
    loadSection,
    refreshSection,
    startAutoRefresh,
    stopAutoRefresh
  }
})
