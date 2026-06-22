import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { PIXEL_ART_MODULE_ID } from '@modules/library/pixel-art/domain/meta'

export const pixelArtPreloadModule: IPreloadModule = {
  id: PIXEL_ART_MODULE_ID,
  order: 14,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      pixelArt: {
        listFolders: () => ipcRenderer.invoke('pixel-art:listFolders'),
        listFiles: (params: { folderId: string }) => ipcRenderer.invoke('pixel-art:listFiles', params),
        listRecentFiles: (params?: { limit?: number }) =>
          ipcRenderer.invoke('pixel-art:listRecentFiles', params),
        searchFiles: (params: { query: string; limit?: number }) =>
          ipcRenderer.invoke('pixel-art:searchFiles', params),
        countRecycleFiles: () => ipcRenderer.invoke('pixel-art:countRecycleFiles'),
        getFileContentPath: (params: { fileId: string }) =>
          ipcRenderer.invoke('pixel-art:getFileContentPath', params),
        readFile: (params: { fileId: string }) => ipcRenderer.invoke('pixel-art:readFile', params),
        writeFile: (params: unknown) => ipcRenderer.invoke('pixel-art:writeFile', params),
        createFile: (params: unknown) => ipcRenderer.invoke('pixel-art:createFile', params),
        renameFile: (params: { fileId: string; title: string }) =>
          ipcRenderer.invoke('pixel-art:renameFile', params),
        softDeleteFile: (params: { fileId: string }) =>
          ipcRenderer.invoke('pixel-art:softDeleteFile', params),
        restoreFile: (params: { fileId: string }) => ipcRenderer.invoke('pixel-art:restoreFile', params),
        purgeFile: (params: { fileId: string }) => ipcRenderer.invoke('pixel-art:purgeFile', params),
        exportImage: (params: unknown) => ipcRenderer.invoke('pixel-art:exportImage', params),
        saveWppWithDialog: (params: unknown) => ipcRenderer.invoke('pixel-art:saveWppWithDialog', params),
        executeCommands: (cmds: unknown, options?: unknown) =>
          ipcRenderer.invoke('pixel-art:executeCommands', { cmds, ...(options as object) })
      }
    }
  }
}
