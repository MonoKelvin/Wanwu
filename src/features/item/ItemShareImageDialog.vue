<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SelectButton from 'primevue/selectbutton'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import {
  SHARE_TARGETS,
  SHARE_TEMP_EXPIRE_LABEL,
  type ShareTarget,
  type ShareTargetId
} from '@features/item/constants/shareTargets'
import type { Item } from '@shared/types/item'
import type { MediaAttribution } from '@shared/types/unsplash'
import { buildItemShareText } from '@features/item/utils/buildItemCopyText'
import { buildQzoneShareUrl, buildWeiboShareUrl } from '@features/item/utils/buildSocialShareUrl'
import { captureDetailLongImage } from '@features/item/utils/captureDetailLongImage'
import {
  buildDetailShareHtml,
  type DetailGallerySlide,
  type ShareExportFormat
} from '@features/item/utils/exportDetailHtml'

const props = defineProps<{
  visible: boolean
  item: Item | null
  captureEl: HTMLElement | null
  gallerySlides: DetailGallerySlide[]
  heroUrl: string | null
  heroAttribution: MediaAttribution | null
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  toast: [message: string]
}>()

const previewUrl = ref<string | null>(null)
const previewHtml = ref<string | null>(null)
const generating = ref(false)
const loadingTarget = ref<ShareTargetId | null>(null)
const error = ref('')
const nativeShareAvailable = ref(false)

const format = ref<ShareExportFormat>('png')
const formatOptions = [
  { label: 'PNG', value: 'png' as const },
  { label: 'JPEG', value: 'jpeg' as const },
  { label: 'HTML', value: 'html' as const }
]

const visibleTargets = computed(() =>
  SHARE_TARGETS.filter((t) => {
    if (t.nativeOnly && !nativeShareAvailable.value) return false
    if (format.value === 'html' && t.imageOnly) return false
    return true
  })
)

const showUploadHint = computed(
  () => format.value !== 'html' && visibleTargets.value.some((t) => t.requiresUpload)
)

async function refreshNativeShareAvailability() {
  try {
    nativeShareAvailable.value = await window.wanwu.share.canNativeShare()
  } catch {
    nativeShareAvailable.value = false
  }
}

async function renderPreview() {
  if (!props.item) return
  generating.value = true
  error.value = ''
  try {
    if (format.value === 'html') {
      previewHtml.value = await buildDetailShareHtml({
        item: props.item,
        gallery: props.gallerySlides,
        heroUrl: props.heroUrl,
        heroAttribution: props.heroAttribution
      })
    } else {
      if (!props.captureEl) {
        error.value = '无法渲染预览'
        return
      }
      previewUrl.value = await captureDetailLongImage(props.captureEl, format.value)
    }
  } catch {
    error.value = format.value === 'html' ? '生成 HTML 失败，请稍后重试' : '生成长图失败，请稍后重试'
  } finally {
    generating.value = false
  }
}

watch(
  () =>
    [props.visible, props.item?.id, props.captureEl, props.heroUrl, props.gallerySlides.length] as const,
  async ([open]) => {
    if (!open || !props.item) return
    previewUrl.value = null
    previewHtml.value = null
    await refreshNativeShareAvailability()
    await renderPreview()
  }
)

watch(format, async () => {
  if (props.visible && props.item) await renderPreview()
})

function safeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 48)
}

function shareFileName() {
  const base = props.item ? safeFileName(props.item.name) : 'wanwu-share'
  if (format.value === 'html') return `${base}-share.html`
  const ext = format.value === 'jpeg' ? 'jpg' : 'png'
  return `${base}-share.${ext}`
}

function imageReady() {
  return format.value !== 'html' && Boolean(previewUrl.value)
}

async function saveToLocal() {
  if (!props.item) return false
  try {
    const base = safeFileName(props.item.name)
    if (format.value === 'html') {
      if (!previewHtml.value) return false
      const result = await window.wanwu.shell.saveTextFile({
        content: previewHtml.value,
        defaultName: `${base}-share.html`,
        extension: 'html'
      })
      if (result.ok) {
        emit('toast', '已保存 HTML 文件')
        return true
      }
      return false
    }

    if (!previewUrl.value) return false
    const ext = format.value === 'jpeg' ? 'jpg' : 'png'
    const result = await window.wanwu.shell.saveImageDataUrl({
      dataUrl: previewUrl.value,
      defaultName: `${base}-share.${ext}`
    })
    if (result.ok) {
      emit('toast', '已保存长图')
      return true
    }
    return false
  } finally {
    loadingTarget.value = null
  }
}

async function shareViaSystem() {
  if (!props.item) return false
  try {
    const shareText = buildItemShareText(props.item)
    const result = await window.wanwu.share.nativeShare({
      title: props.item.name,
      text: shareText,
      dataUrl: format.value === 'html' ? undefined : previewUrl.value ?? undefined,
      textContent: format.value === 'html' ? previewHtml.value ?? undefined : undefined,
      fileName: shareFileName()
    })
    if (result.ok) {
      emit('toast', '已通过系统分享')
      return true
    }
    if (result.canceled) return false
    emit('toast', '系统分享不可用')
    return false
  } finally {
    loadingTarget.value = null
  }
}

async function shareViaSocial(target: 'weibo' | 'qqzone') {
  if (!props.item || !previewUrl.value) return false
  try {
    const upload = await window.wanwu.share.uploadTemp({
      dataUrl: previewUrl.value,
      fileName: shareFileName(),
      expire: '24h'
    })
    if (!upload.ok) {
      emit('toast', '临时上传失败，请检查网络后重试')
      return false
    }

    const title = buildItemShareText(props.item)
    const summary = props.item.summary ?? title
    const shareUrl =
      target === 'weibo'
        ? buildWeiboShareUrl({ title, picUrl: upload.url })
        : buildQzoneShareUrl({ title, summary, picUrl: upload.url, pageUrl: upload.url })

    await window.wanwu.shell.openExternal(shareUrl)
    emit(
      'toast',
      `已打开${target === 'weibo' ? '微博' : 'QQ 空间'}分享页；链接 ${SHARE_TEMP_EXPIRE_LABEL} 后失效，请尽快完成分享`
    )
    return true
  } catch {
    emit('toast', '分享失败，请完全重启应用后重试')
    return false
  } finally {
    loadingTarget.value = null
  }
}

async function onTargetClick(target: ShareTarget) {
  if (generating.value || loadingTarget.value) return
  if (target.imageOnly && format.value === 'html') return
  if (target.imageOnly && !imageReady()) {
    emit('toast', '请等待长图生成完成')
    return
  }
  if (format.value === 'html' && !previewHtml.value && target.id === 'local') {
    emit('toast', '请等待 HTML 生成完成')
    return
  }

  loadingTarget.value = target.id
  switch (target.id) {
    case 'local':
      await saveToLocal()
      break
    case 'system':
      await shareViaSystem()
      break
    case 'weibo':
      await shareViaSocial('weibo')
      break
    case 'qqzone':
      await shareViaSocial('qqzone')
      break
  }
}
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    header="分享长图"
    strong-blur
    width-class="w-[min(32rem,96vw)]"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="ww-share-image-dialog__hint">
      导出 PNG / JPEG 长图或 HTML 文件。HTML 仅支持保存到本地或系统分享；社交平台需使用 PNG / JPEG。
    </p>

    <div class="ww-share-image-dialog__preview">
      <div class="ww-share-image-dialog__preview-body">
        <p
          v-if="error && !previewUrl && !previewHtml"
          class="ww-share-image-dialog__status ww-share-image-dialog__status--err"
        >
          {{ error }}
        </p>
        <iframe
          v-else-if="format === 'html' && previewHtml"
          class="ww-share-image-dialog__html-preview"
          title="HTML 预览"
          sandbox="allow-same-origin"
          :srcdoc="previewHtml"
        />
        <img
          v-else-if="previewUrl"
          :src="previewUrl"
          alt="分享长图预览"
          class="ww-share-image-dialog__img"
        />
        <p v-else-if="!generating" class="ww-share-image-dialog__status">暂无预览</p>
      </div>
      <div v-if="generating" class="ww-share-image-dialog__preview-overlay" aria-live="polite">
        {{ format === 'html' ? '正在生成 HTML…' : '正在渲染长图…' }}
      </div>
    </div>

    <div class="ww-share-image-dialog__format-row">
      <SelectButton
        v-model="format"
        class="ww-settings-segment"
        :options="formatOptions"
        option-label="label"
        option-value="value"
        :disabled="generating || Boolean(loadingTarget)"
      />
    </div>

    <section class="ww-share-image-dialog__targets-wrap" aria-label="分享方式">
      <p class="ww-share-image-dialog__targets-title">分享至</p>
      <div class="ww-share-image-dialog__targets">
        <button
          v-for="target in visibleTargets"
          :key="target.id"
          type="button"
          class="ww-share-image-dialog__target"
          :class="{ 'ww-share-image-dialog__target--loading': loadingTarget === target.id }"
          :title="target.label"
          :disabled="generating || Boolean(loadingTarget)"
          @click="onTargetClick(target)"
        >
          <WwIcon
            :name="loadingTarget === target.id ? 'loader' : target.icon"
            size="sm"
            :spin="loadingTarget === target.id"
          />
          <span class="ww-share-image-dialog__target-label">{{ target.label }}</span>
        </button>
      </div>
      <p v-if="showUploadHint" class="ww-share-image-dialog__upload-hint">
        将先上传至临时图床（Litterbox），链接 {{ SHARE_TEMP_EXPIRE_LABEL }} 后自动失效，请尽快完成分享。
      </p>
    </section>
  </WwGlassDialog>
</template>
