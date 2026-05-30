<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CaInventoryItem } from '@shared/types/cloud-abode'
import { CATEGORY_LABELS, formatCny } from '@modules/cloud-abode/shared/formatMoney'
import { CA_UI_ASSETS } from '@modules/cloud-abode/shared/caUiAssets'
import CaPageLayout from '@modules/cloud-abode/components/CaPageLayout.vue'
import CaPageTitle from '@modules/cloud-abode/components/CaPageTitle.vue'
import CaBtn from '@modules/cloud-abode/components/CaBtn.vue'
import CaReveal from '@modules/cloud-abode/components/CaReveal.vue'
import {
  categoryVisual,
  cloudAbodeProductImageUrl
} from '@modules/cloud-abode/shared/productVisual'

defineOptions({ name: 'InventoryView' })

const router = useRouter()
const items = ref<CaInventoryItem[]>([])
const loading = ref(true)
const subText = computed(() =>
  !loading.value && items.value.length
    ? `共 ${items.value.length} 件藏品`
    : undefined
)

async function load() {
  loading.value = true
  try {
    items.value = await window.wanwu.cloudAbode.listInventory()
  } finally {
    loading.value = false
  }
}

function openShowroom(slug: string | null) {
  if (!slug) return
  void router.push({ name: 'cloud-abode-showroom', params: { slug } })
}

onMounted(() => void load())
</script>

<template>
  <CaPageLayout wide>
    <CaPageTitle title="收藏" :lead="subText" />

    <div v-if="loading" class="ww-ca-loading">加载中</div>
    <div v-else-if="items.length === 0" class="ww-ca-empty ww-ca-empty--web">
      <p class="ww-ca-empty__title">暂无收藏</p>
      <p class="ww-ca-empty__sub">在商城选购后，藏品会出现在这里</p>
      <CaBtn variant="primary" class="mt-4" @click="router.push('/cloud-abode/mall')">
        去商城
      </CaBtn>
    </div>
    <CaReveal v-else>
      <ul class="ww-ca-inventory-grid ww-ca-product-grid ww-ca-stagger">
        <li
          v-for="item in items"
          :key="item.id"
          class="ww-ca-product ww-ca-card--interactive"
          :style="{ '--ww-ca-cat-hue': `${categoryVisual(item.product.category).hue}` }"
        >
          <div class="ww-ca-product__media">
            <span
              class="ww-ca-product__media-texture"
              aria-hidden="true"
              :style="{ backgroundImage: `url(${CA_UI_ASSETS.grain})` }"
            />
            <img
              v-if="cloudAbodeProductImageUrl(item.product.imagePath)"
              :src="cloudAbodeProductImageUrl(item.product.imagePath)!"
              :alt="item.product.name"
              class="ww-ca-product__img"
              loading="lazy"
            />
            <template v-else>
              <span class="ww-ca-product__pattern" aria-hidden="true" />
              <span class="ww-ca-product__glyph">{{ categoryVisual(item.product.category).glyph }}</span>
            </template>
            <span
            class="ww-ca-product__shine"
            aria-hidden="true"
          />
          <span class="ww-ca-product__badge ww-ca-product__badge--owned">已拥有</span>
          </div>
          <div class="ww-ca-product__body">
            <p class="ww-ca-product__cat">{{ CATEGORY_LABELS[item.product.category] }}</p>
            <h3 class="ww-ca-product__name">{{ item.product.name }}</h3>
            <p class="ww-ca-product__price">¥{{ formatCny(item.product.priceCents) }}</p>
            <button
              v-if="item.product.model3dSlug"
              type="button"
              class="ww-ca-link mt-3"
              @click.stop="openShowroom(item.product.model3dSlug)"
            >
              展车
            </button>
          </div>
        </li>
      </ul>
    </CaReveal>
  </CaPageLayout>
</template>
