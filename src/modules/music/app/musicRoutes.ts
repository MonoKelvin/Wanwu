import type { RouteRecordRaw } from 'vue-router'

export const MUSIC_CHILD_ROUTES: RouteRecordRaw[] = [
  { path: '', redirect: { name: 'music-discover' } },
  {
    path: 'discover',
    name: 'music-discover',
    component: () => import('@modules/music/views/MusicDiscoverView.vue'),
    meta: { module: 'music', title: '发现' }
  },
  {
    path: 'categories',
    name: 'music-categories',
    component: () => import('@modules/music/views/MusicCategoriesView.vue'),
    meta: { module: 'music', title: '分类' }
  },
  {
    path: 'mine',
    name: 'music-mine',
    component: () => import('@modules/music/views/MusicMineView.vue'),
    meta: { module: 'music', title: '我的' }
  },
  { path: 'search', redirect: { name: 'music-discover' } },
  { path: 'favorites', redirect: { name: 'music-mine', query: { tab: 'favorites' } } },
  { path: 'history', redirect: { name: 'music-mine', query: { tab: 'history' } } },
  {
    path: 'mood/:categoryId',
    name: 'music-mood',
    component: () => import('@modules/music/views/MusicMoodPlaylistsView.vue'),
    meta: { module: 'music', title: '分类' }
  },
  {
    path: 'album/:browseId',
    name: 'music-album',
    component: () => import('@modules/music/views/MusicAlbumView.vue'),
    meta: { module: 'music', title: '专辑' }
  },
  {
    path: 'artist/:browseId',
    name: 'music-artist',
    component: () => import('@modules/music/views/MusicArtistView.vue'),
    meta: { module: 'music', title: '歌手' }
  },
  {
    path: 'playlist/:playlistId',
    name: 'music-playlist',
    component: () => import('@modules/music/views/MusicPlaylistView.vue'),
    meta: { module: 'music', title: '歌单' }
  },
  {
    path: 'daily',
    name: 'music-daily',
    component: () => import('@modules/music/views/MusicDailyView.vue'),
    meta: { module: 'music', title: '日推', needLogin: true }
  },
  {
    path: 'fm',
    name: 'music-fm',
    component: () => import('@modules/music/views/MusicFmView.vue'),
    meta: { module: 'music', title: '私人 FM', needLogin: true }
  },
  {
    path: 'charts',
    name: 'music-charts',
    component: () => import('@modules/music/views/MusicChartsView.vue'),
    meta: { module: 'music', title: '排行榜' }
  },
  {
    path: 'toplist/:browseId',
    name: 'music-toplist',
    component: () => import('@modules/music/views/MusicToplistView.vue'),
    meta: { module: 'music', title: '榜单' }
  },
  {
    path: 'new',
    name: 'music-new',
    component: () => import('@modules/music/views/MusicNewView.vue'),
    meta: { module: 'music', title: '新歌新碟' }
  },
  {
    path: 'artists',
    name: 'music-artists',
    component: () => import('@modules/music/views/MusicArtistsView.vue'),
    meta: { module: 'music', title: '歌手' }
  },
  {
    path: 'radio',
    name: 'music-radio',
    component: () => import('@modules/music/views/MusicRadioView.vue'),
    meta: { module: 'music', title: '场景电台' }
  },
  {
    path: 'radio/:categoryId',
    name: 'music-radio-tracks',
    component: () => import('@modules/music/views/MusicRadioTracksView.vue'),
    meta: { module: 'music', title: '电台' }
  },
  {
    path: 'video/:browseId',
    name: 'music-video',
    component: () => import('@modules/music/views/MusicVideoView.vue'),
    meta: { module: 'music', title: 'MV' }
  },
  {
    path: 'cloud',
    name: 'music-cloud',
    component: () => import('@modules/music/views/MusicCloudView.vue'),
    meta: { module: 'music', title: '云盘', needLogin: true }
  },
  {
    path: 'player',
    name: 'music-player',
    component: () => import('@modules/music/player/MusicPlayerPage.vue'),
    meta: { module: 'music', title: '播放器', fullscreen: true }
  }
]

export const MUSIC_RETURN_ROUTE_NAMES = new Set([
  'music-album',
  'music-artist',
  'music-playlist',
  'music-toplist',
  'music-video',
  'music-radio-tracks'
])
