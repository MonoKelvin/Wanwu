import { reactive } from 'vue'
import type { MusicSearchResult } from '@shared/types/music'
import {
  clearMusicSearchHistory,
  filterMusicSearchHistory,
  loadMusicSearchHistory,
  pushMusicSearchHistory,
  removeMusicSearchHistory
} from '@modules/music/lib/musicSearchHistory'

export type MusicSearchFilter = 'songs' | 'albums' | 'artists' | 'playlists'

const musicSearch = reactive({
  query: '',
  submittedQuery: '',
  filter: 'songs' as MusicSearchFilter,
  loading: false,
  error: null as string | null,
  result: null as MusicSearchResult | null,
  focusRequest: 0,
  history: loadMusicSearchHistory(),

  get isActive() {
    return this.submittedQuery.length > 0
  },

  get filteredHistory() {
    return filterMusicSearchHistory(this.history, this.query)
  },

  setFilter(filter: MusicSearchFilter) {
    this.filter = filter
    if (this.submittedQuery) void this.search(this.submittedQuery)
  },

  async search(q?: string) {
    const text = (q ?? this.query).trim()
    if (!text) {
      this.clear()
      return
    }
    this.query = text
    this.submittedQuery = text
    this.loading = true
    this.error = null
    try {
      this.result = await window.wanwu.music.search(text, this.filter)
      this.history = pushMusicSearchHistory(text)
    } catch (e) {
      this.error = e instanceof Error ? e.message : '搜索失败'
      this.result = null
    } finally {
      this.loading = false
    }
  },

  clear() {
    this.submittedQuery = ''
    this.result = null
    this.error = null
  },

  clearQuery() {
    this.query = ''
    this.clear()
  },

  removeHistory(term: string) {
    this.history = removeMusicSearchHistory(term)
  },

  clearAllHistory() {
    this.history = clearMusicSearchHistory()
  },

  requestFocus() {
    this.focusRequest += 1
  }
})

export function useMusicSearch() {
  return musicSearch
}
