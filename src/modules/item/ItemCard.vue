<script setup lang="ts">
import UnsplashAttribution from '@modules/item/UnsplashAttribution.vue'
import WwCoverImage from '@shared/components/WwCoverImage.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { Item } from '@shared/types/item'

const props = defineProps<{ item: Item; staggerIndex?: number }>()
defineEmits<{ click: [] }>()

const staggerStyle = () =>
  props.staggerIndex !== undefined ? { '--ww-stagger': props.staggerIndex } : undefined
</script>

<template>
  <article
    class="ww-product-card"
    role="button"
    tabindex="0"
    :style="staggerStyle()"
    @click="$emit('click')"
    @keydown.enter.prevent="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="ww-product-card__media">
      <WwCoverImage
        :src="item.coverPath"
        :alt="item.name"
        class="ww-product-card__img"
        icon-size="md"
        placeholder-text="暂无配图"
      />
      <div class="ww-product-card__overlay" aria-hidden="true" />
      <span class="ww-product-card__peek ww-glass-chip" aria-hidden="true">
        <WwIcon name="chevron-right" :size="8" class="ww-product-card__peek-icon" />
        查看
      </span>
      <span v-if="item.subCategoryName" class="ww-product-card__badge ww-glass-chip">
        {{ item.subCategoryName }}
      </span>
      <UnsplashAttribution
        v-if="item.coverAttribution"
        class="ww-product-card__credit"
        :attribution="item.coverAttribution"
        compact
      />
    </div>

    <div class="ww-product-card__body">
      <h3 class="ww-product-card__title">{{ item.name }}</h3>
      <p v-if="item.summary" class="ww-product-card__summary">{{ item.summary }}</p>
    </div>
  </article>
</template>

<style>
.ww-product-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--ww-border-faint);
  border-radius: 0.625rem;
  background: var(--ww-content);
  box-shadow: var(--ww-shadow-card);
  transition:
    transform var(--ww-duration) var(--ww-ease-out),
    box-shadow var(--ww-duration) var(--ww-ease-out),
    border-color var(--ww-duration) var(--ww-ease-out);
}

.ww-product-card:hover {
  border-color: var(--ww-border-subtle);
  box-shadow: var(--ww-shadow-hover);
  transform: translateY(-3px);
}

.ww-product-card__media {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--ww-panel);
}

.ww-product-card__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    transparent 35%,
    rgb(18 18 22 / 0.08) 70%,
    rgb(18 18 22 / 0.42) 100%
  );
  opacity: 0;
  transition: opacity var(--ww-duration) var(--ww-ease-out);
}

.ww-product-card:hover .ww-product-card__overlay {
  opacity: 1;
}

/* 卡片浮层标签 / 查看（毛玻璃） */
.ww-glass-chip {
  border: 1px solid rgb(255 255 255 / 0.18);
  background: rgb(18 18 22 / 0.28);
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  color: #fff;
}

.ww-product-card__peek {
  position: absolute;
  right: 0.625rem;
  bottom: 0.625rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  padding: 0.25rem 0.4375rem;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 0.3125rem;
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-product-card:hover .ww-product-card__peek {
  opacity: 1;
  transform: translateY(0);
}

.ww-product-card__peek-icon.ww-icon {
  width: 8px;
  height: 8px;
  opacity: 0.9;
}

.ww-product-card__img {
  transition: transform 0.35s var(--ww-ease-out);
}

.ww-product-card:hover .ww-product-card__img {
  transform: scale(1.04);
}


.ww-product-card__credit {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0.375rem 0.5rem;
  background: linear-gradient(to top, rgb(0 0 0 / 0.55), transparent);
}

.ww-product-card__credit.ww-unsplash-attribution {
  margin: 0;
}

.ww-product-card__credit .ww-unsplash-attribution__link {
  color: rgb(255 255 255 / 0.95);
}

.ww-product-card__credit .ww-unsplash-attribution__label {
  color: rgb(255 255 255 / 0.72);
}


.ww-product-card__badge {
  z-index: 2;
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  max-width: calc(100% - 1rem);
  overflow: hidden;
  padding: 0.1875rem 0.4375rem;
  border-radius: 0.3125rem;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.ww-product-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 0.1875rem;
  min-height: 0;
  padding: 0.625rem 0.75rem 0.6875rem;
  border-top: 1px solid var(--ww-border-faint);
}

.ww-product-card__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--ww-ink);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ww-product-card__summary {
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--ww-ink-faint);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}


@media (prefers-reduced-motion: reduce) {
  .ww-product-card:hover { transform: none; }
  .ww-product-card:hover .ww-product-card__img { transform: none; }
}
</style>
