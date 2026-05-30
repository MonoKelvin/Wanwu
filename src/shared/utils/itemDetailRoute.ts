import { isModuleId, type ModuleId } from '@app/config/modules'

/** 条目详情 `params.source` 对应左侧主模块（如全库条目为 `library`） */
export function moduleIdForItemDetailSource(source: string | undefined): ModuleId | undefined {
  if (!source) return undefined
  if (isModuleId(source)) return source
  return undefined
}

export function isItemDetailRoute(routeName: string | symbol | null | undefined): boolean {
  return routeName === 'item-detail'
}
