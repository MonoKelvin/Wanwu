import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PixelFileMeta, PixelFolder } from '@modules/library/pixel-art/domain/types'
import { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'

const repo = new PixelRepositoryIpcAdapter()

export const usePixelArtStore = defineStore('library-pixel-art', () => {
  const folders = ref<PixelFolder[]>([])
  const filesByFolder = ref<Record<string, PixelFileMeta[]>>({})
  const recentFiles = ref<PixelFileMeta[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const recycleBinCount = ref(0)

  async function loadFolders() {
    loading.value = true
    try {
      folders.value = await repo.listFolders()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function loadFiles(folderId: string) {
    const list = await repo.listFiles(folderId)
    filesByFolder.value = { ...filesByFolder.value, [folderId]: list }
    return list
  }

  async function loadRecent(limit = 12) {
    recentFiles.value = await repo.listRecentFiles(limit)
    return recentFiles.value
  }

  async function refreshRecycleCount() {
    recycleBinCount.value = await window.wanwu.pixelArt.countRecycleFiles()
  }

  function folderById(id: string): PixelFolder | undefined {
    return folders.value.find((f) => f.id === id)
  }

  return {
    folders,
    filesByFolder,
    recentFiles,
    loaded,
    loading,
    recycleBinCount,
    loadFolders,
    loadFiles,
    loadRecent,
    refreshRecycleCount,
    folderById
  }
})

export function getPixelArtRepository() {
  return repo
}
