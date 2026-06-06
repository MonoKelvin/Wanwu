import { ipcMain } from 'electron'
import type { AppServices } from '../types'

export function registerMusicHandlers(services: AppServices): void {
  ipcMain.handle('music:resolveTrack', (_e, { track }: { track: import('../../../src/shared/types/music').NormalizedTrack }) => {
    return services.music?.resolveTrack(track) ?? track
  })
  ipcMain.handle('music:search', (_e, { q, filter }: { q: string; filter?: string }) => {
    return services.music?.search(q, filter ?? 'songs') ?? { tracks: [], albums: [], artists: [] }
  })
  ipcMain.handle('music:getTrending', () => services.music?.getTrending() ?? { country: 'China', tracks: [] })
  ipcMain.handle('music:getCharts', () => services.music?.getCharts() ?? { sections: [] })
  ipcMain.handle('music:getMoods', () => services.music?.getMoods() ?? [])
  ipcMain.handle('music:getMoodPlaylists', (_e, { categoryId }: { categoryId: string }) => {
    return services.music?.getMoodPlaylists(categoryId) ?? []
  })
  ipcMain.handle('music:getPlaylistTracks', (_e, { playlistId }: { playlistId: string }) => {
    return services.music?.getPlaylistTracks(playlistId) ?? []
  })
  ipcMain.handle('music:getForYou', () => services.music?.getForYouFromHistory() ?? [])
  ipcMain.handle('music:getDiscoverFeed', () =>
    services.music?.getDiscoverFeed() ?? {
      forYou: [],
      trending: [],
      newReleases: [],
      chartTracks: [],
      chartPlaylists: []
    }
  )
  ipcMain.handle(
    'music:getDiscoverSection',
    (_e, { section }: { section: import('../../../src/shared/types/music').DiscoverSectionKey }) =>
      services.music?.getDiscoverSection(section) ?? []
  )
  ipcMain.handle(
    'music:refreshDiscoverSection',
    (_e, { section }: { section: import('../../../src/shared/types/music').DiscoverSectionKey }) =>
      services.music?.refreshDiscoverSection(section) ?? []
  )
  ipcMain.handle('music:getAlbum', (_e, { browseId }: { browseId: string }) => {
    return services.music?.getAlbum(browseId) ?? { album: null, tracks: [] }
  })
  ipcMain.handle('music:getArtist', (_e, { browseId }: { browseId: string }) => {
    return (
      services.music?.getArtist(browseId) ?? {
        name: '',
        tracks: [],
        albums: []
      }
    )
  })
  ipcMain.handle('music:getProviderHealth', () => services.music?.getProviderHealth() ?? [])
  ipcMain.handle(
    'music:getLyrics',
    (
      _e,
      payload: {
        title: string
        artist: string
        provider?: import('../../../src/shared/types/music').NormalizedTrack['provider']
        videoId?: string
        trackKey?: string
      }
    ) => {
      const { title, artist, ...hint } = payload
      return services.music?.getLyrics(title, artist, hint) ?? {}
    }
  )
  ipcMain.handle(
    'music:resolveStream',
    (
      _e,
      {
        track,
        useCache,
        quality
      }: {
        track: import('../../../src/shared/types/music').NormalizedTrack
        useCache?: boolean
        quality?: import('../../services/music/platform/types').MusicPlatformQuality
      }
    ) => services.music?.resolveStream(track, useCache !== false, quality) ?? { url: '' }
  )
  ipcMain.handle('music:testConnection', () => services.music?.testConnection() ?? { ok: false, baseUrl: '', error: 'Music service unavailable' })
  ipcMain.handle('music:getRadio', (_e, { videoId }: { videoId: string }) => {
    return services.music?.getRadio(videoId) ?? []
  })
  ipcMain.handle('music:listFavorites', () => services.music?.listFavorites() ?? [])
  ipcMain.handle('music:isFavorite', (_e, { trackKey }: { trackKey: string }) => {
    return services.music?.isFavorite(trackKey) ?? false
  })
  ipcMain.handle('music:toggleFavorite', (_e, { track }: { track: import('../../../src/shared/types/music').NormalizedTrack }) => {
    return services.music?.toggleFavorite(track) ?? Promise.resolve(false)
  })
  ipcMain.handle('music:syncPlatformFavorites', (_e, { limit }: { limit?: number }) =>
    services.music?.syncPlatformFavorites(limit) ?? Promise.resolve()
  )
  ipcMain.handle('music:listHistory', (_e, { limit }: { limit?: number }) => {
    return services.music?.listHistory(limit ?? 50) ?? []
  })
  ipcMain.handle('music:appendHistory', (_e, { track }: { track: import('../../../src/shared/types/music').NormalizedTrack }) => {
    services.music?.appendHistory(track)
  })
  ipcMain.handle('music:clearHistory', () => {
    services.music?.clearHistory()
  })
  ipcMain.handle('music:neteaseGetLoginStatus', () => services.music?.neteaseGetLoginStatus() ?? { loggedIn: false, loginType: 'none' })
  ipcMain.handle('music:neteaseLoginQrKey', () => services.music?.neteaseLoginQrKey())
  ipcMain.handle('music:neteaseLoginQrCheck', (_e, { key }: { key: string }) => services.music?.neteaseLoginQrCheck(key))
  ipcMain.handle('music:neteaseSendCaptcha', (_e, { phone, countryCode }: { phone: string; countryCode?: number }) =>
    services.music?.neteaseSendCaptcha(phone, countryCode)
  )
  ipcMain.handle(
    'music:neteaseLoginPhone',
    (_e, { phone, captcha, countryCode }: { phone: string; captcha: string; countryCode?: number }) =>
      services.music?.neteaseLoginPhone(phone, captcha, countryCode)
  )
  ipcMain.handle('music:neteaseLoginCookie', (_e, { musicU }: { musicU: string }) =>
    services.music?.neteaseLoginCookie(musicU)
  )
  ipcMain.handle('music:neteaseLogout', () => services.music?.neteaseLogout())
  ipcMain.handle('music:neteaseRefreshLogin', () => services.music?.neteaseRefreshLogin())
  ipcMain.handle('music:kugouGetLoginStatus', () =>
    services.music?.kugouGetLoginStatus() ?? { loggedIn: false, loginType: 'none' }
  )
  ipcMain.handle('music:kugouLoginQrKey', () => services.music?.kugouLoginQrKey())
  ipcMain.handle('music:kugouLoginQrCheck', (_e, { key }: { key: string }) => services.music?.kugouLoginQrCheck(key))
  ipcMain.handle('music:kugouSendCaptcha', (_e, { phone, countryCode }: { phone: string; countryCode?: number }) =>
    services.music?.kugouSendCaptcha(phone, countryCode)
  )
  ipcMain.handle(
    'music:kugouLoginPhone',
    (_e, { phone, captcha, countryCode }: { phone: string; captcha: string; countryCode?: number }) =>
      services.music?.kugouLoginPhone(phone, captcha, countryCode)
  )
  ipcMain.handle('music:kugouLoginCookie', (_e, { token }: { token: string }) =>
    services.music?.kugouLoginCookie(token)
  )
  ipcMain.handle('music:kugouLogout', () => services.music?.kugouLogout())
  ipcMain.handle('music:kugouRefreshLogin', () => services.music?.kugouRefreshLogin())
  ipcMain.handle('music:neteaseSearchHot', (_e, { limit }: { limit?: number }) =>
    services.music?.neteaseSearchHot(limit) ?? []
  )
  ipcMain.handle('music:searchHot', (_e, { limit }: { limit?: number }) =>
    services.music?.searchHot(limit) ?? []
  )
  ipcMain.handle('music:neteaseSearchSuggest', (_e, { keywords }: { keywords: string }) =>
    services.music?.neteaseSearchSuggest(keywords) ?? []
  )
  ipcMain.handle('music:searchSuggest', (_e, { keywords }: { keywords: string }) =>
    services.music?.searchSuggest(keywords) ?? []
  )
  ipcMain.handle('music:neteaseSearchDefault', () => services.music?.neteaseSearchDefault() ?? '')
  ipcMain.handle('music:searchDefault', () => services.music?.searchDefault() ?? '')
  ipcMain.handle('music:getDailyRecommend', () => services.music?.getDailyRecommend() ?? [])
  ipcMain.handle('music:getPersonalFm', () => services.music?.getPersonalFm() ?? [])
  ipcMain.handle('music:trashPersonalFm', (_e, { songId }: { songId: string }) => {
    void services.music?.trashPersonalFm(songId)
  })
  ipcMain.handle('music:getNeteaseUserPlaylists', () => services.music?.getNeteaseUserPlaylists() ?? [])
  ipcMain.handle('music:getNeteaseLikedTracks', (_e, { limit }: { limit?: number }) =>
    services.music?.getNeteaseLikedTracks(limit) ?? []
  )
  ipcMain.handle('music:getNeteaseUserCloud', (_e, { limit }: { limit?: number }) =>
    services.music?.getNeteaseUserCloud(limit) ?? []
  )
  ipcMain.handle('music:getNeteaseArtistList', (_e, { limit, offset }: { limit?: number; offset?: number }) =>
    services.music?.getNeteaseArtistList(limit, offset) ?? []
  )
  ipcMain.handle('music:getNeteaseNewAlbums', (_e, { limit }: { limit?: number }) =>
    services.music?.getNeteaseNewAlbums(limit) ?? []
  )
  ipcMain.handle('music:getPlatformSessionSnapshot', () =>
    services.music?.getPlatformSessionSnapshot() ?? { platformId: 'kugou', loginType: 'none' }
  )
  ipcMain.handle('music:getPlatformLoginStatus', () =>
    services.music?.getPlatformLoginStatus() ?? { loggedIn: false, loginType: 'none' }
  )
  ipcMain.handle('music:getPlatformUserProfile', () =>
    services.music?.getPlatformUserProfile() ?? { platform: 'kugou', loggedIn: false }
  )
  ipcMain.handle('music:refreshPlatformLogin', () =>
    services.music?.refreshPlatformLogin() ?? { loggedIn: false, loginType: 'none' }
  )
  ipcMain.handle('music:getPlatformUserPlaylists', () => services.music?.getPlatformUserPlaylists() ?? [])
  ipcMain.handle('music:getPlatformLikedTracks', (_e, { limit }: { limit?: number }) =>
    services.music?.getPlatformLikedTracks(limit) ?? []
  )
  ipcMain.handle('music:getPlatformUserCloud', (_e, { limit }: { limit?: number }) =>
    services.music?.getPlatformUserCloud(limit) ?? []
  )
  ipcMain.handle(
    'music:getPlatformSubscribed',
    (_e, { kind, limit }: { kind: import('../../../src/shared/types/music').MusicPlatformSubscribedKind; limit?: number }) =>
      services.music?.getPlatformSubscribed(kind, limit) ?? []
  )
  ipcMain.handle('music:platformLoginQrKey', () => services.music?.platformLoginQrKey())
  ipcMain.handle('music:platformLoginQrCheck', (_e, { key }: { key: string }) =>
    services.music?.platformLoginQrCheck(key)
  )
  ipcMain.handle('music:platformSendCaptcha', (_e, { phone, countryCode }: { phone: string; countryCode?: number }) =>
    services.music?.platformSendCaptcha(phone, countryCode)
  )
  ipcMain.handle(
    'music:platformLoginPhone',
    (_e, { phone, captcha, countryCode }: { phone: string; captcha: string; countryCode?: number }) =>
      services.music?.platformLoginPhone(phone, captcha, countryCode)
  )
  ipcMain.handle('music:platformLoginCookie', (_e, { credential }: { credential: string }) =>
    services.music?.platformLoginCookie(credential)
  )
  ipcMain.handle('music:platformLogout', () => services.music?.platformLogout())
  ipcMain.handle('music:platformLikeSong', (_e, { songId, like }: { songId: string; like: boolean }) =>
    services.music?.platformLikeSong(songId, like)
  )
  ipcMain.handle('music:getNewSongs', (_e, { limit }: { limit?: number }) =>
    services.music?.getNewSongs(limit) ?? []
  )
  ipcMain.handle('music:getNewAlbums', (_e, { limit, seed }: { limit?: number; seed?: number }) =>
    services.music?.getNewAlbums(limit, seed) ?? []
  )
  ipcMain.handle('music:getToplists', () => services.music?.getToplists() ?? [])
  ipcMain.handle('music:getToplistTracks', (_e, { toplistId, limit }: { toplistId: string; limit?: number }) =>
    services.music?.getToplistTracks(toplistId, limit) ?? []
  )
  ipcMain.handle('music:createPlatformPlaylist', (_e, { name }: { name: string }) =>
    services.music?.createPlatformPlaylist(name)
  )
  ipcMain.handle('music:deletePlatformPlaylist', (_e, { playlistId }: { playlistId: string }) =>
    services.music?.deletePlatformPlaylist(playlistId)
  )
  ipcMain.handle(
    'music:addPlatformPlaylistTracks',
    (_e, { playlistId, songIds }: { playlistId: string; songIds: string[] }) =>
      services.music?.addPlatformPlaylistTracks(playlistId, songIds)
  )
  ipcMain.handle(
    'music:removePlatformPlaylistTracks',
    (_e, { playlistId, songIds }: { playlistId: string; songIds: string[] }) =>
      services.music?.removePlatformPlaylistTracks(playlistId, songIds)
  )
  ipcMain.handle('music:followPlatformArtist', (_e, { artistId, follow }: { artistId: string; follow: boolean }) =>
    services.music?.followPlatformArtist(artistId, follow)
  )
  ipcMain.handle('music:getPlatformSongComments', (_e, { songId, page }: { songId: string; page?: number }) =>
    services.music?.getPlatformSongComments(songId, page) ?? { comments: [], hasMore: false }
  )
  ipcMain.handle('music:getPlatformMvDetail', (_e, { browseId }: { browseId: string }) =>
    services.music?.getPlatformMvDetail(browseId)
  )
  ipcMain.handle('music:resolvePlatformMvStream', (_e, { mvId }: { mvId: string }) =>
    services.music?.resolvePlatformMvStream(mvId)
  )
  ipcMain.handle('music:getPlatformRadioCategories', () =>
    services.music?.getPlatformRadioCategories() ?? []
  )
  ipcMain.handle('music:getPlatformRadioTracks', (_e, { categoryId, limit }: { categoryId: string; limit?: number }) =>
    services.music?.getPlatformRadioTracks(categoryId, limit) ?? []
  )
}
