import { useRoute, useRouter } from 'vue-router'
import { isModuleId, modulePathById, type ModuleId } from '@app/config/modules'
import { useAppStore } from '@shared/stores/app'
import { isItemDetailRoute, moduleIdForItemDetailSource } from '@shared/utils/itemDetailRoute'

export type ItemDetailParams = {
  source: string
  id: string
}

/** 打开 / 关闭物品详情：返回路径与浏览器历史栈、主导航切换解耦 */
export function useItemDetailNavigation() {
  const router = useRouter()
  const route = useRoute()
  const appStore = useAppStore()

  function openItemDetail(params: ItemDetailParams, returnPath = route.fullPath) {
    appStore.rememberItemDetailReturn(returnPath)
    return router.push({ name: 'item-detail', params })
  }

  function backFromItemDetail() {
    const owner = moduleIdForItemDetailSource(route.params.source as string | undefined)
    const path =
      appStore.itemDetailReturnPath ?? (owner ? modulePathById(owner) : null)
    if (path) {
      return router.replace(path)
    }
    return router.back()
  }

  return { openItemDetail, backFromItemDetail }
}

/** 路由守卫：仅当从「所属主模块」进入详情时才更新返回路径（避免经侧栏切回详情时覆盖） */
export function shouldRememberItemDetailReturn(
  fromFullPath: string,
  fromName: string | symbol | null | undefined,
  fromModule: unknown,
  toSource: string | undefined
): boolean {
  if (!fromFullPath || isItemDetailRoute(fromName)) return false
  if (!isModuleId(String(fromModule))) return false
  const fromMod = fromModule as ModuleId
  const owner = moduleIdForItemDetailSource(toSource)
  if (!owner) return true
  return fromMod === owner
}
