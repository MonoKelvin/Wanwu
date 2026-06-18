import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { mvPageActive } from '@modules/music/lib/musicMvOverlayState'
import { MUSIC_CHILD_ROUTES, MUSIC_RETURN_ROUTE_NAMES } from '@modules/music/app/musicRoutes'
import type { NormalizedTrack } from '@modules/music/domain/types'

export const musicAppModule: IAppModule = {
  id: 'wanwu.music',
  moduleId: 'music',

  getModuleNav() {
    return {
      moduleId: 'music',
      label: '音乐',
      icon: 'disc-3',
      path: '/music',
      order: 30
    }
  },

  loadShellView() {
    return import('@modules/music/MusicView.vue').then((m) => m.default)
  },

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/music',
        component: () => import('@modules/music/MusicView.vue'),
        meta: { module: 'music', title: '音乐' },
        children: MUSIC_CHILD_ROUTES
      }
    ]
  },

  registerShellChrome(register) {
    register({
      id: 'wanwu.music.minibar',
      transitionName: 'ww-music-minibar',
      shouldShow({ routeModule, isFullscreen }) {
        return routeModule === 'music' && !isFullscreen && !mvPageActive.value
      },
      loadComponent: () => import('@modules/music/player/MusicMiniBar.vue').then((m) => m.default)
    })
  },

  registerMainAppIntegration(register) {
    register(() => {
      void import('@modules/music/styles/music-shell-chrome.css')
    })
  },

  registerPathMemory(register) {
    register({
      id: 'wanwu.music.return',
      beforeEach(to, from) {
        if (to.meta.module !== 'music' || from.meta.module !== 'music') return
        if (typeof to.query.returnTo === 'string' && to.query.returnTo.length > 0) return
        if (typeof to.name !== 'string') return
        if (!MUSIC_RETURN_ROUTE_NAMES.has(to.name)) return
        if (from.fullPath === to.fullPath) return
        return {
          name: to.name ?? undefined,
          params: to.params,
          query: { ...to.query, returnTo: from.fullPath },
          hash: to.hash
        }
      }
    })
  },

  registerQuickAccess(register) {
    register({
      kind: 'music',
      paletteMeta: { label: '音乐', icon: 'disc-3', order: 50 },
      async open(target, ctx) {
        let track: NormalizedTrack | null = null
        if (target.musicPayloadJson) {
          try {
            track = JSON.parse(target.musicPayloadJson) as NormalizedTrack
          } catch {
            track = null
          }
        }
        await ctx.pushRoute({ name: 'music-discover' })
        await ctx.afterRouteReady()
        if (track) {
          const { useMusicPlayerStore } = await import('@modules/music/stores/musicPlayer')
          void useMusicPlayerStore().playTrack(track)
        } else {
          const { useMusicSearch } = await import('@modules/music/composables/useMusicSearch')
          useMusicSearch().requestFocus()
        }
      }
    })
  },

  registerSettingsSection(register) {
    register({
      id: 'music',
      label: '音乐',
      icon: 'disc-3',
      order: 40,
      loadPanel: () => import('@modules/music/settings/MusicSettingsPanel.vue').then((m) => m.default)
    })
  }
}
