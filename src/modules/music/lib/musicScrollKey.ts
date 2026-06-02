import type { RouteLocationNormalizedLoaded } from 'vue-router'

/** KeepAlive 页面滚动缓存键：列表页按 route.name，详情页附加 params */
export function musicScrollKey(
  route: RouteLocationNormalizedLoaded,
  override?: string
): string {
  if (override) return override
  const name = String(route.name ?? 'unknown')
  const paramId =
    route.params.browseId ??
    route.params.playlistId ??
    route.params.id
  if (paramId != null && String(paramId).length > 0) {
    return `${name}:${String(paramId)}`
  }
  return name
}
