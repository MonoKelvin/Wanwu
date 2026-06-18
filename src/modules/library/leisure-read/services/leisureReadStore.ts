import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buildGenericFavoriteInput,
  buildSnippetFavoriteInput,
  deriveArticleId,
  favoriteToContent
} from '@modules/library/leisure-read/domain/favorites'
import { mergeSnippetRanges, subtractRangeFromRanges } from '@modules/library/leisure-read/domain/snippetRanges'
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

  function syncFavoriteIds(list: LeisureReadFavorite[]) {
    const next = new Set<string>()
    for (const fav of list) {
      if (fav.tab === 'article' && fav.kind === 'full') {
        next.add(favoriteKey('article', fav.articleId ?? fav.contentId))
      } else if (fav.tab !== 'article' || fav.kind !== 'snippet') {
        next.add(favoriteKey(fav.tab, fav.contentId))
      }
    }
    favoriteIds.value = next
  }

  async function loadFavorites(tab?: LeisureReadTabId) {
    favorites.value = await window.wanwu.leisureRead.listFavorites(tab ? { tab } : undefined)
    syncFavoriteIds(favorites.value)
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
      if (!contentByTab.value[tab]) {
        errorByTab.value = {
          ...errorByTab.value,
          [tab]: err instanceof Error ? err.message : 'fetch_failed'
        }
      }
    } finally {
      loadingTab.value = null
    }
  }

  async function next(tab: LeisureReadTabId) {
    await fetchTab(tab, true)
  }

  function isFavorited(content: LeisureReadContent | undefined): boolean {
    if (!content) return false
    if (content.tab === 'article') {
      const articleId = deriveArticleId({
        contentId: content.contentId,
        title: content.title,
        body: content.body
      })
      return favoriteIds.value.has(favoriteKey('article', articleId))
    }
    return favoriteIds.value.has(favoriteKey(content.tab, content.contentId))
  }

  async function toggleFavorite(content: LeisureReadContent) {
    if (content.tab === 'article') {
      const articleId = deriveArticleId({
        contentId: content.contentId,
        title: content.title,
        body: content.body
      })
      const key = favoriteKey('article', articleId)
      if (isFavorited(content)) {
        const existing = favorites.value.find(
          (f) => f.tab === 'article' && f.kind === 'full' && (f.articleId === articleId || f.contentId === articleId)
        )
        if (existing) {
          await window.wanwu.leisureRead.removeFavorite({ id: existing.id })
          const nextIds = new Set(favoriteIds.value)
          nextIds.delete(key)
          favoriteIds.value = nextIds
          favorites.value = favorites.value.filter((f) => f.id !== existing.id)
        }
        return
      }
      const fav = await window.wanwu.leisureRead.addFavorite(buildGenericFavoriteInput(content))
      favoriteIds.value = new Set(favoriteIds.value).add(key)
      favorites.value = [fav, ...favorites.value.filter((f) => f.id !== fav.id)]
      return
    }

    if (isFavorited(content)) {
      const existing = favorites.value.find(
        (f) => f.tab === content.tab && f.contentId === content.contentId
      )
      if (existing) {
        await window.wanwu.leisureRead.removeFavorite({ id: existing.id })
        const nextIds = new Set(favoriteIds.value)
        nextIds.delete(favoriteKey(content.tab, content.contentId))
        favoriteIds.value = nextIds
        favorites.value = favorites.value.filter((f) => f.id !== existing.id)
      }
      return
    }

    const fav = await window.wanwu.leisureRead.addFavorite(buildGenericFavoriteInput(content))
    favoriteIds.value = new Set(favoriteIds.value).add(favoriteKey(content.tab, content.contentId))
    favorites.value = [fav, ...favorites.value.filter((f) => f.id !== fav.id)]
  }

  async function addSnippetFavorite(
    content: LeisureReadContent,
    payload: { text: string; start: number; end: number }
  ) {
    const fav = await window.wanwu.leisureRead.addFavorite(
      buildSnippetFavoriteInput(content, payload.text, {
        start: payload.start,
        end: payload.end,
        text: payload.text
      })
    )
    favorites.value = [fav, ...favorites.value.filter((f) => f.id !== fav.id)]

    const current = contentByTab.value.article
    if (current?.tab === 'article') {
      const articleId = deriveArticleId({
        contentId: current.contentId,
        title: current.title,
        body: current.body
      })
      const favArticleId = fav.articleId ?? deriveArticleId({
        contentId: fav.contentId,
        title: fav.title ?? undefined,
        body: fav.body
      })
      if (articleId === favArticleId) {
        const ranges = mergeSnippetRanges([
          ...(current.highlightRanges ?? []),
          ...(fav.snippetRanges ?? [{ start: payload.start, end: payload.end, text: payload.text }])
        ])
        contentByTab.value = {
          ...contentByTab.value,
          article: { ...current, highlightRanges: ranges }
        }
      }
    }
  }

  async function removeSnippetHighlight(
    content: LeisureReadContent,
    payload: { text: string; start: number; end: number }
  ) {
    const current = contentByTab.value.article
    if (!current || current.tab !== 'article') return

    const articleId = deriveArticleId({
      contentId: current.contentId,
      title: current.title,
      body: current.body
    })
    const baseRanges = current.highlightRanges ?? []
    const newRanges = subtractRangeFromRanges(
      baseRanges,
      current.body,
      payload.start,
      payload.end
    )

    await window.wanwu.leisureRead.updateArticleSnippets({
      articleId,
      body: current.body,
      title: current.title ?? null,
      subtitle: current.subtitle ?? null,
      footer: current.footer ?? null,
      providerId: current.providerId,
      ranges: newRanges
    })

    contentByTab.value = {
      ...contentByTab.value,
      article: {
        ...current,
        highlightRanges: newRanges.length ? newRanges : undefined
      }
    }

    await loadFavorites()
  }

  async function removeFavoriteById(id: string) {
    const target = favorites.value.find((f) => f.id === id)
    await window.wanwu.leisureRead.removeFavorite({ id })
    if (target) {
      const next = new Set(favoriteIds.value)
      if (target.tab === 'article' && target.kind === 'full') {
        next.delete(favoriteKey('article', target.articleId ?? target.contentId))
      } else if (target.kind !== 'snippet') {
        next.delete(favoriteKey(target.tab, target.contentId))
      }
      favoriteIds.value = next
    }
    favorites.value = favorites.value.filter((f) => f.id !== id)
  }

  function openFavorite(favorite: LeisureReadFavorite) {
    const tab = favorite.tab
    activeTab.value = tab
    contentByTab.value = {
      ...contentByTab.value,
      [tab]: favoriteToContent(favorite)
    }
    const nextErrors = { ...errorByTab.value }
    delete nextErrors[tab]
    errorByTab.value = nextErrors
    favoritesOpen.value = false
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
    addSnippetFavorite,
    removeSnippetHighlight,
    removeFavoriteById,
    openFavorite,
    copyText
  }
})
