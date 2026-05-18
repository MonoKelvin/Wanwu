import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category, Item } from '@shared/types/item'

export const useCustomStore = defineStore('custom', () => {
  const categories = ref<Category[]>([])
  const items = ref<Item[]>([])
  const loading = ref(false)

  async function loadCategories() {
    categories.value = await window.wanwu.custom.listCategories()
  }

  async function loadItems(categoryId: string) {
    loading.value = true
    try {
      items.value = await window.wanwu.custom.listItems({ categoryId })
    } finally {
      loading.value = false
    }
  }

  return { categories, items, loading, loadCategories, loadItems }
})
