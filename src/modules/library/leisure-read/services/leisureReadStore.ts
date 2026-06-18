import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  LeisureReadContent,
  LeisureReadFavorite,
  LeisureReadTabId
} from '@modules/library/leisure-read/domain/types'

export const useLeisureReadStore = defineStore('leisureRead', () => {
  const activeTab = ref<LeisureReadTabId>('quote')
  const contentByTab = ref<Partial<Record<LeisureReadTabId, LeisureReadContent>>>({})
  const loadingTab = ref<LeisureReadTabId | null>(null)
  const errorByTab = ref<Partial<Record<LeisureReadTabId, string>>>({})
  const favoriteIds = ref<Set<string>>(new Set())
  const favoritesOpen = ref(false)
  const favorites = ref<LeisureReadFavorite[]>([])

  function favoriteKey(tab: LeisureReadTabId, contentId: string) {
    return `${tab}:${contentId}`
  }

  async function loadFavorites(tab?: LeisureReadTabId) {
    favorites.value = await window.wanwu.leisureRead.listFavorites(tab ? { tab } : undefined)
    favoriteIds.value = new Set(favorites.value.map((f) => favoriteKey(f.tab, f.contentId)))
  }

  async function fetchTab(tab: LeisureReadTabId, force = false) {
    if (!force && contentByTab.value[tab] && !errorByTab.value[tab]) return
    loadingTab.value = tab
    const nextErrors = { ...errorByTab.value }
    delete nextErrors[tab]
    errorByTab.value = nextErrors
    try {
      const content = await window.wanwu.leisureRead.fetch({ tab })
      contentByTab.value = { ...contentByTab.value, [tab]: content }
    } catch (err) {
      errorByTab.value = {
        ...errorByTab.value,
        [tab]: err instanceof Error ? err.message : 'fetch_failed'
      }
    } finally {
      loadingTab.value = null
    }
  }

  async function next(tab: LeisureReadTabId) {
    const nextContent = { ...contentByTab.value }
    delete nextContent[tab]
    contentByTab.value = nextContent
    await fetchTab(tab, true)
  }

  function isFavorited(content: LeisureReadContent | undefined): boolean {
    if (!content) return false
    return favoriteIds.value.has(favoriteKey(content.tab, content.contentId))
  }

  async function toggleFavorite(content: LeisureReadContent) {
    if (isFavorited(content)) {
      const existing = favorites.value.find(
        (f) => f.tab === content.tab && f.contentId === content.contentId
      )
      if (existing) {
        await window.wanwu.leisureRead.removeFavorite({ id: existing.id })
        const next = new Set(favoriteIds.value)
        next.delete(favoriteKey(content.tab, content.contentId))
        favoriteIds.value = next
        favorites.value = favorites.value.filter((f) => f.id !== existing.id)
      }
      return
    }
    const fav = await window.wanwu.leisureRead.addFavorite({
      tab: content.tab,
      contentId: content.contentId,
      title: content.title,
      body: content.body,
      subtitle: content.subtitle,
      footer: content.footer,
      providerId: content.providerId
    })
    favoriteIds.value = new Set(favoriteIds.value).add(favoriteKey(content.tab, content.contentId))
    favorites.value = [fav, ...favorites.value.filter((f) => f.id !== fav.id)]
  }

  async function removeFavoriteById(id: string) {
    const target = favorites.value.find((f) => f.id === id)
    await window.wanwu.leisureRead.removeFavorite({ id })
    if (target) {
      const next = new Set(favoriteIds.value)
      next.delete(favoriteKey(target.tab, target.contentId))
      favoriteIds.value = next
    }
    favorites.value = favorites.value.filter((f) => f.id !== id)
  }

  function copyText(content: LeisureReadContent): string {
    const parts = [content.title, content.subtitle, content.body, content.footer].filter(Boolean)
    return parts.join('\n\n')
  }

  return {
    activeTab,
    contentByTab,
    loadingTab,
    errorByTab,
    favoritesOpen,
    favorites,
    loadFavorites,
    fetchTab,
    next,
    isFavorited,
    toggleFavorite,
    removeFavoriteById,
    copyText
  }
})
