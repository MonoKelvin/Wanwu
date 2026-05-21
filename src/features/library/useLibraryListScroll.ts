import { nextTick, onActivated, onDeactivated, watch, type Ref } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import type { useLibraryRouteContext } from '@features/library/useLibraryRouteContext'
import { useLibraryStore } from '@shared/stores/library'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

/** 全库列表滚动位置记忆（进入物品详情、切换模块后返回时恢复） */
export function useLibraryListScroll(
  pageRoot: Ref<HTMLElement | null>,
  routeCtx: ReturnType<typeof useLibraryRouteContext>
) {
  const route = useRoute()
  const libraryStore = useLibraryStore()

  function scrollElement(): HTMLElement | null {
    return pageRoot.value?.querySelector<HTMLElement>('.ww-scroll-main') ?? null
  }

  function save() {
    const key = routeCtx.categoryKey.value
    const el = scrollElement()
    if (!key || !el) return
    libraryStore.rememberListScroll(key, el.scrollTop)
  }

  function restore() {
    const key = routeCtx.categoryKey.value
    const el = scrollElement()
    if (!key || !el) return
    const top = libraryStore.listScrollTop(key)
    if (top == null) return

    const apply = () => {
      el.scrollTop = top
    }
    void nextTick(() => {
      apply()
      requestAnimationFrame(() => {
        apply()
        requestAnimationFrame(() => {
          apply()
          setTimeout(apply, 0)
        })
      })
    })
  }

  onDeactivated(save)
  onActivated(() => {
    restore()
  })
  onBeforeRouteLeave(() => {
    save()
  })

  watch(
    () => route.name,
    (name, prev) => {
      if (isItemDetailRoute(prev) && name !== 'item-detail') {
        save()
      }
      if (isItemDetailRoute(prev) && routeCtx.isLibraryRoute.value) {
        restore()
      }
    }
  )

  return { save, restore }
}
