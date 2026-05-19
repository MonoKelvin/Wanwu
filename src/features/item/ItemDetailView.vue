<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@app/components/EmptyState.vue'
import ItemDetailHeroActions from '@features/item/ItemDetailHeroActions.vue'
import ItemMarkdown from '@features/item/ItemMarkdown.vue'
import FavoriteGroupPickerDialog from '@features/item/FavoriteGroupPickerDialog.vue'
import ItemShareCardDialog from '@features/item/ItemShareCardDialog.vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
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
const isFavorited = ref(false)
const groupPickerOpen = ref(false)
const shareCardOpen = ref(false)
const toast = ref('')

const specEntries = computed(() => Object.entries(item.value?.specs ?? {}))
const shortId = computed(() => {
  const id = item.value?.id ?? ''
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
})

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

let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2400)
}

async function loadItem() {
  loading.value = true
  isFavorited.value = false
  item.value = null
  activeImage.value = null

  const id = route.params.id as string
  const source = route.params.source as string
  if (source === 'library') {
    item.value = await window.wanwu.library.getItem(id)
    activeImage.value = item.value?.coverPath ?? null
    if (item.value) {
      isFavorited.value = await window.wanwu.user.isFavorite({
        itemId: item.value.id,
        source: item.value.source
      })
    }
  }
  loading.value = false
}

onMounted(loadItem)
watch(() => `${route.params.source}:${route.params.id}`, loadItem)

watch(lightboxIndex, (i) => {
  const slide = gallerySlides.value[i]
  if (slide) activeImage.value = slide.url
})

function goBack() {
  router.back()
}

async function onFavoriteClick() {
  if (!item.value) return
  if (isFavorited.value) {
    await window.wanwu.user.removeFavorite({
      itemId: item.value.id,
      source: item.value.source
    })
    isFavorited.value = false
    showToast('?????')
    return
  }
  groupPickerOpen.value = true
}

async function onFavoriteGroupPicked(groupId: string) {
  if (!item.value) return
  await window.wanwu.user.addFavorite({
    itemId: item.value.id,
    source: item.value.source,
    groupId
  })
  isFavorited.value = true
  showToast('?????')
}

function buildShareText(): string {
  if (!item.value) return ''
  const lines = [item.value.name]
  if (item.value.summary) lines.push(item.value.summary)
  if (item.value.subCategoryName) lines.push(item.value.subCategoryName)
  lines.push(`ID: ${item.value.id}`)
  lines.push('? ?? Wanwu')
  return lines.join('\n')
}

async function shareItem() {
  const text = buildShareText()
  if (!text) return
  await window.wanwu.shell.copyText(text)
  showToast('???????')
}

async function copyItemId() {
  if (!item.value) return
  await window.wanwu.shell.copyText(item.value.id)
  showToast('??? ID')
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
      <button
        type="button"
        class="ww-product-detail__back ww-glass-btn ww-glass-btn--icon"
        aria-label="返回"
        @click="goBack"
      >
        <WwIcon name="arrow-left" size="sm" />
      </button>
      <nav class="ww-product-detail__crumb" aria-label="breadcrumb">
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-muted">{{ item.subCategoryName }}</span>
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-sep" aria-hidden="true">/</span>
        <span class="ww-product-detail__crumb-current">{{ item?.name ?? '??' }}</span>
      </nav>
    </header>

    <Transition name="ww-toast">
      <p v-if="toast" class="ww-product-detail__toast" role="status">{{ toast }}</p>
    </Transition>

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
      title="未找到物�?
      description="该条目可能已被移除�?
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
                :aria-label="`�?${i + 1}`"
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

            <footer class="ww-product-detail__footer">
              <button
                type="button"
                class="ww-product-detail__id-tag"
                :title="item.id"
                @click="copyItemId"
              >
                ID {{ shortId }}
              </button>

              <div class="ww-product-detail__dock" role="toolbar" aria-label="物品操作">
                <button
                  type="button"
                  class="ww-product-detail__dock-btn"
                  :class="{ 'ww-product-detail__dock-btn--active': isFavorited }"
                  :aria-pressed="isFavorited"
                  :aria-label="isFavorited ? '取消收藏' : '加入收藏'"
                  @click="onFavoriteClick"
                >
                  <WwIcon name="heart" size="sm" :filled="isFavorited" />
                </button>
                <button
                  type="button"
                  class="ww-product-detail__dock-btn"
                  aria-label="分享"
                  @click="shareItem"
                >
                  <WwIcon name="share" size="sm" />
                </button>
                <button
                  type="button"
                  class="ww-product-detail__dock-btn"
                  aria-label="生成分享卡片"
                  @click="shareCardOpen = true"
                >
                  <WwIcon name="sparkles" size="sm" />
                </button>
                <button
                  type="button"
                  class="ww-product-detail__dock-btn"
                  aria-label="复制 ID"
                  @click="copyItemId"
                >
                  <WwIcon name="copy" size="sm" />
                </button>
              </div>
            </footer>
          </section>
        </div>

        <section v-if="item.description" class="ww-product-detail__desc">
          <h2 class="ww-section-label">详细介绍</h2>
          <ItemMarkdown :content="item.description" class="ww-product-detail__prose" />
        </section>
      </article>
    </div>

    <ImageViewer v-model:open="lightboxOpen" v-model:index="lightboxIndex" :slides="lightboxSlides" />

    <FavoriteGroupPickerDialog
      v-model:visible="groupPickerOpen"
      :item-name="item?.name"
      @confirm="onFavoriteGroupPicked"
    />

    <ItemShareCardDialog v-model:visible="shareCardOpen" :item="item" />
  </div>
</template>
