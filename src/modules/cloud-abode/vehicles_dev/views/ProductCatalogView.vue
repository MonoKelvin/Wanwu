<template>
  <div class="product-catalog h-full flex flex-col overflow-auto p-6">
    <div class="max-w-7xl mx-auto w-full">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-3xl font-bold">云斋 · 商品</h1>
        <RouterLink to="/cloud-abode" class="text-sm text-ww-accent hover:underline">
          返回云斋
        </RouterLink>
      </div>

      <div v-if="loading" class="py-12 text-center text-gray-500">加载中...</div>

      <div v-else-if="products.length === 0" class="py-12 text-center text-gray-500">暂无商品</div>

      <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div
          v-for="product in products"
          :key="product.id"
          class="cursor-pointer overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
          @click="goToDetail(product.id)"
        >
          <div class="flex aspect-square items-center justify-center bg-gray-100">
            <img
              v-if="product.imageUrl"
              :src="product.imageUrl"
              :alt="product.name"
              class="h-full w-full object-cover"
            />
            <span v-else class="text-gray-400">暂无图片</span>
          </div>
          <div class="p-4">
            <h3 class="mb-2 truncate text-lg font-semibold">{{ product.name }}</h3>
            <p class="mb-2 line-clamp-2 text-sm text-gray-600">{{ product.description }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xl font-bold text-red-600">¥{{ product.price }}</span>
              <span class="text-sm text-gray-500">库存: {{ product.stock }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAllProducts } from '@/api/product'
import type { Product } from '@/types/product'

defineOptions({ name: 'ProductCatalogView' })

const router = useRouter()
const products = ref<Product[]>([])
const loading = ref(false)

async function loadProducts() {
  loading.value = true
  try {
    const res = await getAllProducts()
    if (res.code === 200 && res.data) products.value = res.data
  } catch (error) {
    console.error('加载商品失败:', error)
  } finally {
    loading.value = false
  }
}

function goToDetail(id: number) {
  void router.push({ name: 'product-detail', params: { id: String(id) } })
}

onMounted(() => {
  void loadProducts()
})
</script>
