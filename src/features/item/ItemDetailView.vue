<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@app/components/EmptyState.vue'
import ItemDetailHeroActions from '@features/item/ItemDetailHeroActions.vue'
import ItemMarkdown from '@features/item/ItemMarkdown.vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import UnsplashAttribution from '@features/item/UnsplashAttribution.vue'
import type { ImageViewerSlide } from '@shared/types/image-viewer'
import type { Item } from '@shared/types/item'
import type { MediaAttribution } from '@shared/types/unsplash'

const route = useRoute()
const router = useRouter()
const item = ref<Item | null>(null)
const loading = ref(true)
const activeImage = ref<string | null>(null)
const heroHover = ref(false)
const heroMenuOpen = ref(false)
const heroActionsVisible = computed(() => heroHover.value || heroMenuOpen.value)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

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

const lightboxSlides = computed<ImageViewerSlide[]>(() =>
  gallerySlides.value.map((s) => ({
    url: s.url,
    alt: item.value?.name,
    attribution: s.attribution
  }))
)

const activeAttribution = computed(() => {
  const url = activeImage.value
  if (!url) return null
  return gallerySlides.value.find((s) => s.url === url)?.attribution ?? null
})

const sourceUrl = computed(() => activeAttribution.value?.photoPageUrl ?? null)

const activeSlideIndex = computed(() => {
  const url = activeImage.value
  if (!url) return 0
  const i = gallerySlides.value.findIndex((s) => s.url === url)
  return i >= 0 ? i : 0
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

watch(lightboxIndex, (i) => {
  const slide = gallerySlides.value[i]
  if (slide) activeImage.value = slide.url
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

function openLightbox() {
  lightboxIndex.value = activeSlideIndex.value
  lightboxOpen.value = true
}

function onHeroOpenClick(e: MouseEvent) {
  if (!activeImage.value) return
  if ((e.target as HTMLElement).closest('.ww-product-detail__hero-actions')) return
  openLightbox()
}

async function downloadActiveImage() {
  const url = activeImage.value
  if (!url || !item.value) return
  const ext = url.includes('.png') ? 'png' : 'jpg'
  await window.wanwu.shell.downloadFile({
    url,
    defaultName: `${item.value.name}.${ext}`
  })
}

async function openSourceLink() {
  if (sourceUrl.value) await window.wanwu.shell.openExternal(sourceUrl.value)
}

async function revealInFolder() {
  const url = activeImage.value
  if (!url) return
  await window.wanwu.shell.showItemInFolder(url)
}
</script>

<template>
  <div class="ww-product-detail">
    <header class="ww-product-detail__bar ww-chrome-safe">
      <WwButton
        icon="arrow-left"
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
      <WwButton
        v-if="item"
        icon="heart"
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
            <div
              class="ww-product-detail__hero-stage ww-surface-grid"
              @mouseenter="heroHover = true"
              @mouseleave="heroHover = false"
            >
              <div
                class="ww-product-detail__hero-frame"
                :class="{ 'ww-product-detail__hero-frame--openable': activeImage }"
                @click="onHeroOpenClick"
              >
                <img
                  v-if="activeImage"
                  :src="activeImage"
                  :alt="item.name"
                  class="ww-product-detail__hero-img"
                />
                <WwIcon v-else name="image" size="lg" class="ww-product-detail__hero-placeholder" />
              </div>

              <ItemDetailHeroActions
                v-if="activeImage"
                v-model:menu-open="heroMenuOpen"
                :visible="heroActionsVisible"
                :has-source-link="Boolean(sourceUrl)"
                @open-lightbox="openLightbox"
                @download="downloadActiveImage"
                @reveal-in-folder="revealInFolder"
                @open-source="openSourceLink"
              />
            </div>

            <UnsplashAttribution
              v-if="activeAttribution"
              class="ww-product-detail__credit"
              :attribution="activeAttribution"
            />

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
              <WwButton icon="heart" label="加入收藏" size="small" variant="outlined" @click="toggleFavorite" />
            </div>
          </section>
        </div>

        <section v-if="item.description" class="ww-product-detail__desc">
          <h2 class="ww-section-label">详细介绍</h2>
          <ItemMarkdown :content="item.description" class="ww-product-detail__prose" />
        </section>
      </article>
    </div>

    <ImageViewer
      v-model:open="lightboxOpen"
      v-model:index="lightboxIndex"
      :slides="lightboxSlides"
    />
  </div>
</template>
