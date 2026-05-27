<script setup lang="ts">
defineOptions({ name: 'ItemDetailView' })

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useItemDetailNavigation } from '@app/composables/useItemDetailNavigation'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@app/components/EmptyState.vue'
import ItemDetailHeroActions from '@modules/item/ItemDetailHeroActions.vue'
import { WwMarkdownReader } from '@shared/markdown'
import FavoriteGroupPickerDialog from '@modules/item/FavoriteGroupPickerDialog.vue'
import ItemShareCardDialog from '@modules/item/ItemShareCardDialog.vue'
import ItemShareImageDialog from '@modules/item/ItemShareImageDialog.vue'
import { buildItemCopyText } from '@modules/item/utils/buildItemCopyText'
import { DISMISSIBLE_PROMPT_IDS } from '@shared/constants/dismissiblePrompts'
import { useDismissibleConfirm } from '@shared/composables/useDismissibleConfirm'
import ImageViewer from '@shared/components/ImageViewer.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import UnsplashAttribution from '@modules/item/UnsplashAttribution.vue'
import type { ImageViewerSlide } from '@shared/types/image-viewer'
import type { Item } from '@shared/types/item'
import type { MediaAttribution } from '@shared/types/unsplash'
import {
  POP_TIP_COPY_MESSAGES,
  showPopTip,
  usePopTip
} from '@shared/composables/usePopTip'

const U = {
  toastUnfav: '\u5df2\u53d6\u6d88\u6536\u85cf',
  toastFav: '\u5df2\u52a0\u5165\u6536\u85cf',
  toastUnlike: '\u5df2\u53d6\u6d88\u70b9\u8d5e',
  toastLike: '\u5df2\u70b9\u8d5e',
  toastUploaded: '\u56fe\u7247\u5df2\u4e0a\u4f20',
  toastUploadFail: '\u4e0a\u4f20\u5931\u8d25',
  toastSaved: '\u5df2\u4fdd\u5b58\u8be6\u60c5',
  toastSaveFail: '\u4fdd\u5b58\u5931\u8d25',
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
const popTip = usePopTip()
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

function showToast(message: string) {
  showPopTip(message)
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
  await popTip.copyText(buildItemCopyText(item.value), POP_TIP_COPY_MESSAGES.detail)
}

async function copyItemId() {
  if (!item.value) return
  await popTip.copyText(item.value.id, POP_TIP_COPY_MESSAGES.id)
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

<style>
.ww-product-detail__hero-img.ww-cover-image__placeholder {
  min-height: 12rem;
}

.ww-product-detail__thumb .ww-cover-image__img,
.ww-product-detail__thumb .ww-cover-image__placeholder {
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.ww-product-detail__thumb .ww-cover-image__placeholder-text {
  display: none;
}

.ww-product-detail {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--ww-content);
}

.ww-product-detail__bar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding: 0.375rem 1rem 0.5rem;
}

.ww-product-detail__bar .ww-product-detail__page-meta {
  flex: 0 1 auto;
  width: auto;
  max-width: min(52vw, 28rem);
  margin: 0 0 0 auto;
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  justify-content: flex-end;
}

.ww-product-detail__bar.ww-chrome-safe {
  padding-top: calc(var(--ww-titlebar-height) + 0.25rem);
}

.ww-product-detail__crumb {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
}

.ww-product-detail__crumb-muted {
  flex-shrink: 0;
  color: var(--ww-ink-faint);
}

.ww-product-detail__crumb-sep {
  flex-shrink: 0;
  color: var(--ww-ink-faint);
  opacity: 0.5;
}

.ww-product-detail__crumb-current {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--ww-ink);
}

.ww-product-detail__back {
  flex-shrink: 0;
}

.ww-product-detail__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.ww-product-detail__id-link {
  margin: 0.25rem 0 0;
  padding: 0;
  border: none;
  background: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  line-height: 1.4;
  letter-spacing: 0.01em;
  color: var(--ww-ink-faint);
  text-align: left;
  word-break: break-all;
  cursor: pointer;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-product-detail__id-link:hover {
  color: var(--ww-ink-muted);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ww-product-detail__page-meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.375rem 1rem;
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--ww-ink-faint);
}

.ww-product-detail__page-meta-item {
  white-space: nowrap;
}

.ww-product-detail__float-dock {
  position: fixed;
  top: auto;
  left: auto;
  right: 2.25rem;
  bottom: 1.5rem;
  z-index: var(--ww-detail-dock-z, 100);
  width: max-content;
  max-width: min(calc(100vw - 4.5rem), 22rem);
  pointer-events: none;
}

/* 覆盖 .ww-glass-blur 的 position:relative 与 z-index:0，避免被正文/Markdown 层遮挡 */
.ww-product-detail__float-dock.ww-glass-blur {
  position: fixed;
  top: auto;
  left: auto;
  right: 2.25rem;
  bottom: 1.5rem;
  z-index: var(--ww-detail-dock-z, 100);
}

.ww-product-detail__float-dock > * {
  pointer-events: auto;
}

.ww-product-detail__dock {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem;
  border-radius: 999px;
}

.ww-product-detail__dock-btn {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  color: var(--ww-ink-muted);
  background: transparent;
  cursor: pointer;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-product-detail__dock-btn:hover {
  color: var(--ww-ink);
  background: var(--ww-list-hover-bg);
}

.ww-product-detail__dock-btn:active {
  transform: scale(0.94);
}

.ww-product-detail__dock-btn--active {
  color: var(--ww-danger-text);
  background: rgb(254 226 226 / 0.65);
}

.ww-product-detail__dock-btn--active:hover {
  color: rgb(153 27 27);
  background: rgb(254 202 202 / 0.75);
}

.ww-product-detail__dock-btn--liked {
  color: rgb(37 99 235);
  background: rgb(219 234 254 / 0.75);
}

.ww-product-detail__dock-btn--liked:hover {
  color: rgb(29 78 216);
  background: rgb(191 219 254 / 0.85);
}

.ww-product-detail__toast {
  position: fixed;
  top: calc(var(--ww-titlebar-height) + 3.25rem);
  left: 50%;
  z-index: 120;
  margin: 0;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  white-space: nowrap;
  color: var(--ww-ink);
  border: 1px solid var(--ww-glass-border);
  border-radius: 999px;
  background: var(--ww-glass-bg-soft);
  box-shadow: var(--ww-shadow-soft);
  transform: translateX(-50%);
  pointer-events: none;
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .ww-product-detail__toast {
    background: var(--ww-glass-bg-soft);
    backdrop-filter: blur(16px) saturate(1.35);
    -webkit-backdrop-filter: blur(16px) saturate(1.35);
  }
}

.ww-product-detail__float-dock.ww-glass-blur {
  border: none;
  border-radius: 999px;
  overflow: visible;
}

.ww-product-detail__float-dock.ww-glass-blur::before {
  border-radius: 999px;
  background: var(--ww-glass-bg-soft);
}

.ww-toast-enter-active,
.ww-toast-leave-active {
  transition:
    opacity var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-toast-enter-from,
.ww-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.ww-product-detail__scroll {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ww-product-detail__inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: var(--ww-content-max);
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
  box-sizing: border-box;
}

.ww-product-detail__skeleton {
  padding-top: 0.5rem;
}

.ww-product-detail__main {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.75rem;
  align-items: start;
}

@media (min-width: 900px) {
  .ww-product-detail__inner {
    padding: 1.5rem 1.75rem 3.5rem;
  }

  .ww-product-detail__main {
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    gap: 2.5rem;
  }
}

.ww-product-detail__gallery {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}

.ww-product-detail__id-outside {
  display: inline-block;
  align-self: flex-start;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  text-align: left;
}

.ww-product-detail__id-outside.ww-product-detail__id-link {
  margin: 0 0 0.125rem;
}

.ww-product-detail__hero-stage {
  position: relative;
  height: var(--ww-hero-height);
  min-height: var(--ww-hero-height);
  border-radius: 0.75rem;
  overflow: clip;
}

@supports not (overflow: clip) {
  .ww-product-detail__hero-stage {
    overflow: hidden;
  }
}

.ww-product-detail__hero-actions {
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.375rem;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-product-detail__hero-actions.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.ww-product-detail__hero-stage:hover .ww-product-detail__hero-actions,
.ww-product-detail__hero-actions:focus-within {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.ww-surface-grid {
  position: relative;
}

.ww-surface-grid::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, var(--ww-grid-dot) 1px, transparent 1px);
  background-size: var(--ww-grid-size) var(--ww-grid-size);
  mask-image: radial-gradient(ellipse 85% 70% at 50% 0%, black 15%, transparent 78%);
  opacity: 0.85;
}

.ww-product-detail__hero-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  background: var(--ww-inset);
}

.ww-product-detail__hero-frame > * {
  position: relative;
  z-index: 1;
}

.ww-product-detail__hero-img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.ww-product-detail__hero-placeholder {
  font-size: 2.5rem;
  color: var(--ww-ink-faint);
  opacity: 0.35;
}

.ww-product-detail__credit {
  padding: 0 0.125rem;
}

.ww-product-detail__thumbs-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.ww-product-detail__thumbs {
  display: flex;
  flex: 1;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 2px 0;
}

.ww-product-detail__thumbs::-webkit-scrollbar {
  display: none;
}

.ww-product-detail__thumbs-nav {
  display: inline-flex;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 999px;
  color: var(--ww-ink-muted);
  background: var(--ww-elevated);
  box-shadow: var(--ww-shadow-soft);
  cursor: pointer;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-product-detail__thumbs-nav:hover {
  color: var(--ww-ink);
  background: var(--ww-list-hover-bg);
}

.ww-product-detail__thumbs-nav:active {
  transform: scale(0.94);
}

.ww-product-detail__thumbs-nav:focus-visible {
  outline: none;
  box-shadow: var(--ww-focus-ring);
}

.ww-product-detail__info {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}

.ww-product-detail__intro {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ww-product-detail__eyebrow {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ww-accent);
}

.ww-product-detail__title {
  margin: 0;
  font-size: clamp(1.375rem, 2.5vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: var(--ww-ink);
}

.ww-product-detail__lead {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: var(--ww-ink-muted);
}

.ww-product-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ww-product-detail__pill-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.375rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  line-height: 1;
  font-weight: 500;
  color: var(--ww-tag-fg);
  background: var(--ww-tag-bg);
  border: 1px solid var(--ww-tag-border);
}

.ww-product-detail__spec-block {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.ww-product-detail__specs {
  margin: 0;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.625rem;
  overflow: hidden;
  background: var(--ww-elevated);
}

.ww-product-detail__spec-row {
  display: grid;
  grid-template-columns: minmax(6.5rem, 38%) 1fr;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--ww-border-faint);
  font-size: 0.8125rem;
}

.ww-product-detail__spec-row:last-child {
  border-bottom: none;
}

.ww-product-detail__spec-row dt {
  margin: 0;
  font-weight: 500;
  color: var(--ww-ink-muted);
}

.ww-product-detail__spec-row dd {
  margin: 0;
  color: var(--ww-ink);
  font-weight: 500;
}

.ww-product-detail__actions {
  padding-top: 0.25rem;
}

.ww-product-detail__desc {
  flex: none;
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--ww-border-subtle);
  box-sizing: border-box;
}

.ww-product-detail__desc .ww-section-label {
  margin: 0 0 1rem;
}

.ww-product-detail__prose {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.ww-product-detail__desc-head .ww-section-label {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--ww-ink-muted);
}

.ww-product-detail__thumb {
  flex-shrink: 0;
  width: 3.75rem;
  height: 3.75rem;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  background: var(--ww-panel);
  padding: 0;
  cursor: pointer;
  transition:
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-product-detail__thumb:hover {
  opacity: 0.88;
}

.ww-product-detail__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ww-product-detail__thumb--active {
  border-color: var(--ww-accent);
}

.ww-product-detail__thumb--add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ww-ink-muted);
  border: 2px dashed var(--ww-thumb-add-dash);
  background: var(--ww-elevated);
}

.ww-product-detail__thumb--add:hover:not(:disabled) {
  color: var(--ww-ink);
  border-color: var(--ww-thumb-add-dash);
  background: var(--ww-panel);
}

.ww-product-detail__thumb--add:disabled {
  opacity: 0.5;
  cursor: wait;
}

.ww-product-detail__updated {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
}

.ww-product-detail__desc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.ww-product-detail__desc-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.ww-product-detail__desc-btn {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ww-glass-border);
  border-radius: 0.5rem;
  background: var(--ww-elevated);
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    border-color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-product-detail__desc-btn:hover {
  color: var(--ww-ink);
  border-color: var(--ww-border-subtle);
  background: var(--ww-panel);
}

.ww-product-detail__desc-btn--primary {
  color: #fff;
  border-color: transparent;
  background: var(--ww-accent);
}

.ww-product-detail__desc-btn--primary:hover {
  color: #fff;
  background: var(--ww-accent-hover, var(--ww-accent));
}

[data-theme='dark'] .ww-product-detail__desc-btn--primary {
  color: #121214;
  background: var(--ww-accent);
}

[data-theme='dark'] .ww-product-detail__desc-btn--primary:hover {
  color: #121214;
  background: var(--ww-accent-hover, var(--ww-accent));
}

/* 可关闭的确认对话框 */
.ww-dismiss-confirm__message {
  margin: 0 0 0.875rem;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--ww-ink-muted);
}

.ww-dismiss-confirm__skip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-muted);
  cursor: pointer;
  user-select: none;
}

.ww-product-detail__desc-editor {
  width: 100%;
  max-width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.ww-product-detail__desc-empty {
  margin: 0;
  width: 100%;
  font-size: 0.875rem;
  color: var(--ww-ink-faint);
}

.ww-product-detail__hero-frame--openable {
  cursor: zoom-in;
}

.ww-product-detail__hero-frame--openable .ww-product-detail__hero-img {
  cursor: zoom-in;
}
</style>
