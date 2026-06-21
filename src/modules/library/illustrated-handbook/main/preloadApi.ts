import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { ILLUSTRATED_HANDBOOK_MODULE_ID } from '@modules/library/illustrated-handbook/domain/moduleId'

export const illustratedHandbookPreloadModule: IPreloadModule = {
  id: ILLUSTRATED_HANDBOOK_MODULE_ID,
  order: 1,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      library: {
        listCategories: () => ipcRenderer.invoke('library:listCategories'),
        listItems: (params) => ipcRenderer.invoke('library:listItems', params),
        searchItems: (params) => ipcRenderer.invoke('library:searchItems', params),
        getItem: (id) => ipcRenderer.invoke('library:getItem', id),
        updateItem: (item) => ipcRenderer.invoke('library:updateItem', item),
        createItem: (item) => ipcRenderer.invoke('library:createItem', item),
        uploadItemImage: (params) => ipcRenderer.invoke('library:uploadItemImage', params)
      }
    }
  }
}
