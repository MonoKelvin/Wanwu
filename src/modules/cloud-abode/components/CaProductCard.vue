<script setup lang="ts">
import type { CaProduct } from '@shared/types/cloud-abode'
import { formatCny, CATEGORY_LABELS } from '@modules/cloud-abode/shared/formatMoney'
import { CA_UI_ASSETS } from '@modules/cloud-abode/shared/caUiAssets'
import {
  categoryVisual,
  cloudAbodeProductImageUrl
} from '@modules/cloud-abode/shared/productVisual'

defineOptions({ name: 'CaProductCard' })

const props = defineProps<{
  product: CaProduct
  owned?: boolean
  showOnly?: boolean
}>()

const emit = defineEmits<{
  open: [id: string]
}>()

const visual = () => categoryVisual(props.product.category)
const imageUrl = () => cloudAbodeProductImageUrl(props.product.imagePath)
</script>

<template>
  <article
    class="ww-ca-product"
    :style="{ '--ww-ca-cat-hue': `${visual().hue}` }"
    @click="emit('open', product.id)"
  >
    <div class="ww-ca-product__media">
      <span
        class="ww-ca-product__media-texture"
        aria-hidden="true"
        :style="{ backgroundImage: `url(${CA_UI_ASSETS.grain})` }"
      />
      <span class="ww-ca-product__shine" aria-hidden="true" />
      <img
        v-if="imageUrl()"
        :src="imageUrl()!"
        :alt="product.name"
        class="ww-ca-product__img"
        loading="lazy"
      />
      <template v-else>
        <span class="ww-ca-product__pattern" aria-hidden="true" />
        <span class="ww-ca-product__glyph">{{ visual().glyph }}</span>
      </template>
      <span v-if="owned" class="ww-ca-product__badge ww-ca-product__badge--owned">已拥有</span>
      <span v-else-if="showOnly" class="ww-ca-product__badge">展示</span>
    </div>
    <div class="ww-ca-product__body">
      <p class="ww-ca-product__cat">{{ CATEGORY_LABELS[product.category] }}</p>
      <h3 class="ww-ca-product__name">{{ product.name }}</h3>
      <p class="ww-ca-product__price">¥{{ formatCny(product.priceCents) }}</p>
    </div>
  </article>
</template>
