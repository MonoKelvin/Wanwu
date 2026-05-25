import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LinkBookmark, LinkFolder } from '@shared/types/links'
import type { CatalogNode } from '@library/types/catalog'

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
  const selectedFolderId = ref<string | null>(null)
  const loading = ref(false)
  const syncing = ref(false)

  const folderTree = computed<CatalogNode[]>(() => foldersToCatalog(folders.value))

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

  async function syncFromBrowser() {
    syncing.value = true
    try {
      await window.wanwu.links.sync()
      await loadFolders()
      if (selectedFolderId.value) {
        await loadBookmarks(selectedFolderId.value, {
          includeDeleted: selectedFolder.value?.isRecycleBin
        })
      }
    } finally {
      syncing.value = false
    }
  }

  return {
    folders,
    bookmarks,
    folderTree,
    selectedFolderId,
    selectedFolder,
    loading,
    syncing,
    loadFolders,
    loadBookmarks,
    syncFromBrowser
  }
})
