import { createRouter, createWebHashHistory } from 'vue-router'
import { setupModulePathMemory } from '@app/router/moduleMemory'
import { setupShellNavigationHooks } from '@app/composables/shellNavigation'
// import { CLOUD_ABODE_ENABLED } from '@app/config/modules'
// import { cloudAbodeChildRoutes } from '@modules/cloud-abode/router'
import { useSettingsStore } from '@shared/stores/settings'
import { resolveStartupPath } from '@shared/utils/startupModule'
import { isLibraryMajorId } from '@modules/library/core/config/majors'

/** 便笺由 AppShell 直接挂载（含 Tiptap），此处仅占位以保持路由 meta/名称 */
const ROUTE_OUTLET_SHELL = { template: '<div />' }

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'root',
      beforeEnter: async () => {
        const store = useSettingsStore()
        if (!store.loaded) await store.load()
        return { path: resolveStartupPath(store.settings), replace: true }
      },
      component: { template: '<div />' }
    },
    {
      path: '/library/:legacyCat/:legacySub?',
      redirect: (to) => {
        const cat = String(to.params.legacyCat ?? '')
        if (isLibraryMajorId(cat)) {
          if (cat === 'notes') {
            return { path: '/notes' }
          }
          if (cat === 'links') {
            return {
              name: 'library-links',
              params: { folderId: to.params.legacySub as string | undefined }
            }
          }
          if (cat === 'diagrams') {
            const sub = to.params.legacySub as string | undefined
            if (!sub) return { name: 'library-diagrams-home' }
            return { name: 'library-diagrams-folder', params: { folderId: sub } }
          }
          return {
            name: 'library-illustrated-handbook',
            params: {
              catId: to.params.legacySub as string | undefined,
              subId: undefined
            }
          }
        }
        const sub = to.params.legacySub as string | undefined
        return {
          name: 'library-illustrated-handbook',
          params: { catId: cat, subId: sub }
        }
      }
    },
    {
      path: '/notes',
      name: 'library-notes',
      component: ROUTE_OUTLET_SHELL,
      meta: { module: 'library', major: 'notes', title: '便笺' }
    },
    {
      path: '/diagrams/edit/:fileId',
      name: 'library-diagrams-editor',
      component: ROUTE_OUTLET_SHELL,
      meta: {
        module: 'library',
        major: 'diagrams',
        title: '流程图编辑器',
        hideSubPanel: true
      }
    },
    {
      path: '/library/diagrams/edit/:fileId',
      redirect: (to) => ({
        name: 'library-diagrams-editor',
        params: { fileId: to.params.fileId as string },
        query: to.query
      })
    },
    {
      path: '/library',
      component: () => import('@modules/library/LibraryShellView.vue'),
      meta: { module: 'library', title: '全库' },
      children: [
        {
          path: '',
          redirect: { name: 'library-notes' }
        },
        {
          path: 'notes',
          redirect: { path: '/notes', replace: true }
        },
        {
          path: 'links/:folderId?',
          name: 'library-links',
          component: () => import('@modules/library/links/views/LinksView.vue'),
          meta: { module: 'library', major: 'links', title: '链接' }
        },
        {
          path: 'diagrams',
          name: 'library-diagrams-home',
          component: () => import('@modules/library/diagrams/views/DiagramHomeView.vue'),
          meta: { module: 'library', major: 'diagrams', title: '流程图' }
        },
        {
          path: 'diagrams/f/:folderId',
          name: 'library-diagrams-folder',
          component: () => import('@modules/library/diagrams/views/DiagramFileListView.vue'),
          meta: { module: 'library', major: 'diagrams', title: '流程图' }
        },
        {
          path: 'illustrated-handbook/:catId?/:subId?',
          name: 'library-illustrated-handbook',
          component: () =>
            import('@modules/library/illustrated-handbook/views/IllustratedHandbookView.vue'),
          meta: { module: 'library', major: 'illustrated-handbook', title: '图鉴' }
        }
      ]
    },
    {
      path: '/rss/:feedId?',
      name: 'rss',
      component: () => import('@modules/rss/RssView.vue'),
      meta: { module: 'rss', title: 'RSS' }
    },
    {
      path: '/music',
      component: () => import('@modules/music/MusicView.vue'),
      meta: { module: 'music', title: '音乐' },
      children: [
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
    },
    /* 云斋模块暂下线（GLSL 构建未就绪）
    {
      path: '/cloud-abode',
      beforeEnter: () => {
        if (!CLOUD_ABODE_ENABLED) {
          return { path: '/library', replace: true }
        }
      },
      component: () => import('@modules/cloud-abode/CloudAbodeView.vue'),
      meta: { module: 'cloud-abode', title: '云斋' },
      children: cloudAbodeChildRoutes
    },
    */
    {
      path: '/personal',
      name: 'personal',
      component: () => import('@modules/personal/PersonalView.vue'),
      meta: { module: 'personal', title: '个人' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@modules/settings/SettingsView.vue'),
      meta: { module: 'settings', title: '设置' }
    },
    {
      path: '/item/:source/:id',
      name: 'item-detail',
      component: () => import('@modules/item/ItemDetailView.vue'),
      meta: { fullscreen: true }
    },
    {
      path: '/note-popout/:noteId',
      name: 'note-popout',
      component: () => import('@modules/library/notes/views/NotePopoutView.vue'),
      meta: { notePopout: true }
    },
    {
      path: '/daily-widget',
      name: 'daily-widget',
      component: () => import('@modules/quick-access/DailyWidgetView.vue'),
      meta: { dailyWidget: true }
    },
    {
      path: '/tray-menu',
      name: 'tray-menu',
      component: () => import('@modules/quick-access/TrayMenuView.vue'),
      meta: { trayMenu: true }
    }
  ]
})

setupModulePathMemory(router)
setupShellNavigationHooks(router)

export default router
