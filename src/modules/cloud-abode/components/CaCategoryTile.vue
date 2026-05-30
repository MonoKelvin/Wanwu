<script setup lang="ts">
import type { ProductCategory } from '@shared/types/cloud-abode'
import { CA_UI_ASSETS } from '@modules/cloud-abode/shared/caUiAssets'
import { categoryVisual } from '@modules/cloud-abode/shared/productVisual'

defineOptions({ name: 'CaCategoryTile' })

const props = defineProps<{
  category: ProductCategory | ''
  active?: boolean
}>()

const emit = defineEmits<{
  select: [category: ProductCategory | '']
}>()

const visual = () => {
  if (!props.category) {
    return { glyph: '全', label: '全部', hue: 210 }
  }
  return categoryVisual(props.category)
}
</script>

<template>
  <button
    type="button"
    class="ww-ca-cat-tile"
    :class="{ 'ww-ca-cat-tile--active': active }"
    :style="{ '--ww-ca-cat-hue': `${visual().hue}` }"
    @click="emit('select', category)"
  >
    <span
      class="ww-ca-cat-tile__pattern-img"
      aria-hidden="true"
      :style="{ backgroundImage: `url(${CA_UI_ASSETS.dots})` }"
    />
    <span class="ww-ca-cat-tile__glyph">{{ visual().glyph }}</span>
    <span class="ww-ca-cat-tile__label">{{ visual().label }}</span>
  </button>
</template>
