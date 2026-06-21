import type { RouteRecordRaw } from 'vue-router'
import { readQuickAccessPayload } from '@shared/types/quickAccess'
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

  registerMainAppIntegration(register) {
    register(() => {
      void import('@modules/rss/styles/rss-theme.css')
    })
  },

  registerQuickAccess(register) {
    register({
      kind: 'rss',
      paletteMeta: { label: 'RSS', icon: 'inbox', order: 40 },
      async open(target, ctx) {
        const payload = readQuickAccessPayload(target)
        const feedId = typeof payload.feedId === 'string' ? payload.feedId : undefined
        if (feedId) {
          await ctx.pushRoute({ name: 'rss', params: { feedId } })
        } else {
          await ctx.pushRoute({ name: 'rss' })
        }
      }
    })
    register({
      kind: 'favorite',
      order: 20,
      async open(target, ctx) {
        const payload = readQuickAccessPayload(target)
        const source = payload.itemSource === 'rss' ? 'rss' : null
        if (source !== 'rss') return false
        const id = (typeof payload.itemId === 'string' ? payload.itemId : undefined) ?? target.id
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
      loadPanel: () => import('@modules/rss/settings/RssSettingsPanel.vue').then((m) => m.default)
    })
  }
}
