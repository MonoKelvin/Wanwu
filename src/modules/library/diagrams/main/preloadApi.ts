import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { DIAGRAMS_MODULE_ID } from '@modules/library/diagrams/domain/moduleId'

export const diagramsPreloadModule: IPreloadModule = {
  id: DIAGRAMS_MODULE_ID,
  order: 12,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      diagrams: {
        listFolders: () => ipcRenderer.invoke('diagrams:listFolders'),
        listFiles: (params) => ipcRenderer.invoke('diagrams:listFiles', params),
        listRecentFiles: (params) => ipcRenderer.invoke('diagrams:listRecentFiles', params),
        searchFiles: (params) => ipcRenderer.invoke('diagrams:searchFiles', params),
        countRecycleFiles: () => ipcRenderer.invoke('diagrams:countRecycleFiles'),
        duplicateFile: (params) => ipcRenderer.invoke('diagrams:duplicateFile', params),
        setFilePinned: (params) => ipcRenderer.invoke('diagrams:setFilePinned', params),
        getFileContentPath: (params) => ipcRenderer.invoke('diagrams:getFileContentPath', params),
        readFile: (params) => ipcRenderer.invoke('diagrams:readFile', params),
        writeFile: (params) => ipcRenderer.invoke('diagrams:writeFile', params),
        importDrawio: () => ipcRenderer.invoke('diagrams:importDrawio'),
        importDrawioAndCreate: (params) => ipcRenderer.invoke('diagrams:importDrawioAndCreate', params),
        importWfg: () => ipcRenderer.invoke('diagrams:importWfg'),
        importWfgAndCreate: (params) => ipcRenderer.invoke('diagrams:importWfgAndCreate', params),
        importWfgFromSource: (params) => ipcRenderer.invoke('diagrams:importWfgFromSource', params),
        importNodeAsset: (params) => ipcRenderer.invoke('diagrams:importNodeAsset', params),
        exportWfg: (params) => ipcRenderer.invoke('diagrams:exportWfg', params),
        createFile: (params) => ipcRenderer.invoke('diagrams:createFile', params),
        saveNewWithDialog: (params) => ipcRenderer.invoke('diagrams:saveNewWithDialog', params),
        renameFile: (params) => ipcRenderer.invoke('diagrams:renameFile', params),
        moveFile: (params) => ipcRenderer.invoke('diagrams:moveFile', params),
        softDeleteFile: (params) => ipcRenderer.invoke('diagrams:softDeleteFile', params),
        restoreFile: (params) => ipcRenderer.invoke('diagrams:restoreFile', params),
        purgeFile: (params) => ipcRenderer.invoke('diagrams:purgeFile', params),
        createFolder: (params) => ipcRenderer.invoke('diagrams:createFolder', params),
        renameFolder: (params) => ipcRenderer.invoke('diagrams:renameFolder', params),
        deleteFolder: (params) => ipcRenderer.invoke('diagrams:deleteFolder', params),
        reorderFolders: (params) => ipcRenderer.invoke('diagrams:reorderFolders', params),
        executeCommands: (cmds, options) =>
          ipcRenderer.invoke('diagrams:executeCommands', { cmds, ...options }),
        onRunCommands: (listener) => {
          const handler = (
            _: unknown,
            payload: {
              requestId: string
              cmds: import('@modules/library/diagrams/app/command/domain/types').DiagramCommandEnvelope[]
            }
          ) => listener(payload)
          ipcRenderer.on('diagrams:run-commands', handler)
          return () => ipcRenderer.removeListener('diagrams:run-commands', handler)
        },
        sendRunCommandsResult: (requestId, results) =>
          ipcRenderer.send('diagrams:run-commands-result', { requestId, results })
      }
    }
  }
}
