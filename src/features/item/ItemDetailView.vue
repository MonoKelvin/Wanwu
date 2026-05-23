<script setup lang="ts">
defineOptions({ name: 'ItemDetailView' })

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useItemDetailNavigation } from '@app/composables/useItemDetailNavigation'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@app/components/EmptyState.vue'
import ItemDetailHeroActions from '@features/item/ItemDetailHeroActions.vue'
import { WwMarkdownReader } from '@shared/markdown'
import FavoriteGroupPickerDialog from '@features/item/FavoriteGroupPickerDialog.vue'
import ItemShareCardDialog from '@features/item/ItemShareCardDialog.vue'
import ItemShareImageDialog from '@features/item/ItemShareImageDialog.vue'
import { buildItemCopyText } from '@features/item/utils/buildItemCopyText'
import { DISMISSIBLE_PROMPT_IDS } from '@shared/constants/dismissiblePrompts'
import { useDismissibleConfirm } from '@shared/composables/useDismissibleConfirm'
import ImageViewer from '@shared/components/ImageViewer.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import UnsplashAttribution from '@features/item/UnsplashAttribution.vue'
import type { ImageViewerSlide } from '@shared/types/image-viewer'
import type { Item } from '@shared/types/item'
import type { MediaAttribution } from '@shared/types/unsplash'

const U = {
  toastUnfav: '\u5df2\u53d6\u6d88\u6536\u85cf',
  toastFav: '\u5df2\u52a0\u5165\u6536\u85cf',
  toastUnlike: '\u5df2\u53d6\u6d88\u70b9\u8d5e',
  toastLike: '\u5df2\u70b9\u8d5e',
  toastUploaded: '\u56fe\u7247\u5df2\u4e0a\u4f20',
  toastUploadFail: '\u4e0a\u4f20\u5931\u8d25',
  toastSaved: '\u5df2\u4fdd\u5b58\u8be6\u60c5',
  toastSaveFail: '\u4fdd\u5b58\u5931\u8d25',
  toastCopied: '\u5df2\u590d\u5236\u8be6\u60c5',
  toastCopiedId: '\u5df2\u590d\u5236 ID',
  loading: '\u52a0\u8f7d\u4e2d\u2026',
} as const

const route = useRoute()
const router = useRouter()
const { backFromItemDetail } = useItemDetailNavigation()
const dismissConfirm = useDismissibleConfirm()

const item = ref<Item | null>(null)
const loading = ref(true)
const activeImage = ref<string | null>(null)
const heroHover = ref(false)
const heroMenuOpen = ref(false)
const heroActionsVisible = computed(() => heroHover.value || heroMenuOpen.value)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const isFavorited = ref(false)
const isLiked = ref(false)
const groupPickerOpen = ref(false)
const shareCardOpen = ref(false)
const shareImageOpen = ref(false)
const shareCaptureRef = ref<HTMLElement | null>(null)
const toast = ref('')
const uploading = ref(false)
const descEditing = ref(false)
const descDraft = ref('')
const descSaving = ref(false)

const thumbsStripRef = ref<HTMLElement | null>(null)
const thumbsCanScrollLeft = ref(false)
const thumbsCanScrollRight = ref(false)
let thumbsResizeObserver: ResizeObserver | null = null

function updateThumbsScrollState() {
  const el = thumbsStripRef.value
  if (!el) {
    thumbsCanScrollLeft.value = false
    thumbsCanScrollRight.value = false
    return
  }
  const maxScroll = el.scrollWidth - el.clientWidth
  thumbsCanScrollLeft.value = el.scrollLeft > 1
  thumbsCanScrollRight.value = maxScroll > 1 && el.scrollLeft < maxScroll - 1
}

function scrollThumbs(direction: -1 | 1) {
  const el = thumbsStripRef.value
  if (!el) return
  const amount = direction * Math.max(el.clientWidth * 0.72, 140)
  el.scrollBy({ left: amount, behavior: 'smooth' })
}

function bindThumbsStrip() {
  thumbsResizeObserver?.disconnect()
  const el = thumbsStripRef.value
  if (!el) return
  updateThumbsScrollState()
  thumbsResizeObserver = new ResizeObserver(() => updateThumbsScrollState())
  thumbsResizeObserver.observe(el)
}

const isLibrary = computed(() => (route.params.source as string) === 'library')

const specEntries = computed(() =>
  Object.entries(item.value?.specs ?? {}).filter(([key]) => key !== '摘要')
)

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

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    )
  } catch {
    return iso
  }
}

function pickActiveImage(it: Item): string | null {
  if (it.coverPath) return it.coverPath
  const assets = it.galleryAssets?.length
    ? it.galleryAssets
    : (it.gallery ?? []).map((url) => ({ url, attribution: null }))
  return assets[0]?.url ?? null
}

async function loadItem() {
  loading.value = true
  isFavorited.value = false
  isLiked.value = false
  item.value = null
  activeImage.value = null
  descEditing.value = false

  const id = route.params.id as string
  const source = route.params.source as string
  if (source === 'library') {
    item.value = await window.wanwu.library.getItem(id)
    activeImage.value = item.value ? pickActiveImage(item.value) : null
    if (item.value) {
      const ref = { itemId: item.value.id, source: item.value.source }
      isFavorited.value = await window.wanwu.user.isFavorite(ref)
      isLiked.value = await window.wanwu.user.isLiked(ref)
    }
  }
  loading.value = false
}

onMounted(() => {
  loadItem()
  nextTick(bindThumbsStrip)
})

onUnmounted(() => {
  thumbsResizeObserver?.disconnect()
})

watch(() => `${route.params.source}:${route.params.id}`, loadItem)

watch(loading, (isLoading) => {
  if (!isLoading) nextTick(bindThumbsStrip)
})

watch(
  () => gallerySlides.value.length,
  () => nextTick(() => {
    bindThumbsStrip()
    updateThumbsScrollState()
  })
)

watch(lightboxIndex, (i) => {
  const slide = gallerySlides.value[i]
  if (slide) activeImage.value = slide.url
})

function goBack() {
  void backFromItemDetail()
}

async function onFavoriteClick() {
  if (!item.value) return
  if (isFavorited.value) {
    await window.wanwu.user.removeFavorite({
      itemId: item.value.id,
      source: item.value.source
    })
    isFavorited.value = false
    showToast(U.toastUnfav)
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
  showToast(U.toastFav)
}

async function onLikeClick() {
  if (!item.value) return
  if (isLiked.value) {
    await window.wanwu.user.removeLike({
      itemId: item.value.id,
      source: item.value.source
    })
    isLiked.value = false
    showToast(U.toastUnlike)
  } else {
    await window.wanwu.user.addLike({
      itemId: item.value.id,
      source: item.value.source
    })
    isLiked.value = true
    showToast(U.toastLike)
  }
}

function openShareImageDialog() {
  if (!item.value || !shareCaptureRef.value) return
  shareImageOpen.value = true
}

async function copyItemDetails() {
  if (!item.value) return
  await window.wanwu.shell.copyText(buildItemCopyText(item.value))
  showToast(U.toastCopied)
}

async function copyItemId() {
  if (!item.value) return
  await window.wanwu.shell.copyText(item.value.id)
  showToast(U.toastCopiedId)
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

async function uploadImage() {
  if (!item.value || !isLibrary.value) return
  const pick = await window.wanwu.shell.pickImageFile()
  if (!pick.ok || !pick.path) return
  const filePath = pick.path
  uploading.value = true
  try {
    const updated = await window.wanwu.library.uploadItemImage({
      itemId: item.value.id,
      filePath
    })
    item.value = updated
    activeImage.value = pickActiveImage(updated)
    showToast(U.toastUploaded)
  } catch {
    showToast(U.toastUploadFail)
  } finally {
    uploading.value = false
  }
}

function startDescEdit() {
  descDraft.value = item.value?.description ?? ''
  descEditing.value = true
}

async function cancelDescEdit() {
  const ok = await dismissConfirm.ask({
    id: DISMISSIBLE_PROMPT_IDS.itemDescCancel,
    header: '放弃编辑',
    message: '当前修改尚未保存，确定要退出编辑吗？',
    acceptLabel: '放弃修改',
    rejectLabel: '继续编辑',
    danger: true
  })
  if (!ok) return
  descEditing.value = false
  descDraft.value = ''
}

async function saveDescEdit() {
  if (!item.value) return
  const ok = await dismissConfirm.ask({
    id: DISMISSIBLE_PROMPT_IDS.itemDescSave,
    header: '保存详情',
    message: '确定将当前 Markdown 正文写入该物品吗？',
    acceptLabel: '保存',
    rejectLabel: '继续编辑'
  })
  if (!ok) return
  descSaving.value = true
  try {
    const updated = await window.wanwu.library.updateItem({
      ...item.value,
      description: descDraft.value.trim() || null
    })
    item.value = updated
    descEditing.value = false
    showToast(U.toastSaved)
  } catch {
    showToast(U.toastSaveFail)
  } finally {
    descSaving.value = false
  }
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
    <header class="ww-product-detail__bar ww-chrome-safe ww-glass-surface--bar">
      <button
        type="button"
        class="ww-product-detail__back ww-glass-btn ww-glass-btn--icon ww-glass-btn--on-light"
        aria-label="返回"
        @click="goBack"
      >
        <WwIcon name="arrow-left" size="sm" />
      </button>
      <nav class="ww-product-detail__crumb" aria-label="breadcrumb">
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-muted">{{ item.subCategoryName }}</span>
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-sep" aria-hidden="true">/</span>
        <span class="ww-product-detail__crumb-current">{{ item?.name ?? U.loading }}</span>
      </nav>
      <div v-if="item" class="ww-product-detail__page-meta" aria-label="时间信息">
        <span v-if="item.createdAt" class="ww-product-detail__page-meta-item">
          创建时间: {{ formatDateTime(item.createdAt) }}
        </span>
        <span v-if="item.updatedAt" class="ww-product-detail__page-meta-item">
          更新时间: {{ formatDateTime(item.updatedAt) }}
        </span>
      </div>
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
      title="未找到物品"
      description="该条目可能已被删除或 ID 不正确。"
    />

    <div v-else class="ww-product-detail__scroll">
      <article ref="shareCaptureRef" class="ww-product-detail__inner" data-share-capture>
        <div class="ww-product-detail__main">
          <section class="ww-product-detail__gallery" aria-label="图片">
            <button
              type="button"
              class="ww-product-detail__id-outside ww-product-detail__id-link"
              :title="'点击复制 ID：' + item.id"
              @click="copyItemId"
            >
              ID: {{ item.id }}
            </button>
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
                v-if="isLibrary || activeImage"
                v-model:menu-open="heroMenuOpen"
                :visible="heroActionsVisible"
                :has-active-image="Boolean(activeImage)"
                :has-source-link="Boolean(sourceUrl)"
                @open-lightbox="openLightbox"
                @download="downloadActiveImage"
                @reveal-in-folder="revealInFolder"
                @open-source="openSourceLink"
                @upload-image="uploadImage"
              />
            </div>

            <UnsplashAttribution
              v-if="activeAttribution"
              class="ww-product-detail__credit"
              :attribution="activeAttribution"
            />

            <div
              v-if="gallerySlides.length > 1 || isLibrary"
              class="ww-product-detail__thumbs-wrap"
            >
              <button
                v-show="thumbsCanScrollLeft"
                type="button"
                class="ww-product-detail__thumbs-nav ww-product-detail__thumbs-nav--prev"
                aria-label="上一组图片"
                @click="scrollThumbs(-1)"
              >
                <WwIcon name="chevron-left" size="sm" />
              </button>
              <div
                ref="thumbsStripRef"
                class="ww-product-detail__thumbs"
                role="tablist"
                aria-label="图集"
                @scroll.passive="updateThumbsScrollState"
              >
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
                <button
                  v-if="isLibrary"
                  type="button"
                  class="ww-product-detail__thumb ww-product-detail__thumb--add"
                  :disabled="uploading"
                  aria-label="上传图片"
                  @click="uploadImage"
                >
                  <WwIcon name="plus" size="sm" />
                </button>
              </div>
              <button
                v-show="thumbsCanScrollRight"
                type="button"
                class="ww-product-detail__thumbs-nav ww-product-detail__thumbs-nav--next"
                aria-label="下一组图片"
                @click="scrollThumbs(1)"
              >
                <WwIcon name="chevron-right" size="sm" />
              </button>
            </div>
          </section>

          <section class="ww-product-detail__info">
            <header class="ww-product-detail__intro">
              <h1 class="ww-product-detail__title">{{ item.name }}</h1>
              <p v-if="item.summary" class="ww-product-detail__lead">{{ item.summary }}</p>
            </header>

            <div v-if="item.tags?.length" class="ww-product-detail__tags">
              <span v-for="tag in item.tags" :key="tag" class="ww-product-detail__pill-tag">
                {{ tag }}
              </span>
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
          </section>
        </div>

        <section v-if="isLibrary" class="ww-product-detail__desc">
          <div class="ww-product-detail__desc-head">
            <h2 class="ww-section-label">详细介绍</h2>
            <div v-if="!descEditing" class="ww-product-detail__desc-actions">
              <button
                type="button"
                class="ww-product-detail__desc-btn"
                aria-label="编辑详情"
                @click="startDescEdit"
              >
                <WwIcon name="pencil" size="sm" />
              </button>
            </div>
            <div v-else class="ww-product-detail__desc-actions">
              <button
                type="button"
                class="ww-product-detail__desc-btn ww-product-detail__desc-btn--primary"
                :disabled="descSaving"
                aria-label="完成"
                @click="void saveDescEdit()"
              >
                <WwIcon name="check" size="sm" />
              </button>
              <button
                type="button"
                class="ww-product-detail__desc-btn"
                :disabled="descSaving"
                aria-label="取消"
                @click="void cancelDescEdit()"
              >
                <WwIcon name="x" size="sm" />
              </button>
            </div>
          </div>

          <div v-if="descEditing" class="ww-product-detail__desc-editor">
            <Textarea
              v-model="descDraft"
              class="w-full"
              rows="12"
              auto-resize
              placeholder="Markdown 正文"
            />
          </div>
          <WwMarkdownReader
            v-else-if="item.description"
            :content="item.description"
            class="ww-product-detail__prose"
          />
          <p v-else class="ww-product-detail__desc-empty">暂无详细介绍，点击上方编辑按钮添加。</p>
        </section>

        <section v-else-if="item.description" class="ww-product-detail__desc">
          <h2 class="ww-section-label">详细介绍</h2>
          <WwMarkdownReader :content="item.description" class="ww-product-detail__prose" />
        </section>
      </article>
    </div>

    <div
      v-if="item && !loading"
      class="ww-product-detail__float-dock ww-product-detail__dock ww-glass-blur"
      role="toolbar"
      aria-label="物品操作"
    >
      <button
        v-tooltip.bottom="isLiked ? '取消点赞' : '点赞'"
        type="button"
        class="ww-product-detail__dock-btn"
        :class="{ 'ww-product-detail__dock-btn--liked': isLiked }"
        :aria-pressed="isLiked"
        :aria-label="isLiked ? '取消点赞' : '点赞'"
        @click="onLikeClick"
      >
        <WwIcon name="thumbs-up" size="sm" :filled="isLiked" />
      </button>
      <button
        v-tooltip.bottom="isFavorited ? '取消收藏' : '收藏'"
        type="button"
        class="ww-product-detail__dock-btn"
        :class="{ 'ww-product-detail__dock-btn--active': isFavorited }"
        :aria-pressed="isFavorited"
        :aria-label="isFavorited ? '取消收藏' : '收藏'"
        @click="onFavoriteClick"
      >
        <WwIcon name="heart" size="sm" :filled="isFavorited" />
      </button>
      <button
        v-tooltip.bottom="'分享长图'"
        type="button"
        class="ww-product-detail__dock-btn"
        aria-label="分享长图"
        @click="openShareImageDialog"
      >
        <WwIcon name="share" size="sm" />
      </button>
      <button
        v-tooltip.bottom="'定制卡片'"
        type="button"
        class="ww-product-detail__dock-btn"
        aria-label="定制卡片"
        @click="shareCardOpen = true"
      >
        <WwIcon name="sparkles" size="sm" />
      </button>
      <button
        v-tooltip.bottom="'复制详情'"
        type="button"
        class="ww-product-detail__dock-btn"
        aria-label="复制详情"
        @click="copyItemDetails"
      >
        <WwIcon name="copy" size="sm" />
      </button>
    </div>

    <ImageViewer v-model:open="lightboxOpen" v-model:index="lightboxIndex" :slides="lightboxSlides" />

    <ItemShareImageDialog
      v-model:visible="shareImageOpen"
      :item="item"
      :capture-el="shareCaptureRef"
      :gallery-slides="gallerySlides"
      :hero-url="activeImage"
      :hero-attribution="activeAttribution"
      @toast="showToast"
    />

    <FavoriteGroupPickerDialog
      v-model:visible="groupPickerOpen"
      :item-name="item?.name"
      @confirm="onFavoriteGroupPicked"
    />

    <ItemShareCardDialog v-model:visible="shareCardOpen" :item="item" :cover-url="activeImage" />
  </div>
</template>
