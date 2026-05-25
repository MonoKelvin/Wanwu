import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { findLinkFolder } from '@features/library/links/linksFolderTree'
import type { LinkBookmark, LinkFolder, LinksSyncResult } from '@shared/types/links'
import type { CatalogNode } from '@library/types/catalog'
import {
  bookmarkMatchesQuery,
  matchingFolderIdsForBookmarks
} from '@features/library/links/linksSearch'

export const EDGE_ROOT_FOLDER_ID = 'edge-microsoft'
export const LINKS_RECYCLE_BIN_ID = 'links-recycle-bin'
export const LOCAL_COLLECTIONS_ROOT_ID = 'local-collections'

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
  const recycleBinCount = ref(0)

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

  async function refreshRecycleBinCount() {
    const list = await window.wanwu.links.listBookmarks({
      folderId: LINKS_RECYCLE_BIN_ID,
      includeDeleted: true
    })
    recycleBinCount.value = list.length
  }

  async function loadFolders() {
    folders.value = await window.wanwu.links.listFolders()
    if (!selectedFolderId.value && folders.value.length) {
      selectedFolderId.value = EDGE_ROOT_FOLDER_ID
    }
    await refreshRecycleBinCount()
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
      if (folderId === LINKS_RECYCLE_BIN_ID) {
        recycleBinCount.value = bookmarks.value.length
      }
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

  async function deleteLocalFolder(folderId: string, moveBookmarksToRoot: boolean): Promise<void> {
    await window.wanwu.links.deleteFolder({ folderId, moveBookmarksToRoot })
    await loadFolders()
    if (isGlobalSearch.value) {
      await loadAllBookmarks()
    } else if (selectedFolderId.value) {
      await loadBookmarks(selectedFolderId.value, {
        includeDeleted: selectedFolder.value?.isRecycleBin
      })
    }
    await refreshRecycleBinCount()
  }

  async function createLocalFolder(parentId: string, name: string): Promise<LinkFolder> {
    const trimmed = name.trim()
    const created = await window.wanwu.links.createFolder({ parentId, name: trimmed })
    await loadFolders()

    if (created?.id) return created

    const parent = findLinkFolder(folders.value, parentId)
    const hit = parent?.children?.find(
      (f) => f.name === trimmed && f.source === 'local' && !f.isRecycleBin
    )
    if (hit) return hit

    throw new Error('目录已写入，但未能读取新目录信息，请刷新后重试')
  }

  async function syncFromBrowser(): Promise<LinksSyncResult> {
    syncing.value = true
    try {
      const result = await window.wanwu.links.syncFromBrowser()
      await refreshAfterSync()
      return result
    } finally {
      syncing.value = false
    }
  }

  async function syncToBrowser(): Promise<LinksSyncResult> {
    syncing.value = true
    try {
      const result = await window.wanwu.links.syncToBrowser()
      await refreshAfterSync()
      return result
    } finally {
      syncing.value = false
    }
  }

  async function refreshAfterSync() {
    await loadFolders()
    if (isGlobalSearch.value) {
      await loadAllBookmarks()
    }
    if (selectedFolderId.value) {
      await loadBookmarks(selectedFolderId.value, {
        includeDeleted: selectedFolder.value?.isRecycleBin
      })
    }
  }

  async function persistBookmarkOrder(folderId: string, orderedIds: string[]) {
    await window.wanwu.links.reorderBookmarks({ folderId, orderedIds })
    await loadBookmarks(folderId, {
      includeDeleted: selectedFolder.value?.isRecycleBin
    })
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
    recycleBinCount,
    isGlobalSearch,
    globalSearchMatches,
    matchingFolderIds,
    loadFolders,
    refreshRecycleBinCount,
    loadBookmarks,
    loadAllBookmarks,
    setSearchQuery,
    createLocalFolder,
    deleteLocalFolder,
    syncFromBrowser,
    syncToBrowser,
    persistBookmarkOrder
  }
})
