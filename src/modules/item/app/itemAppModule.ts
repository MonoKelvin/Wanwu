import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'

export const itemAppModule: IAppModule = {
  id: 'wanwu.item',

  loadItemDetailView() {
    return import('@modules/item/ItemDetailView.vue').then((m) => m.default)
  },

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/item/:source/:id',
        name: 'item-detail',
        component: () => import('@modules/item/ItemDetailView.vue'),
        meta: { fullscreen: true }
      }
    ]
  }
}
