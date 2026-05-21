import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export function libraryCategoryKey(catId: unknown, subId: unknown): string | null {
  if (typeof catId !== 'string' || !catId) return null
  return typeof subId === 'string' && subId ? `${catId}::${subId}` : catId
}

/**
 * 全库列表在物品详情浮层下仍挂载时，全局路由会变成 item-detail；
 * 冻结最后一次全库分类参数，避免底层列表被空状态替换并丢失滚动。
 */
export function useLibraryRouteContext() {
  const route = useRoute()
  const frozen = ref<{ catId?: string; subId?: string }>({})

  watch(
    () => [route.meta.module, route.params.catId, route.params.subId] as const,
    ([mod, catId, subId]) => {
      if (mod !== 'library') return
      frozen.value = {
        catId: catId as string | undefined,
        subId: subId as string | undefined
      }
    },
    { immediate: true }
  )

  const isLibraryRoute = computed(() => route.meta.module === 'library')

  const catId = computed(() =>
    isLibraryRoute.value ?
      (route.params.catId as string | undefined)
    : frozen.value.catId
  )

  const subId = computed(() =>
    isLibraryRoute.value ?
      (route.params.subId as string | undefined)
    : frozen.value.subId
  )

  const categoryKey = computed(() => libraryCategoryKey(catId.value, subId.value))

  return { catId, subId, categoryKey, isLibraryRoute }
}
