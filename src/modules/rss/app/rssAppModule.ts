import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'

export const rssAppModule: IAppModule = {
  id: 'wanwu.rss',
  moduleId: 'rss',

  getModuleNav() {
    return {
      moduleId: 'rss',
      label: 'RSS',
      icon: 'globe',
      path: '/rss',
      order: 20
    }
  },

  loadShellView() {
    return import('@modules/rss/RssView.vue').then((m) => m.default)
  },

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/rss/:feedId?',
        name: 'rss',
        component: () => import('@modules/rss/RssView.vue'),
        meta: { module: 'rss', title: 'RSS' }
      }
    ]
  },

  registerSubPanel(register) {
    register({
      moduleId: 'rss',
      loadComponent: () => import('@modules/rss/RssSidebar.vue').then((m) => m.default)
    })
  },

  registerQuickAccess(register) {
    register({
      kind: 'rss',
      paletteMeta: { label: 'RSS', icon: 'inbox', order: 40 },
      async open(target, ctx) {
        if (target.feedId) {
          await ctx.pushRoute({ name: 'rss', params: { feedId: target.feedId } })
        } else {
          await ctx.pushRoute({ name: 'rss' })
        }
      }
    })
    register({
      kind: 'favorite',
      order: 20,
      async open(target, ctx) {
        const source = target.itemSource ?? 'library'
        if (source !== 'rss') return false
        const id = target.itemId ?? target.id
        if (!id) return false
        await ctx.pushRoute({ name: 'rss' })
        await ctx.afterRouteReady()
        const { useItemDetailNavigation } = await import('@app/composables/useItemDetailNavigation')
        const { openItemDetail } = useItemDetailNavigation()
        await openItemDetail({ source, id })
      }
    })
  },

  registerSettingsSection(register) {
    register({
      id: 'rss',
      label: 'RSS',
      icon: 'globe',
      order: 30,
      loadPanel: () => import('@modules/settings/sections/SettingsRssSection.vue').then((m) => m.default)
    })
  }
}
