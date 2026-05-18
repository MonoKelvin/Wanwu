<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@app/components/EmptyState.vue'
import UnsplashAttribution from '@features/item/UnsplashAttribution.vue'
import ItemMarkdown from '@features/item/ItemMarkdown.vue'
import type { Item } from '@shared/types/item'
import type { MediaAttribution } from '@shared/types/unsplash'

const route = useRoute()
const router = useRouter()
const item = ref<Item | null>(null)
const loading = ref(true)
const activeImage = ref<string | null>(null)

const specEntries = computed(() => Object.entries(item.value?.specs ?? {}))

const gallerySlides = computed(() => {
  if (!item.value) return []
  const list: Array<{ url: string; attribution: MediaAttribution | null }> = []
  if (item.value.coverPath) {
    list.push({ url: item.value.coverPath, attribution: item.value.coverAttribution ?? null })
  }
  const assets = item.value.galleryAssets?.length
    ? item.value.galleryAssets
    : (item.value.gallery ?? []).map((url) => ({ url, attribution: null }))
  for (const asset of assets) {
    if (asset.url && !list.some((s) => s.url === asset.url)) {
      list.push({ url: asset.url, attribution: asset.attribution ?? null })
    }
  }
  return list
})

const activeAttribution = computed(() => {
  const url = activeImage.value
  if (!url) return null
  return gallerySlides.value.find((s) => s.url === url)?.attribution ?? null
})

onMounted(async () => {
  const id = route.params.id as string
  const source = route.params.source as string
  if (source === 'library') {
    item.value = await window.wanwu.library.getItem(id)
    activeImage.value = item.value?.coverPath ?? null
  }
  loading.value = false
})

function goBack() {
  router.back()
}

async function toggleFavorite() {
  if (!item.value) return
  await window.wanwu.user.toggleFavorite({ itemId: item.value.id, source: item.value.source })
}

function selectImage(url: string) {
  activeImage.value = url
}
</script>

<template>
  <div class="ww-product-detail">
    <header class="ww-product-detail__bar">
      <Button
        icon="pi pi-arrow-left"
        variant="text"
        rounded
        severity="secondary"
        aria-label="返回"
        @click="goBack"
      />
      <nav class="ww-product-detail__crumb" aria-label="面包屑">
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-muted">{{ item.subCategoryName }}</span>
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-sep" aria-hidden="true">/</span>
        <span class="ww-product-detail__crumb-current">{{ item?.name ?? '详情' }}</span>
      </nav>
      <Button
        v-if="item"
        icon="pi pi-heart"
        variant="text"
        rounded
        severity="secondary"
        class="ww-product-detail__fav"
        aria-label="收藏"
        @click="toggleFavorite"
      />
    </header>

    <div v-if="loading" class="ww-product-detail__scroll">
      <div class="ww-product-detail__inner ww-product-detail__skeleton">
        <Skeleton width="100%" height="18rem" class="!rounded-xl !bg-ww-panel" />
        <Skeleton width="48%" height="1.75rem" class="!mt-6 !bg-ww-panel" />
        <Skeleton width="88%" height="3.5rem" class="!mt-3 !bg-ww-panel" />
      </div>
    </div>

    <EmptyState
      v-else-if="!item"
      variant="not-found"
      code="404"
      title="未找到物品"
      description="该条目可能已被移除。"
    />

    <div v-else class="ww-product-detail__scroll">
      <article class="ww-product-detail__inner">
        <div class="ww-product-detail__main">
          <section class="ww-product-detail__gallery" aria-label="图片">
            <div class="ww-product-detail__hero">
              <div class="ww-product-detail__hero-frame">
                <img
                  v-if="activeImage"
                  :src="activeImage"
                  :alt="item.name"
                  class="ww-product-detail__hero-img"
                />
                <i v-else class="pi pi-image ww-product-detail__hero-placeholder" aria-hidden="true" />
              </div>
              <UnsplashAttribution
                v-if="activeAttribution"
                class="ww-product-detail__credit"
                :attribution="activeAttribution"
              />
            </div>

            <div v-if="gallerySlides.length > 1" class="ww-product-detail__thumbs" role="tablist" aria-label="图集">
              <button
                v-for="(slide, i) in gallerySlides"
                :key="slide.url"
                type="button"
                role="tab"
                class="ww-product-detail__thumb"
                :class="{ 'ww-product-detail__thumb--active': activeImage === slide.url }"
                :aria-selected="activeImage === slide.url"
                :aria-label="`图 ${i + 1}`"
                @click="selectImage(slide.url)"
              >
                <img :src="slide.url" alt="" />
              </button>
            </div>
          </section>

          <section class="ww-product-detail__info">
            <header class="ww-product-detail__intro">
              <p v-if="item.subCategoryName" class="ww-product-detail__eyebrow">{{ item.subCategoryName }}</p>
              <h1 class="ww-product-detail__title">{{ item.name }}</h1>
              <p v-if="item.summary" class="ww-product-detail__lead">{{ item.summary }}</p>
            </header>

            <div v-if="item.tags?.length" class="ww-product-detail__tags">
              <Tag
                v-for="tag in item.tags"
                :key="tag"
                :value="tag"
                rounded
                severity="secondary"
                class="ww-product-detail__tag"
              />
            </div>

            <div v-if="specEntries.length" class="ww-product-detail__spec-block">
              <h2 class="ww-section-label">规格参数</h2>
              <dl class="ww-product-detail__specs">
                <div v-for="[key, val] in specEntries" :key="key" class="ww-product-detail__spec-row">
                  <dt>{{ key }}</dt>
                  <dd>{{ val }}</dd>
                </div>
              </dl>
            </div>

            <div class="ww-product-detail__actions">
              <Button icon="pi pi-heart" label="加入收藏" size="small" variant="outlined" @click="toggleFavorite" />
            </div>
          </section>
        </div>

        <section v-if="item.description" class="ww-product-detail__desc">
          <h2 class="ww-section-label">详细介绍</h2>
          <ItemMarkdown :content="item.description" class="ww-product-detail__prose" />
        </section>
      </article>
    </div>
  </div>
</template>
