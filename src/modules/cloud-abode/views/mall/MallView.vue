<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CaProduct, ProductCategory } from '@shared/types/cloud-abode'
import CaPageLayout from '@modules/cloud-abode/components/CaPageLayout.vue'
import CaCategoryTile from '@modules/cloud-abode/components/CaCategoryTile.vue'
import CaProductCard from '@modules/cloud-abode/components/CaProductCard.vue'
import CaPageTitle from '@modules/cloud-abode/components/CaPageTitle.vue'
import CaBtn from '@modules/cloud-abode/components/CaBtn.vue'
import CaField from '@modules/cloud-abode/components/CaField.vue'
import CaSelect from '@modules/cloud-abode/components/CaSelect.vue'
import CaReveal from '@modules/cloud-abode/components/CaReveal.vue'

defineOptions({ name: 'MallView' })

const router = useRouter()
const route = useRoute()
const products = ref<CaProduct[]>([])
const ownedIds = ref<Set<string>>(new Set())
const loading = ref(true)
const query = ref('')
const category = ref<ProductCategory | ''>('')
const sort = ref<'price_asc' | 'price_desc' | 'name' | 'newest'>('price_asc')

const categories: Array<ProductCategory | ''> = [
  '',
  'VEHICLE',
  'FURNITURE',
  'PLANT',
  'PET',
  'ILLUSTRATION'
]

async function load() {
  loading.value = true
  try {
    const list = await window.wanwu.cloudAbode.listProducts({
      category: category.value || undefined,
      query: query.value || undefined,
      sort: sort.value
    })
    products.value = list.filter((p) => !p.metadata?.residence)
    const inv = await window.wanwu.cloudAbode.listInventory()
    ownedIds.value = new Set(inv.map((i) => i.productId))
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => products.value)

function isPurchasable(p: CaProduct): boolean {
  if (ownedIds.value.has(p.id)) return false
  if (p.metadata?.residence) return false
  if (p.category === 'ILLUSTRATION') return true
  return p.priceCents > 0
}

function openDetail(id: string) {
  void router.push({ name: 'cloud-abode-mall-detail', params: { productId: id } })
}

function selectCategory(cat: ProductCategory | '') {
  category.value = cat
}

onMounted(() => {
  const q = route.query.category
  if (typeof q === 'string' && q) category.value = q as ProductCategory
  void load()
})

watch([category, sort], () => void load())
</script>

<template>
  <CaPageLayout wide>
    <CaPageTitle title="商城" lead="精选陈列 · 安静选购" />

    <CaReveal>
      <nav class="ww-ca-cat-grid" aria-label="商品分类">
        <CaCategoryTile
          v-for="c in categories"
          :key="c || 'all'"
          :category="c"
          :active="category === c"
          @select="selectCategory"
        />
      </nav>
    </CaReveal>

    <div class="ww-ca-inline-form">
      <CaField v-model="query" grow placeholder="搜索" @keyup.enter="load" />
      <CaSelect v-model="sort">
        <option value="price_asc">价格 ↑</option>
        <option value="price_desc">价格 ↓</option>
        <option value="name">名称</option>
        <option value="newest">最新</option>
      </CaSelect>
      <CaBtn variant="secondary" @click="load">筛选</CaBtn>
    </div>

    <div v-if="loading" class="ww-ca-loading">加载中</div>
    <div v-else-if="filtered.length === 0" class="ww-ca-empty">暂无商品</div>
    <CaReveal v-else>
      <div class="ww-ca-product-grid ww-ca-stagger">
        <CaProductCard
          v-for="p in filtered"
          :key="p.id"
          :product="p"
          :owned="ownedIds.has(p.id)"
          :show-only="!isPurchasable(p)"
          @open="openDetail"
        />
      </div>
    </CaReveal>
  </CaPageLayout>
</template>
