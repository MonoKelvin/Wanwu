import { defineStore } from 'pinia'
import { onScopeDispose, ref } from 'vue'
import type { DiscoverSectionKey, MusicChartCard, NormalizedTrack } from '@shared/types/music'
import {
  clearDiscoverSectionCache,
  readDiscoverSectionCache,
  writeDiscoverSectionCache
} from '@modules/music/lib/discoverSectionCache'

/** 发现页 UI 实际使用的 section（其余 key 仍可通过 loadSection 按需拉取） */
const ACTIVE_SECTION_KEYS: DiscoverSectionKey[] = ['forYou']

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

    if (!force) {
      const cached = readDiscoverSectionCache<typeof state.value.data>(key)
      if (cached?.length) {
        state.value.data = cached as never
        state.value.loaded = true
        return
      }
    }

    state.value.loading = true
    state.value.error = null
    try {
      const data = await window.wanwu.music.getDiscoverSection(key)
      state.value.data = data as never
      state.value.loaded = true
      if (Array.isArray(data) && data.length) {
        writeDiscoverSectionCache(key, data)
      }
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
      if (Array.isArray(data) && data.length) {
        writeDiscoverSectionCache(key, data)
      }
    } catch (e) {
      state.value.error = e instanceof Error ? e.message : '刷新失败'
    } finally {
      state.value.refreshing = false
    }
  }

  async function ensureLoaded() {
    if (!initialized.value) {
      initialized.value = true
      await loadSection('forYou')
      if (!forYou.value.data.length && !forYou.value.error) {
        await refreshSection('forYou')
      }
      return
    }

    if (!forYou.value.loaded) {
      await loadSection('forYou')
    }
  }

  async function reloadAll() {
    clearDiscoverSectionCache('forYou')
    forYou.value.loaded = false
    await loadSection('forYou', true)
  }

  function startAutoRefresh() {
    if (autoTimer) return
    autoTimer = setInterval(() => {
      void refreshSection('forYou')
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
    reloadAll,
    loadSection,
    refreshSection,
    startAutoRefresh,
    stopAutoRefresh
  }
})
