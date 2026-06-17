import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DiagramFileMeta, DiagramFolder } from '@modules/library/diagrams/domain/types'
import { DiagramRepositoryIpcAdapter } from '@modules/library/diagrams/services/DiagramRepositoryIpcAdapter'
import { createDiagramCommandBus } from '@modules/library/diagrams/app/command/createDiagramCommandBus'
import { setDiagramCatalogCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const repo = new DiagramRepositoryIpcAdapter()

export const useDiagramsStore = defineStore('library-diagrams', () => {
  const folders = ref<DiagramFolder[]>([])
  const filesByFolder = ref<Record<string, DiagramFileMeta[]>>({})
  const recentFiles = ref<DiagramFileMeta[]>([])
  const loaded = ref(false)
  const loading = ref(false)

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

  const recycleBinCount = ref(0)

  async function refreshRecycleCount() {
    recycleBinCount.value = await window.wanwu.diagrams.countRecycleFiles()
  }

  function folderById(id: string): DiagramFolder | undefined {
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

/** 列表/首页命令总线（仅 file/folder，无 Session） */
export function initDiagramCatalogCommandBus() {
  const bus = createDiagramCommandBus({
    getSession: () => null,
    repo
  })
  setDiagramCatalogCommandBus(bus)
  return bus
}
