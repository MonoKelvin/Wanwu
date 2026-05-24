<template>
  <div class="product-detail h-full overflow-auto p-6">
    <div class="mx-auto max-w-3xl">
      <RouterLink to="/cloud-abode/products" class="mb-4 inline-block text-sm text-ww-accent hover:underline">
        ← 返回商品列表
      </RouterLink>

      <div v-if="loading" class="py-12 text-center text-gray-500">加载中...</div>

      <div v-else-if="!product" class="py-12 text-center text-gray-500">商品不存在</div>

      <div v-else class="overflow-hidden rounded-lg bg-white shadow-md">
        <div class="flex aspect-video items-center justify-center bg-gray-100">
          <img
            v-if="product.imageUrl"
            :src="product.imageUrl"
            :alt="product.name"
            class="h-full w-full object-cover"
          />
          <span v-else class="text-gray-400">暂无图片</span>
        </div>
        <div class="p-6">
          <h1 class="mb-4 text-2xl font-bold">{{ product.name }}</h1>
          <p class="mb-6 text-gray-600">{{ product.description }}</p>
          <div class="flex items-center justify-between">
            <span class="text-3xl font-bold text-red-600">¥{{ product.price }}</span>
            <span class="text-gray-500">库存: {{ product.stock }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getProductById } from '@/api/product'
import type { Product } from '@/types/product'

defineOptions({ name: 'ProductDetailView' })

const route = useRoute()
const product = ref<Product | null>(null)
const loading = ref(false)

async function loadProduct(id: number) {
  loading.value = true
  product.value = null
  try {
    const res = await getProductById(id)
    if (res.code === 200 && res.data) product.value = res.data
  } catch (error) {
    console.error('加载商品详情失败:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  (id) => {
    const num = parseInt(String(id), 10)
    if (!isNaN(num)) void loadProduct(num)
  },
  { immediate: true }
)
</script>
