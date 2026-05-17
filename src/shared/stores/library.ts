import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category, Item } from '@shared/types/item'

export const useLibraryStore = defineStore('library', () => {
  const categories = ref<Category[]>([])
  const items = ref<Item[]>([])
  const selectedCategoryId = ref<string | null>(null)
  const selectedSubCategoryId = ref<string | null>(null)
  const loading = ref(false)

  async function loadCategories() {
    categories.value = await window.wanwu.library.listCategories()
  }

  async function loadItems(categoryId: string, subCategoryId?: string) {
    loading.value = true
    try {
      items.value = await window.wanwu.library.listItems({ categoryId, subCategoryId })
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
    loadCategories,
    loadItems
  }
})
