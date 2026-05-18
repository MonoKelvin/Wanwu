import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSettingsStore } from '@shared/stores/settings'
import {
  RSS_DEFAULT_GROUP_ID,
  RSS_RECYCLE_GROUP_ID,
  type RssEntry,
  type RssFeed,
  type RssFeedInput,
  type RssFeedUpdate,
  type RssGroup
} from '@shared/types/rss'

export type { RssEntry, RssFeed, RssGroup }

const PROBE_CONCURRENCY = 3

export const useRssStore = defineStore('rss', () => {
  const groups = ref<RssGroup[]>([])
  const feeds = ref<RssFeed[]>([])
  const entries = ref<RssEntry[]>([])
  const entryTotal = ref(0)
  const entryOffset = ref(0)
  const error = ref('')
  const refreshingFeedId = ref<string | null>(null)
  const probingFeedIds = ref<Set<string>>(new Set())
  let refreshGeneration = 0
  let accessibilityProbeGeneration = 0

  const activeFeeds = computed(() =>
    feeds.value.filter((f) => !f.deletedAt && f.groupId !== RSS_RECYCLE_GROUP_ID)
  )

  const recycleFeeds = computed(() =>
    feeds.value.filter((f) => f.groupId === RSS_RECYCLE_GROUP_ID)
  )

  const sidebarGroups = computed(() =>
    groups.value.filter((g) => !g.isRecycleBin && g.id !== RSS_DEFAULT_GROUP_ID)
  )

  function feedsInGroup(groupId: string) {
    return activeFeeds.value.filter((f) => f.groupId === groupId)
  }

  function isFeedRefreshing(feedId: string | undefined): boolean {
    return Boolean(feedId && refreshingFeedId.value === feedId)
  }

  function isFeedProbing(feedId: string): boolean {
    return probingFeedIds.value.has(feedId)
  }

  function cancelPendingRefresh() {
    refreshGeneration += 1
    refreshingFeedId.value = null
  }

  function stopAccessibilityProbe() {
    accessibilityProbeGeneration += 1
    probingFeedIds.value = new Set()
  }

  function patchFeed(feedId: string, patch: Partial<RssFeed>) {
    const idx = feeds.value.findIndex((f) => f.id === feedId)
    if (idx >= 0) {
      feeds.value[idx] = { ...feeds.value[idx], ...patch }
    }
  }

  function pageSize() {
    return useSettingsStore().settings.rssFetchLimit
  }

  async function loadAll() {
    const [g, f] = await Promise.all([window.wanwu.rss.listGroups(), window.wanwu.rss.listFeeds()])
    groups.value = g
    feeds.value = f
  }

  async function probeFeedAccessibility(feedId: string, generation: number) {
    if (generation !== accessibilityProbeGeneration) return
    const next = new Set(probingFeedIds.value)
    next.add(feedId)
    probingFeedIds.value = next
    try {
      const result = await window.wanwu.rss.probeFeed(feedId)
      if (generation !== accessibilityProbeGeneration) return
      patchFeed(feedId, { accessWarning: result.accessWarning })
    } catch {
      /* 单条失败不影响其余探测 */
    } finally {
      const next = new Set(probingFeedIds.value)
      next.delete(feedId)
      probingFeedIds.value = next
    }
  }

  /** 后台依次探测可访问性（限制并发，避免占满网络） */
  async function startAccessibilityProbe() {
    stopAccessibilityProbe()
    const generation = accessibilityProbeGeneration
    const ids = activeFeeds.value.map((f) => f.id)
    if (!ids.length) return

    let index = 0
    async function worker() {
      while (index < ids.length && generation === accessibilityProbeGeneration) {
        const feedId = ids[index++]
        await probeFeedAccessibility(feedId, generation)
      }
    }

    const workers = Array.from({ length: Math.min(PROBE_CONCURRENCY, ids.length) }, () => worker())
    await Promise.all(workers)
  }

  async function loadEntries(feedId: string, generation?: number, append = false) {
    const limit = pageSize()
    const offset = append ? entryOffset.value : 0
    const { items, total } = await window.wanwu.rss.listEntries(feedId, limit, offset)
    if (generation !== undefined && generation !== refreshGeneration) return
    entryTotal.value = total
    if (append) {
      entries.value = [...entries.value, ...items]
      entryOffset.value = entries.value.length
    } else {
      entries.value = items
      entryOffset.value = items.length
    }
  }

  const hasMoreEntries = computed(() => entries.value.length < entryTotal.value)

  async function refreshFeed(feedId: string): Promise<boolean> {
    const generation = ++refreshGeneration
    refreshingFeedId.value = feedId
    error.value = ''

    const result = await window.wanwu.rss.fetchFeed(feedId, pageSize())

    if (generation !== refreshGeneration) return false
    refreshingFeedId.value = null

    if (!result.ok) {
      error.value = result.error ?? '刷新失败'
      void probeFeedAccessibility(feedId, accessibilityProbeGeneration)
      return false
    }

    entryTotal.value = result.total
    await loadEntries(feedId, generation, false)
    if (generation !== refreshGeneration) return false
    void probeFeedAccessibility(feedId, accessibilityProbeGeneration)
    return true
  }

  async function loadMoreEntries(feedId: string): Promise<boolean> {
    if (!hasMoreEntries.value) return false
    const generation = refreshGeneration
    await loadEntries(feedId, generation, true)
    return generation === refreshGeneration
  }

  async function createGroup(name: string): Promise<RssGroup> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('请填写分组名称')
    await window.wanwu.rss.createGroup(trimmed)
    await loadAll()
    const found = groups.value
      .filter((g) => !g.isRecycleBin && g.name === trimmed)
      .sort((a, b) => b.sortOrder - a.sortOrder)[0]
    if (!found?.id) throw new Error('创建分组失败')
    return found
  }

  async function renameGroup(groupId: string, name: string) {
    await window.wanwu.rss.renameGroup(groupId, name)
    await loadAll()
  }

  async function deleteGroup(groupId: string) {
    await window.wanwu.rss.deleteGroup(groupId)
    await loadAll()
  }

  async function createFeed(input: RssFeedInput) {
    const feed = await window.wanwu.rss.createFeed(input)
    await loadAll()
    void startAccessibilityProbe()
    return feed
  }

  async function updateFeed(input: RssFeedUpdate) {
    const feed = await window.wanwu.rss.updateFeed(input)
    await loadAll()
    return feed
  }

  async function moveFeed(feedId: string, groupId: string) {
    await window.wanwu.rss.moveFeed(feedId, groupId)
    await loadAll()
  }

  async function softDeleteFeed(feedId: string) {
    await window.wanwu.rss.softDeleteFeed(feedId)
    await loadAll()
  }

  async function restoreFeed(feedId: string) {
    await window.wanwu.rss.restoreFeed(feedId)
    await loadAll()
  }

  async function permanentDeleteFeed(feedId: string) {
    await window.wanwu.rss.permanentDeleteFeed(feedId)
    await loadAll()
  }

  async function emptyRecycleBin() {
    await window.wanwu.rss.emptyRecycleBin()
    await loadAll()
  }

  function getFeed(id: string) {
    return feeds.value.find((f) => f.id === id)
  }

  return {
    groups,
    sidebarGroups,
    feeds,
    entries,
    entryTotal,
    entryOffset,
    error,
    refreshingFeedId,
    probingFeedIds,
    activeFeeds,
    recycleFeeds,
    hasMoreEntries,
    feedsInGroup,
    isFeedRefreshing,
    isFeedProbing,
    cancelPendingRefresh,
    stopAccessibilityProbe,
    startAccessibilityProbe,
    loadAll,
    loadEntries,
    loadMoreEntries,
    refreshFeed,
    createGroup,
    renameGroup,
    deleteGroup,
    createFeed,
    updateFeed,
    moveFeed,
    softDeleteFeed,
    restoreFeed,
    permanentDeleteFeed,
    emptyRecycleBin,
    getFeed
  }
})
