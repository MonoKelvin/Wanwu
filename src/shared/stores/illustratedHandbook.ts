import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category, Item } from '@shared/types/item'

/** 图鉴子模块：条目与分类（IPC 域仍为 library） */
export const useIllustratedHandbookStore = defineStore('illustrated-handbook', () => {
  const categories = ref<Category[]>([])
  const items = ref<Item[]>([])
  const selectedCategoryId = ref<string | null>(null)
  const selectedSubCategoryId = ref<string | null>(null)
  const loading = ref(false)
  const loadedItemsKey = ref<string | null>(null)
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
