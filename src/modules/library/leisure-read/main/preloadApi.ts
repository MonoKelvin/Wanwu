import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { LEISURE_READ_MODULE_ID } from '@shared/module-bridge/moduleIds'
import type {
  LeisureReadFavoriteInput,
  LeisureReadTabId
} from '@modules/library/leisure-read/domain/types'

export const leisureReadPreloadModule: IPreloadModule = {
  id: LEISURE_READ_MODULE_ID,
  order: 5,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      leisureRead: {
        fetch: (params: { tab: LeisureReadTabId }) => ipcRenderer.invoke('leisureRead:fetch', params),
        listFavorites: (params?: { tab?: LeisureReadTabId }) =>
          ipcRenderer.invoke('leisureRead:listFavorites', params),
        addFavorite: (input: LeisureReadFavoriteInput) =>
          ipcRenderer.invoke('leisureRead:addFavorite', input),
        removeFavorite: (params: { id: string }) =>
          ipcRenderer.invoke('leisureRead:removeFavorite', params),
        isFavorite: (params: { tab: LeisureReadTabId; contentId: string }) =>
          ipcRenderer.invoke('leisureRead:isFavorite', params),
        searchFavorites: (params: { query: string; limit?: number }) =>
          ipcRenderer.invoke('leisureRead:searchFavorites', params)
      }
    }
  }
}
