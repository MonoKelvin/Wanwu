import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category, Item } from '@shared/types/item'

export const useLibraryStore = defineStore('library', () => {
  const categories = ref<Category[]>([])
  const items = ref<Item[]>([])
  const selectedCategoryId = ref<string | null>(null)
  const selectedSubCategoryId = ref<string | null>(null)
  const loading = ref(false)
  /** 当前 items 对应的分类键，用于避免从详情返回时重复拉取 */
  const loadedItemsKey = ref<string | null>(null)
  /** 各分类列表滚动位置（跨模块切换、详情浮层时保留） */
  const listScrollByCategory = ref<Record<string, number>>({})

  function rememberListScroll(categoryKey: string, scrollTop: number) {
    if (!categoryKey) return
    const prev = listScrollByCategory.value[categoryKey]
    if (scrollTop <= 0 && prev != null) return
    listScrollByCategory.value = { ...listScrollByCategory.value, [categoryKey]: scrollTop }
  }

  function listScrollTop(categoryKey: string | null): number | undefined {
    if (!categoryKey) return undefined
    return listScrollByCategory.value[categoryKey]
  }

  function categoryItemsKey(categoryId: string, subCategoryId?: string) {
    return subCategoryId ? `${categoryId}::${subCategoryId}` : categoryId
  }

  async function loadCategories() {
    categories.value = await window.wanwu.library.listCategories()
  }

  async function loadItems(
    categoryId: string,
    subCategoryId?: string,
    options?: { force?: boolean }
  ) {
    const key = categoryItemsKey(categoryId, subCategoryId)
    if (!options?.force && loadedItemsKey.value === key) {
      selectedCategoryId.value = categoryId
      selectedSubCategoryId.value = subCategoryId ?? null
      return
    }

    loading.value = true
    try {
      items.value = await window.wanwu.library.listItems({ categoryId, subCategoryId })
      loadedItemsKey.value = key
      selectedCategoryId.value = categoryId
      selectedSubCategoryId.value = subCategoryId ?? null
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    items,
    selectedCategoryId,
    selectedSubCategoryId,
    loading,
    loadedItemsKey,
    listScrollByCategory,
    rememberListScroll,
    listScrollTop,
    loadCategories,
    loadItems
  }
})
