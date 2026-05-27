import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export function handbookCategoryKey(catId: unknown, subId: unknown): string | null {
  if (typeof catId !== 'string' || !catId) return null
  return typeof subId === 'string' && subId ? `${catId}::${subId}` : catId
}

/**
 * 图鉴列表在物品详情浮层下仍挂载时，全局路由会变成 item-detail；
 * 冻结最后一次图鉴分类参数。
 */
export function useIllustratedHandbookRouteContext() {
  const route = useRoute()
  const frozen = ref<{ catId?: string; subId?: string }>({})

  const isHandbookRoute = computed(
    () => route.name === 'library-illustrated-handbook' || route.meta.major === 'illustrated-handbook'
  )

  watch(
    () => [isHandbookRoute.value, route.params.catId, route.params.subId] as const,
    ([active, catId, subId]) => {
      if (!active) return
      frozen.value = {
        catId: catId as string | undefined,
        subId: subId as string | undefined
      }
    },
    { immediate: true }
  )

  const catId = computed(() =>
    isHandbookRoute.value ?
      (route.params.catId as string | undefined)
    : frozen.value.catId
  )

  const subId = computed(() =>
    isHandbookRoute.value ?
      (route.params.subId as string | undefined)
    : frozen.value.subId
  )

  const categoryKey = computed(() => handbookCategoryKey(catId.value, subId.value))

  return { catId, subId, categoryKey, isHandbookRoute }
}

/** @deprecated */
export const useLibraryRouteContext = useIllustratedHandbookRouteContext
export const libraryCategoryKey = handbookCategoryKey
