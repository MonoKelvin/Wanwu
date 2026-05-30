import type { RouteRecordRaw } from 'vue-router'

const caMeta = { module: 'cloud-abode' as const }

export const cloudAbodeChildRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'cloud-abode-dashboard',
    component: () => import('@modules/cloud-abode/views/dashboard/DashboardView.vue'),
    meta: { ...caMeta, title: '云斋' }
  },
  {
    path: 'mall',
    name: 'cloud-abode-mall',
    component: () => import('@modules/cloud-abode/views/mall/MallView.vue'),
    meta: { ...caMeta, title: '商城' }
  },
  {
    path: 'mall/:productId',
    name: 'cloud-abode-mall-detail',
    component: () => import('@modules/cloud-abode/views/mall/MallDetailView.vue'),
    meta: { ...caMeta, title: '商品详情' }
  },
  {
    path: 'showroom/:slug?',
    name: 'cloud-abode-showroom',
    component: () => import('@modules/cloud-abode/views/showroom/ShowroomView.vue'),
    meta: { ...caMeta, title: '展车' }
  },
  {
    path: 'todos',
    name: 'cloud-abode-todos',
    component: () => import('@modules/cloud-abode/views/todo/TodoView.vue'),
    meta: { ...caMeta, title: '任务' }
  },
  {
    path: 'tools',
    name: 'cloud-abode-tools',
    component: () => import('@modules/cloud-abode/views/tools/ToolsView.vue'),
    meta: { ...caMeta, title: '工具' }
  },
  {
    path: 'wallet',
    name: 'cloud-abode-wallet',
    component: () => import('@modules/cloud-abode/views/wallet/WalletView.vue'),
    meta: { ...caMeta, title: '账本' }
  },
  {
    path: 'inventory',
    name: 'cloud-abode-inventory',
    component: () => import('@modules/cloud-abode/views/inventory/InventoryView.vue'),
    meta: { ...caMeta, title: '收藏' }
  }
]
