import { ipcMain } from 'electron'
import type { QuickAccessHit } from '@shared/types/quickAccess'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { MUSIC_MODULE_ID } from '@shared/module-bridge/moduleIds'
import type { DatabaseService } from '../../../../../electron/services/core/database'
import { MusicService } from './service/service'
import type { MusicPlatformQuality } from './service/platform/types'

const QUICK_ACCESS_KIND = 'music'

const PROVIDER_LABEL: Record<string, string> = {
  netease: '网易云',
  kugou: '酷狗',
  verome: 'Verome',
  jamendo: 'Jamendo',
  audius: 'Audius',
  itunes: 'iTunes',
  musicbrainz: 'MusicBrainz',
  kuwo: '酷我',
  local: '本地'
}

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<MusicService>(ctx, MUSIC_MODULE_ID)
}

export const musicMainModule: IMainProcessModule = {
  id: MUSIC_MODULE_ID,
  order: 14,

  initServices(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (!db) return
    setModuleRuntimeService(ctx, MUSIC_MODULE_ID, new MusicService(db, db.getBasePath()))
  },

  onDispose(ctx) {
    getService(ctx)?.close()
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('music:resolveTrack', (_e, { track }: { track: import('@modules/music/domain/types').NormalizedTrack }) => {
      return getService(ctx)?.resolveTrack(track) ?? track
    })
    ipcMain.handle('music:search', (_e, { q, filter }: { q: string; filter?: string }) => {
      return getService(ctx)?.search(q, filter ?? 'songs') ?? { tracks: [], albums: [], artists: [] }
    })
    ipcMain.handle('music:getTrending', () => getService(ctx)?.getTrending() ?? { country: 'China', tracks: [] })
    ipcMain.handle('music:getCharts', () => getService(ctx)?.getCharts() ?? { sections: [] })
    ipcMain.handle('music:getMoods', () => getService(ctx)?.getMoods() ?? [])
    ipcMain.handle('music:getMoodPlaylists', (_e, { categoryId }: { categoryId: string }) => {
      return getService(ctx)?.getMoodPlaylists(categoryId) ?? []
    })
    ipcMain.handle('music:getPlaylistTracks', (_e, { playlistId }: { playlistId: string }) => {
      return getService(ctx)?.getPlaylistTracks(playlistId) ?? []
    })
    ipcMain.handle('music:getForYou', () => getService(ctx)?.getForYouFromHistory() ?? [])
    ipcMain.handle('music:getDiscoverFeed', () =>
      getService(ctx)?.getDiscoverFeed() ?? {
        forYou: [],
        trending: [],
        newReleases: [],
        chartTracks: [],
        chartPlaylists: []
      }
    )
    ipcMain.handle(
      'music:getDiscoverSection',
      (_e, { section }: { section: import('@modules/music/domain/types').DiscoverSectionKey }) =>
        getService(ctx)?.getDiscoverSection(section) ?? []
    )
    ipcMain.handle(
      'music:refreshDiscoverSection',
      (_e, { section }: { section: import('@modules/music/domain/types').DiscoverSectionKey }) =>
        getService(ctx)?.refreshDiscoverSection(section) ?? []
    )
    ipcMain.handle('music:getAlbum', (_e, { browseId }: { browseId: string }) => {
      return getService(ctx)?.getAlbum(browseId) ?? { album: null, tracks: [] }
    })
    ipcMain.handle('music:getArtist', (_e, { browseId }: { browseId: string }) => {
      return (
        getService(ctx)?.getArtist(browseId) ?? {
          name: '',
          tracks: [],
          albums: []
        }
      )
    })
    ipcMain.handle('music:getProviderHealth', () => getService(ctx)?.getProviderHealth() ?? [])
    ipcMain.handle(
      'music:getLyrics',
      (
        _e,
        payload: {
          title: string
          artist: string
          provider?: import('@modules/music/domain/types').NormalizedTrack['provider']
          videoId?: string
          trackKey?: string
        }
      ) => {
        const { title, artist, ...hint } = payload
        return getService(ctx)?.getLyrics(title, artist, hint) ?? {}
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
          track: import('@modules/music/domain/types').NormalizedTrack
          useCache?: boolean
          quality?: MusicPlatformQuality
        }
      ) => getService(ctx)?.resolveStream(track, useCache !== false, quality) ?? { url: '' }
    )
    ipcMain.handle(
      'music:testConnection',
      () => getService(ctx)?.testConnection() ?? { ok: false, baseUrl: '', error: 'Music service unavailable' }
    )
    ipcMain.handle('music:getRadio', (_e, { videoId }: { videoId: string }) => {
      return getService(ctx)?.getRadio(videoId) ?? []
    })
    ipcMain.handle('music:listFavorites', () => getService(ctx)?.listFavorites() ?? [])
    ipcMain.handle('music:isFavorite', (_e, { trackKey }: { trackKey: string }) => {
      return getService(ctx)?.isFavorite(trackKey) ?? false
    })
    ipcMain.handle('music:toggleFavorite', (_e, { track }: { track: import('@modules/music/domain/types').NormalizedTrack }) => {
      return getService(ctx)?.toggleFavorite(track) ?? Promise.resolve(false)
    })
    ipcMain.handle('music:syncPlatformFavorites', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.syncPlatformFavorites(limit) ?? Promise.resolve()
    )
    ipcMain.handle('music:listHistory', (_e, { limit }: { limit?: number }) => {
      return getService(ctx)?.listHistory(limit ?? 50) ?? []
    })
    ipcMain.handle('music:appendHistory', (_e, { track }: { track: import('@modules/music/domain/types').NormalizedTrack }) => {
      getService(ctx)?.appendHistory(track)
    })
    ipcMain.handle('music:clearHistory', () => {
      getService(ctx)?.clearHistory()
    })
    ipcMain.handle('music:neteaseGetLoginStatus', () =>
      getService(ctx)?.neteaseGetLoginStatus() ?? { loggedIn: false, loginType: 'none' }
    )
    ipcMain.handle('music:neteaseLoginQrKey', () => getService(ctx)?.neteaseLoginQrKey())
    ipcMain.handle('music:neteaseLoginQrCheck', (_e, { key }: { key: string }) =>
      getService(ctx)?.neteaseLoginQrCheck(key)
    )
    ipcMain.handle('music:neteaseSendCaptcha', (_e, { phone, countryCode }: { phone: string; countryCode?: number }) =>
      getService(ctx)?.neteaseSendCaptcha(phone, countryCode)
    )
    ipcMain.handle(
      'music:neteaseLoginPhone',
      (_e, { phone, captcha, countryCode }: { phone: string; captcha: string; countryCode?: number }) =>
        getService(ctx)?.neteaseLoginPhone(phone, captcha, countryCode)
    )
    ipcMain.handle('music:neteaseLoginCookie', (_e, { musicU }: { musicU: string }) =>
      getService(ctx)?.neteaseLoginCookie(musicU)
    )
    ipcMain.handle('music:neteaseLogout', () => getService(ctx)?.neteaseLogout())
    ipcMain.handle('music:neteaseRefreshLogin', () => getService(ctx)?.neteaseRefreshLogin())
    ipcMain.handle('music:kugouGetLoginStatus', () =>
      getService(ctx)?.kugouGetLoginStatus() ?? { loggedIn: false, loginType: 'none' }
    )
    ipcMain.handle('music:kugouLoginQrKey', () => getService(ctx)?.kugouLoginQrKey())
    ipcMain.handle('music:kugouLoginQrCheck', (_e, { key }: { key: string }) =>
      getService(ctx)?.kugouLoginQrCheck(key)
    )
    ipcMain.handle('music:kugouSendCaptcha', (_e, { phone, countryCode }: { phone: string; countryCode?: number }) =>
      getService(ctx)?.kugouSendCaptcha(phone, countryCode)
    )
    ipcMain.handle(
      'music:kugouLoginPhone',
      (_e, { phone, captcha, countryCode }: { phone: string; captcha: string; countryCode?: number }) =>
        getService(ctx)?.kugouLoginPhone(phone, captcha, countryCode)
    )
    ipcMain.handle('music:kugouLoginCookie', (_e, { token }: { token: string }) =>
      getService(ctx)?.kugouLoginCookie(token)
    )
    ipcMain.handle('music:kugouLogout', () => getService(ctx)?.kugouLogout())
    ipcMain.handle('music:kugouRefreshLogin', () => getService(ctx)?.kugouRefreshLogin())
    ipcMain.handle('music:neteaseSearchHot', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.neteaseSearchHot(limit) ?? []
    )
    ipcMain.handle('music:searchHot', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.searchHot(limit) ?? []
    )
    ipcMain.handle('music:neteaseSearchSuggest', (_e, { keywords }: { keywords: string }) =>
      getService(ctx)?.neteaseSearchSuggest(keywords) ?? []
    )
    ipcMain.handle('music:searchSuggest', (_e, { keywords }: { keywords: string }) =>
      getService(ctx)?.searchSuggest(keywords) ?? []
    )
    ipcMain.handle('music:neteaseSearchDefault', () => getService(ctx)?.neteaseSearchDefault() ?? '')
    ipcMain.handle('music:searchDefault', () => getService(ctx)?.searchDefault() ?? '')
    ipcMain.handle('music:getDailyRecommend', () => getService(ctx)?.getDailyRecommend() ?? [])
    ipcMain.handle('music:getPersonalFm', () => getService(ctx)?.getPersonalFm() ?? [])
    ipcMain.handle('music:trashPersonalFm', (_e, { songId }: { songId: string }) => {
      void getService(ctx)?.trashPersonalFm(songId)
    })
    ipcMain.handle('music:getNeteaseUserPlaylists', () => getService(ctx)?.getNeteaseUserPlaylists() ?? [])
    ipcMain.handle('music:getNeteaseLikedTracks', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.getNeteaseLikedTracks(limit) ?? []
    )
    ipcMain.handle('music:getNeteaseUserCloud', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.getNeteaseUserCloud(limit) ?? []
    )
    ipcMain.handle('music:getNeteaseArtistList', (_e, { limit, offset }: { limit?: number; offset?: number }) =>
      getService(ctx)?.getNeteaseArtistList(limit, offset) ?? []
    )
    ipcMain.handle('music:getNeteaseNewAlbums', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.getNeteaseNewAlbums(limit) ?? []
    )
    ipcMain.handle('music:getPlatformSessionSnapshot', () =>
      getService(ctx)?.getPlatformSessionSnapshot() ?? { platformId: 'kugou', loginType: 'none' }
    )
    ipcMain.handle('music:getPlatformLoginStatus', () =>
      getService(ctx)?.getPlatformLoginStatus() ?? { loggedIn: false, loginType: 'none' }
    )
    ipcMain.handle('music:getPlatformUserProfile', () =>
      getService(ctx)?.getPlatformUserProfile() ?? { platform: 'kugou', loggedIn: false }
    )
    ipcMain.handle('music:refreshPlatformLogin', () =>
      getService(ctx)?.refreshPlatformLogin() ?? { loggedIn: false, loginType: 'none' }
    )
    ipcMain.handle('music:getPlatformUserPlaylists', () => getService(ctx)?.getPlatformUserPlaylists() ?? [])
    ipcMain.handle('music:getPlatformLikedTracks', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.getPlatformLikedTracks(limit) ?? []
    )
    ipcMain.handle('music:getPlatformUserCloud', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.getPlatformUserCloud(limit) ?? []
    )
    ipcMain.handle(
      'music:getPlatformSubscribed',
      (_e, { kind, limit }: { kind: import('@modules/music/domain/types').MusicPlatformSubscribedKind; limit?: number }) =>
        getService(ctx)?.getPlatformSubscribed(kind, limit) ?? []
    )
    ipcMain.handle('music:platformLoginQrKey', () => getService(ctx)?.platformLoginQrKey())
    ipcMain.handle('music:platformLoginQrCheck', (_e, { key }: { key: string }) =>
      getService(ctx)?.platformLoginQrCheck(key)
    )
    ipcMain.handle('music:platformSendCaptcha', (_e, { phone, countryCode }: { phone: string; countryCode?: number }) =>
      getService(ctx)?.platformSendCaptcha(phone, countryCode)
    )
    ipcMain.handle(
      'music:platformLoginPhone',
      (_e, { phone, captcha, countryCode }: { phone: string; captcha: string; countryCode?: number }) =>
        getService(ctx)?.platformLoginPhone(phone, captcha, countryCode)
    )
    ipcMain.handle('music:platformLoginCookie', (_e, { credential }: { credential: string }) =>
      getService(ctx)?.platformLoginCookie(credential)
    )
    ipcMain.handle('music:platformLogout', () => getService(ctx)?.platformLogout())
    ipcMain.handle('music:platformLikeSong', (_e, { songId, like }: { songId: string; like: boolean }) =>
      getService(ctx)?.platformLikeSong(songId, like)
    )
    ipcMain.handle('music:getNewSongs', (_e, { limit }: { limit?: number }) =>
      getService(ctx)?.getNewSongs(limit) ?? []
    )
    ipcMain.handle('music:getNewAlbums', (_e, { limit, seed }: { limit?: number; seed?: number }) =>
      getService(ctx)?.getNewAlbums(limit, seed) ?? []
    )
    ipcMain.handle('music:getToplists', () => getService(ctx)?.getToplists() ?? [])
    ipcMain.handle('music:getToplistTracks', (_e, { toplistId, limit }: { toplistId: string; limit?: number }) =>
      getService(ctx)?.getToplistTracks(toplistId, limit) ?? []
    )
    ipcMain.handle('music:createPlatformPlaylist', (_e, { name }: { name: string }) =>
      getService(ctx)?.createPlatformPlaylist(name)
    )
    ipcMain.handle('music:deletePlatformPlaylist', (_e, { playlistId }: { playlistId: string }) =>
      getService(ctx)?.deletePlatformPlaylist(playlistId)
    )
    ipcMain.handle(
      'music:addPlatformPlaylistTracks',
      (_e, { playlistId, songIds }: { playlistId: string; songIds: string[] }) =>
        getService(ctx)?.addPlatformPlaylistTracks(playlistId, songIds)
    )
    ipcMain.handle(
      'music:removePlatformPlaylistTracks',
      (_e, { playlistId, songIds }: { playlistId: string; songIds: string[] }) =>
        getService(ctx)?.removePlatformPlaylistTracks(playlistId, songIds)
    )
    ipcMain.handle('music:followPlatformArtist', (_e, { artistId, follow }: { artistId: string; follow: boolean }) =>
      getService(ctx)?.followPlatformArtist(artistId, follow)
    )
    ipcMain.handle('music:getPlatformSongComments', (_e, { songId, page }: { songId: string; page?: number }) =>
      getService(ctx)?.getPlatformSongComments(songId, page) ?? { comments: [], hasMore: false }
    )
    ipcMain.handle('music:getPlatformMvDetail', (_e, { browseId }: { browseId: string }) =>
      getService(ctx)?.getPlatformMvDetail(browseId)
    )
    ipcMain.handle('music:resolvePlatformMvStream', (_e, { mvId }: { mvId: string }) =>
      getService(ctx)?.resolvePlatformMvStream(mvId)
    )
    ipcMain.handle('music:getPlatformRadioCategories', () =>
      getService(ctx)?.getPlatformRadioCategories() ?? []
    )
    ipcMain.handle(
      'music:getPlatformRadioTracks',
      (_e, { categoryId, limit }: { categoryId: string; limit?: number }) =>
        getService(ctx)?.getPlatformRadioTracks(categoryId, limit) ?? []
    )
  },

  getQuickAccessKindLimit() {
    return { kind: QUICK_ACCESS_KIND, limit: 6, order: 55 }
  },

  async searchQuickAccess(ctx, query, limit) {
    const service = getService(ctx)
    if (!service) return []
    const hits: QuickAccessHit[] = []
    const tracks = await service.searchForQuickAccess(query, limit)
    for (const track of tracks) {
      const sourceLabel = PROVIDER_LABEL[track.provider] ?? track.provider
      hits.push({
        kind: QUICK_ACCESS_KIND,
        id: track.trackKey,
        title: track.title,
        subtitle: `${track.artist} · ${sourceLabel}`,
        musicVideoId: track.videoId,
        musicArtist: track.artist,
        musicCoverUrl: track.coverUrl,
        musicProvider: track.provider,
        musicTrackKey: track.trackKey,
        musicPayloadJson: JSON.stringify(track)
      })
    }
    return hits
  }
}
