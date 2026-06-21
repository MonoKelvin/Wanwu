import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { PERSONAL_MODULE_ID } from '@modules/personal/domain/moduleId'

export const personalPreloadModule: IPreloadModule = {
  id: PERSONAL_MODULE_ID,
  order: 2,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      user: {
        getProfile: () => ipcRenderer.invoke('user:getProfile'),
        updateProfile: (profile) => ipcRenderer.invoke('user:updateProfile', profile),
        saveProfileSync: (profile) => ipcRenderer.sendSync('user:saveProfileSync', profile),
        importProfileImage: (params) => ipcRenderer.invoke('user:importProfileImage', params),
        clearBackground: () => ipcRenderer.invoke('user:clearBackground'),
        listFavorites: () => ipcRenderer.invoke('user:listFavorites'),
        listFavoriteGroups: () => ipcRenderer.invoke('user:listFavoriteGroups'),
        listFavoriteGroupsForPicker: () => ipcRenderer.invoke('user:listFavoriteGroupsForPicker'),
        createFavoriteGroup: (name) => ipcRenderer.invoke('user:createFavoriteGroup', name),
        isFavorite: (params) => ipcRenderer.invoke('user:isFavorite', params),
        addFavorite: (params) => ipcRenderer.invoke('user:addFavorite', params),
        removeFavorite: (params) => ipcRenderer.invoke('user:removeFavorite', params),
        toggleFavorite: (params) => ipcRenderer.invoke('user:toggleFavorite', params),
        onFavoritesChanged: (listener: () => void) => {
          const handler = () => listener()
          ipcRenderer.on('user:favorites-changed', handler)
          return () => {
            ipcRenderer.removeListener('user:favorites-changed', handler)
          }
        },
        isLiked: (params) => ipcRenderer.invoke('user:isLiked', params),
        addLike: (params) => ipcRenderer.invoke('user:addLike', params),
        removeLike: (params) => ipcRenderer.invoke('user:removeLike', params)
      }
    }
  }
}
