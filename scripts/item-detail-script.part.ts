import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@app/components/EmptyState.vue'
import ItemDetailHeroActions from '@features/item/ItemDetailHeroActions.vue'
import ItemMarkdown from '@features/item/ItemMarkdown.vue'
import FavoriteGroupPickerDialog from '@features/item/FavoriteGroupPickerDialog.vue'
import ItemShareCardDialog from '@features/item/ItemShareCardDialog.vue'
import ItemShareImageDialog from '@features/item/ItemShareImageDialog.vue'
import { buildItemCopyText } from '@features/item/utils/buildItemCopyText'
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

const isLibrary = computed(() => (route.params.source as string) === 'library')

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

function cancelDescEdit() {
  descEditing.value = false
  descDraft.value = ''
}

async function saveDescEdit() {
  if (!item.value) return
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