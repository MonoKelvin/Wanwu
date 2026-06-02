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

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000
const SEARCH_CACHE_MAX = 24

type SearchCacheEntry = {
  result: MusicSearchResult
  fetchedAt: number
}

const searchCache = new Map<string, SearchCacheEntry>()
let searchRequestId = 0

function searchCacheKey(query: string, filter: MusicSearchFilter): string {
  return `${query.trim().toLowerCase()}:${filter}`
}

function countResult(result: MusicSearchResult, filter: MusicSearchFilter): number {
  switch (filter) {
    case 'songs':
      return result.tracks.length
    case 'albums':
      return result.albums.length
    case 'artists':
      return result.artists.length
    case 'playlists':
      return result.playlists?.length ?? 0
  }
}

function getCachedResult(query: string, filter: MusicSearchFilter): MusicSearchResult | null {
  const key = searchCacheKey(query, filter)
  const entry = searchCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key)
    return null
  }
  return entry.result
}

function setCachedResult(query: string, filter: MusicSearchFilter, result: MusicSearchResult) {
  searchCache.set(searchCacheKey(query, filter), { result, fetchedAt: Date.now() })
  if (searchCache.size <= SEARCH_CACHE_MAX) return
  const oldest = [...searchCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)
  while (searchCache.size > SEARCH_CACHE_MAX) {
    const drop = oldest.shift()
    if (drop) searchCache.delete(drop[0])
  }
}

function clearSearchCache() {
  searchCache.clear()
}

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

  countForFilter(filter: MusicSearchFilter): number | null {
    const q = this.submittedQuery.trim()
    if (!q) return null
    const cached = getCachedResult(q, filter)
    if (cached) return countResult(cached, filter)
    if (this.filter === filter && this.result) return countResult(this.result, filter)
    return null
  },

  setFilter(filter: MusicSearchFilter) {
    if (this.filter === filter) return
    this.filter = filter
    if (!this.submittedQuery.trim()) return

    const cached = getCachedResult(this.submittedQuery, filter)
    if (cached) {
      this.result = cached
      this.error = null
      this.loading = false
      return
    }

    this.result = null
    this.loading = true
    this.error = null
    void this.search(this.submittedQuery)
  },

  async search(q?: string, options?: { skipCache?: boolean }) {
    const text = (q ?? this.query).trim()
    if (!text) {
      this.clear()
      return
    }

    const queryChanged = text !== this.submittedQuery
    this.query = text
    this.submittedQuery = text
    if (queryChanged) {
      this.filter = 'songs'
    }

    if (!options?.skipCache) {
      const cached = getCachedResult(text, this.filter)
      if (cached) {
        this.result = cached
        this.error = null
        this.loading = false
        this.history = pushMusicSearchHistory(text)
        return
      }
    }

    const reqId = ++searchRequestId
    this.loading = true
    this.error = null
    try {
      const result = await window.wanwu.music.search(text, this.filter)
      if (reqId !== searchRequestId) return
      this.result = result
      setCachedResult(text, this.filter, result)
      this.history = pushMusicSearchHistory(text)
    } catch (e) {
      if (reqId !== searchRequestId) return
      this.error = e instanceof Error ? e.message : '搜索失败'
      this.result = null
    } finally {
      if (reqId === searchRequestId) {
        this.loading = false
      }
    }
  },

  clear() {
    searchRequestId += 1
    this.submittedQuery = ''
    this.result = null
    this.error = null
    this.loading = false
  },

  clearQuery() {
    this.query = ''
    this.clear()
  },

  clearCache() {
    clearSearchCache()
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
