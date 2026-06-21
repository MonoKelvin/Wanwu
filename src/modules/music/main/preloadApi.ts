import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { MUSIC_MODULE_ID } from '@modules/music/domain/moduleId'

export const musicPreloadModule: IPreloadModule = {
  id: MUSIC_MODULE_ID,
  order: 14,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      music: {
        search: (q, filter) => ipcRenderer.invoke('music:search', { q, filter }),
        resolveTrack: (track) => ipcRenderer.invoke('music:resolveTrack', { track }),
        getTrending: () => ipcRenderer.invoke('music:getTrending'),
        getCharts: () => ipcRenderer.invoke('music:getCharts'),
        getMoods: () => ipcRenderer.invoke('music:getMoods'),
        getMoodPlaylists: (categoryId) => ipcRenderer.invoke('music:getMoodPlaylists', { categoryId }),
        getPlaylistTracks: (playlistId) => ipcRenderer.invoke('music:getPlaylistTracks', { playlistId }),
        getForYou: () => ipcRenderer.invoke('music:getForYou'),
        getDiscoverFeed: () => ipcRenderer.invoke('music:getDiscoverFeed'),
        getDiscoverSection: (section) => ipcRenderer.invoke('music:getDiscoverSection', { section }),
        refreshDiscoverSection: (section) =>
          ipcRenderer.invoke('music:refreshDiscoverSection', { section }),
        getAlbum: (browseId) => ipcRenderer.invoke('music:getAlbum', { browseId }),
        getArtist: (browseId) => ipcRenderer.invoke('music:getArtist', { browseId }),
        getProviderHealth: () => ipcRenderer.invoke('music:getProviderHealth'),
        getLyrics: (title, artist, hint) =>
          ipcRenderer.invoke('music:getLyrics', { title, artist, ...hint }),
        resolveStream: (track, useCache, quality) =>
          ipcRenderer.invoke('music:resolveStream', { track, useCache, quality }),
        testConnection: () => ipcRenderer.invoke('music:testConnection'),
        getRadio: (videoId) => ipcRenderer.invoke('music:getRadio', { videoId }),
        listFavorites: () => ipcRenderer.invoke('music:listFavorites'),
        isFavorite: (trackKey) => ipcRenderer.invoke('music:isFavorite', { trackKey }),
        toggleFavorite: (track) => ipcRenderer.invoke('music:toggleFavorite', { track }),
        syncPlatformFavorites: (limit?: number) =>
          ipcRenderer.invoke('music:syncPlatformFavorites', { limit }),
        listHistory: (limit) => ipcRenderer.invoke('music:listHistory', { limit }),
        appendHistory: (track) => ipcRenderer.invoke('music:appendHistory', { track }),
        clearHistory: () => ipcRenderer.invoke('music:clearHistory'),
        neteaseGetLoginStatus: () => ipcRenderer.invoke('music:neteaseGetLoginStatus'),
        neteaseLoginQrKey: () => ipcRenderer.invoke('music:neteaseLoginQrKey'),
        neteaseLoginQrCheck: (key: string) => ipcRenderer.invoke('music:neteaseLoginQrCheck', { key }),
        neteaseSendCaptcha: (phone: string, countryCode?: number) =>
          ipcRenderer.invoke('music:neteaseSendCaptcha', { phone, countryCode }),
        neteaseLoginPhone: (phone: string, captcha: string, countryCode?: number) =>
          ipcRenderer.invoke('music:neteaseLoginPhone', { phone, captcha, countryCode }),
        neteaseLoginCookie: (musicU: string) => ipcRenderer.invoke('music:neteaseLoginCookie', { musicU }),
        neteaseLogout: () => ipcRenderer.invoke('music:neteaseLogout'),
        neteaseRefreshLogin: () => ipcRenderer.invoke('music:neteaseRefreshLogin'),
        kugouGetLoginStatus: () => ipcRenderer.invoke('music:kugouGetLoginStatus'),
        kugouLoginQrKey: () => ipcRenderer.invoke('music:kugouLoginQrKey'),
        kugouLoginQrCheck: (key: string) => ipcRenderer.invoke('music:kugouLoginQrCheck', { key }),
        kugouSendCaptcha: (phone: string, countryCode?: number) =>
          ipcRenderer.invoke('music:kugouSendCaptcha', { phone, countryCode }),
        kugouLoginPhone: (phone: string, captcha: string, countryCode?: number) =>
          ipcRenderer.invoke('music:kugouLoginPhone', { phone, captcha, countryCode }),
        kugouLoginCookie: (token: string) => ipcRenderer.invoke('music:kugouLoginCookie', { token }),
        kugouLogout: () => ipcRenderer.invoke('music:kugouLogout'),
        kugouRefreshLogin: () => ipcRenderer.invoke('music:kugouRefreshLogin'),
        neteaseSearchHot: (limit?: number) => ipcRenderer.invoke('music:neteaseSearchHot', { limit }),
        searchHot: (limit?: number) => ipcRenderer.invoke('music:searchHot', { limit }),
        neteaseSearchSuggest: (keywords: string) =>
          ipcRenderer.invoke('music:neteaseSearchSuggest', { keywords }),
        searchSuggest: (keywords: string) => ipcRenderer.invoke('music:searchSuggest', { keywords }),
        neteaseSearchDefault: () => ipcRenderer.invoke('music:neteaseSearchDefault'),
        searchDefault: () => ipcRenderer.invoke('music:searchDefault'),
        getDailyRecommend: () => ipcRenderer.invoke('music:getDailyRecommend'),
        getPersonalFm: () => ipcRenderer.invoke('music:getPersonalFm'),
        trashPersonalFm: (songId: string) => ipcRenderer.invoke('music:trashPersonalFm', { songId }),
        getNeteaseUserPlaylists: () => ipcRenderer.invoke('music:getNeteaseUserPlaylists'),
        getNeteaseLikedTracks: (limit?: number) => ipcRenderer.invoke('music:getNeteaseLikedTracks', { limit }),
        getNeteaseUserCloud: (limit?: number) => ipcRenderer.invoke('music:getNeteaseUserCloud', { limit }),
        getNeteaseArtistList: (limit?: number, offset?: number) =>
          ipcRenderer.invoke('music:getNeteaseArtistList', { limit, offset }),
        getNeteaseNewAlbums: (limit?: number) => ipcRenderer.invoke('music:getNeteaseNewAlbums', { limit }),
        getPlatformSessionSnapshot: () => ipcRenderer.invoke('music:getPlatformSessionSnapshot'),
        getPlatformLoginStatus: () => ipcRenderer.invoke('music:getPlatformLoginStatus'),
        getPlatformUserProfile: () => ipcRenderer.invoke('music:getPlatformUserProfile'),
        refreshPlatformLogin: () => ipcRenderer.invoke('music:refreshPlatformLogin'),
        getPlatformUserPlaylists: () => ipcRenderer.invoke('music:getPlatformUserPlaylists'),
        getPlatformLikedTracks: (limit?: number) => ipcRenderer.invoke('music:getPlatformLikedTracks', { limit }),
        getPlatformUserCloud: (limit?: number) => ipcRenderer.invoke('music:getPlatformUserCloud', { limit }),
        getPlatformSubscribed: (kind, limit?: number) =>
          ipcRenderer.invoke('music:getPlatformSubscribed', { kind, limit }),
        platformLoginQrKey: () => ipcRenderer.invoke('music:platformLoginQrKey'),
        platformLoginQrCheck: (key: string) => ipcRenderer.invoke('music:platformLoginQrCheck', { key }),
        platformSendCaptcha: (phone: string, countryCode?: number) =>
          ipcRenderer.invoke('music:platformSendCaptcha', { phone, countryCode }),
        platformLoginPhone: (phone: string, captcha: string, countryCode?: number) =>
          ipcRenderer.invoke('music:platformLoginPhone', { phone, captcha, countryCode }),
        platformLoginCookie: (credential: string) =>
          ipcRenderer.invoke('music:platformLoginCookie', { credential }),
        platformLogout: () => ipcRenderer.invoke('music:platformLogout'),
        platformLikeSong: (songId: string, like: boolean) =>
          ipcRenderer.invoke('music:platformLikeSong', { songId, like }),
        getNewSongs: (limit?: number) => ipcRenderer.invoke('music:getNewSongs', { limit }),
        getNewAlbums: (limit?: number, seed?: number) =>
          ipcRenderer.invoke('music:getNewAlbums', { limit, seed }),
        getToplists: () => ipcRenderer.invoke('music:getToplists'),
        getToplistTracks: (toplistId: string, limit?: number) =>
          ipcRenderer.invoke('music:getToplistTracks', { toplistId, limit }),
        createPlatformPlaylist: (name: string) =>
          ipcRenderer.invoke('music:createPlatformPlaylist', { name }),
        deletePlatformPlaylist: (playlistId: string) =>
          ipcRenderer.invoke('music:deletePlatformPlaylist', { playlistId }),
        addPlatformPlaylistTracks: (playlistId: string, songIds: string[]) =>
          ipcRenderer.invoke('music:addPlatformPlaylistTracks', { playlistId, songIds }),
        removePlatformPlaylistTracks: (playlistId: string, songIds: string[]) =>
          ipcRenderer.invoke('music:removePlatformPlaylistTracks', { playlistId, songIds }),
        followPlatformArtist: (artistId: string, follow: boolean) =>
          ipcRenderer.invoke('music:followPlatformArtist', { artistId, follow }),
        getPlatformSongComments: (songId: string, page?: number) =>
          ipcRenderer.invoke('music:getPlatformSongComments', { songId, page }),
        getPlatformMvDetail: (browseId: string) =>
          ipcRenderer.invoke('music:getPlatformMvDetail', { browseId }),
        resolvePlatformMvStream: (mvId: string) =>
          ipcRenderer.invoke('music:resolvePlatformMvStream', { mvId }),
        getPlatformRadioCategories: () => ipcRenderer.invoke('music:getPlatformRadioCategories'),
        getPlatformRadioTracks: (categoryId: string, limit?: number) =>
          ipcRenderer.invoke('music:getPlatformRadioTracks', { categoryId, limit })
      }
    }
  }
}
