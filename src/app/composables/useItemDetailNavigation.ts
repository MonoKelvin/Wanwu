import { useRoute, useRouter } from 'vue-router'
import { isModuleId, modulePathById, type ModuleId } from '@app/config/modules'
import { useAppStore } from '@shared/stores/app'
import {
  isItemDetailPath,
  isItemDetailRoute,
  moduleIdForItemDetailSource
} from '@shared/utils/itemDetailRoute'

export type ItemDetailParams = {
  source: string
  id: string
}

/** 详情页返回路径：不可为详情自身，否则返回无效（如日签/托盘直达） */
function resolveModuleReturnPath(owner: ModuleId, candidate: string | null | undefined): string {
  const store = useAppStore()
  const fallback = modulePathById(owner)
  if (!candidate || isItemDetailPath(candidate) || candidate === '') {
    const remembered = store.pathForModule(owner)
    return isItemDetailPath(remembered) ? fallback : remembered
  }
  return candidate
}

/** 打开 / 关闭物品详情：返回路径与浏览器历史栈、主导航切换解耦 */
export function useItemDetailNavigation() {
  const router = useRouter()
  const route = useRoute()
  const appStore = useAppStore()

  function openItemDetail(params: ItemDetailParams, returnPath?: string) {
    const owner = moduleIdForItemDetailSource(params.source) ?? 'library'
    const raw =
      returnPath ??
      (isItemDetailRoute(route.name) ? undefined : route.fullPath)
    const resolved = resolveModuleReturnPath(owner, raw)
    appStore.rememberItemDetailReturn(resolved)
    return router.push({ name: 'item-detail', params })
  }

  function backFromItemDetail() {
    const owner = moduleIdForItemDetailSource(route.params.source as string | undefined) ?? 'library'
    let path = resolveModuleReturnPath(owner, appStore.itemDetailReturnPath)
    if (path === route.fullPath) {
      path = modulePathById(owner)
    }
    return router.replace(path)
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
