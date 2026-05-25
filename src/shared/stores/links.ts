import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LinkBookmark, LinkFolder, LinksSyncResult } from '@shared/types/links'
import type { CatalogNode } from '@library/types/catalog'
import {
  bookmarkMatchesQuery,
  matchingFolderIdsForBookmarks
} from '@features/library/links/linksSearch'

export const EDGE_ROOT_FOLDER_ID = 'edge-microsoft'
export const LINKS_RECYCLE_BIN_ID = 'links-recycle-bin'

function foldersToCatalog(folders: LinkFolder[]): CatalogNode[] {
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    icon: f.isRecycleBin ? 'trash-2' : f.source === 'edge' ? 'globe' : 'folder',
    leaf: !f.children?.length,
    children: f.children?.length ? foldersToCatalog(f.children) : undefined,
    meta: { isRecycleBin: f.isRecycleBin }
  }))
}

export const useLinksStore = defineStore('library-links', () => {
  const folders = ref<LinkFolder[]>([])
  const bookmarks = ref<LinkBookmark[]>([])
  const allBookmarks = ref<LinkBookmark[]>([])
  const searchQuery = ref('')
  const selectedFolderId = ref<string | null>(null)
  const loading = ref(false)
  const globalSearchLoading = ref(false)
  const syncing = ref(false)

  const folderTree = computed<CatalogNode[]>(() => foldersToCatalog(folders.value))

  const isGlobalSearch = computed(() => searchQuery.value.trim().length > 0)

  const globalSearchMatches = computed(() => {
    const q = searchQuery.value.trim()
    if (!q) return []
    return allBookmarks.value.filter((b) => bookmarkMatchesQuery(b, q))
  })

  const matchingFolderIds = computed(() => {
    if (!isGlobalSearch.value) return null
    return matchingFolderIdsForBookmarks(folders.value, globalSearchMatches.value)
  })

  const selectedFolder = computed(() => {
    const id = selectedFolderId.value
    if (!id) return null
    const walk = (list: LinkFolder[]): LinkFolder | null => {
      for (const f of list) {
        if (f.id === id) return f
        if (f.children?.length) {
          const hit = walk(f.children)
          if (hit) return hit
        }
      }
      return null
    }
    return walk(folders.value)
  })

  async function loadFolders() {
    folders.value = await window.wanwu.links.listFolders()
    if (!selectedFolderId.value && folders.value.length) {
      selectedFolderId.value = EDGE_ROOT_FOLDER_ID
    }
  }

  async function loadAllBookmarks() {
    globalSearchLoading.value = true
    try {
      allBookmarks.value = await window.wanwu.links.listAllBookmarks()
    } finally {
      globalSearchLoading.value = false
    }
  }

  async function loadBookmarks(folderId: string, options?: { includeDeleted?: boolean }) {
    loading.value = true
    try {
      bookmarks.value = await window.wanwu.links.listBookmarks({
        folderId,
        includeDeleted: options?.includeDeleted
      })
      selectedFolderId.value = folderId
    } finally {
      loading.value = false
    }
  }

  async function setSearchQuery(query: string) {
    searchQuery.value = query
    if (query.trim()) {
      await loadAllBookmarks()
    }
  }

  async function syncFromBrowser(): Promise<LinksSyncResult> {
    syncing.value = true
    try {
      const result = await window.wanwu.links.sync()
      await loadFolders()
      if (isGlobalSearch.value) {
        await loadAllBookmarks()
      }
      if (selectedFolderId.value) {
        await loadBookmarks(selectedFolderId.value, {
          includeDeleted: selectedFolder.value?.isRecycleBin
        })
      }
      return result
    } finally {
      syncing.value = false
    }
  }

  return {
    folders,
    bookmarks,
    allBookmarks,
    searchQuery,
    folderTree,
    selectedFolderId,
    selectedFolder,
    loading,
    globalSearchLoading,
    syncing,
    isGlobalSearch,
    globalSearchMatches,
    matchingFolderIds,
    loadFolders,
    loadBookmarks,
    loadAllBookmarks,
    setSearchQuery,
    syncFromBrowser
  }
})
