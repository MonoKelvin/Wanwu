<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import PixelImportCropEditor from '@modules/library/pixel-art/components/PixelImportCropEditor.vue'
import {
  clampImportSettings,
  createDocumentFromImport,
  DEFAULT_PIXEL_IMPORT_SETTINGS,
  loadImageElementFromSource,
  maxPixelRatioDenominator,
  normalizeImportTitle,
  outputSizeFromPixelRatio,
  processImageImport,
  type PixelImportSettings
} from '@modules/library/pixel-art/lib/pixelImageImport'
import { TEMPLATE_PREVIEW_PIXEL_RATIO } from '@modules/library/pixel-art/lib/pixelDisplayMapping'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'

export type PixelImportSource =
  | { kind: 'path'; path: string }
  | { kind: 'url'; url: string }

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: [payload: { title: string; content: PixelDocument }]
}>()

const props = defineProps<{
  source?: PixelImportSource | null
  onlineMode?: boolean
  busy?: boolean
}>()

const loading = ref(false)
const loadError = ref('')
const imageEl = ref<HTMLImageElement | null>(null)
const revokeSrc = ref<(() => void) | undefined>()
const title = ref('导入的像素画')
const settings = ref<PixelImportSettings>({ ...DEFAULT_PIXEL_IMPORT_SETTINGS })
const pixelRatio = ref(TEMPLATE_PREVIEW_PIXEL_RATIO)
const urlInput = ref('')
const cropEditorRef = ref<InstanceType<typeof PixelImportCropEditor> | null>(null)
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)

const needsSource = computed(() => !props.source && !imageEl.value && !loading.value)

const outputSize = computed(() => {
  const image = imageEl.value
  if (!image?.naturalWidth) return { width: 0, height: 0 }
  return outputSizeFromPixelRatio(image, settings.value.crop, pixelRatio.value)
})

const ratioMax = computed(() => {
  const image = imageEl.value
  if (!image?.naturalWidth) return 64
  const sw = Math.max(1, Math.round(image.naturalWidth * settings.value.crop.w))
  const sh = Math.max(1, Math.round(image.naturalHeight * settings.value.crop.h))
  return maxPixelRatioDenominator(sw, sh)
})

watch(
  () => [open.value, props.source, props.onlineMode] as const,
  ([visible, source]) => {
    if (visible) {
      resetState()
      if (source) void loadSource(source)
    } else {
      cleanupImage()
    }
  }
)

watch(
  [settings, pixelRatio],
  () => {
    void schedulePreviewDraw()
  },
  { deep: true }
)

watch(
  () => loading.value,
  (isLoading) => {
    if (!isLoading && imageEl.value) void schedulePreviewDraw()
  }
)

watch(ratioMax, (max) => {
  if (pixelRatio.value > max) pixelRatio.value = max
})

async function schedulePreviewDraw() {
  await nextTick()
  cropEditorRef.value?.remeasure()
  requestAnimationFrame(() => drawPixelPreview())
}

function resetState() {
  loadError.value = ''
  title.value = '导入的像素画'
  settings.value = { ...DEFAULT_PIXEL_IMPORT_SETTINGS }
  pixelRatio.value = TEMPLATE_PREVIEW_PIXEL_RATIO
  urlInput.value = ''
}

function cleanupImage() {
  revokeSrc.value?.()
  revokeSrc.value = undefined
  imageEl.value = null
}

onBeforeUnmount(() => cleanupImage())

async function loadSource(source: PixelImportSource) {
  loading.value = true
  loadError.value = ''
  cleanupImage()
  try {
    const { image, revoke } = await loadImageElementFromSource(source)
    imageEl.value = image
    revokeSrc.value = revoke
    settings.value.crop = { x: 0, y: 0, w: 1, h: 1 }
    if (source.kind === 'path') {
      const base = source.path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '')
      if (base) title.value = normalizeImportTitle(base)
    }
    await schedulePreviewDraw()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadFromUrl() {
  const url = urlInput.value.trim()
  if (!url) return
  await loadSource({ kind: 'url', url })
}

async function pickLocalImage() {
  const pick = await window.wanwu.shell.pickImageFile()
  if (!pick.ok || !pick.path) return
  await loadSource({ kind: 'path', path: pick.path })
}

function previewDisplayScale(width: number, height: number): number {
  const maxSide = Math.max(width, height)
  return Math.max(4, Math.min(16, Math.floor(220 / maxSide)))
}

function drawPixelPreview() {
  const canvas = previewCanvasRef.value
  const image = imageEl.value
  if (!canvas || !image || !image.naturalWidth) return
  try {
    const size = outputSize.value
    const draft = clampImportSettings({
      ...settings.value,
      outputWidth: size.width,
      outputHeight: size.height
    })
    const result = processImageImport(image, draft)
    const displayScale = previewDisplayScale(result.width, result.height)
    canvas.width = result.width * displayScale
    canvas.height = result.height * displayScale
    const tmp = document.createElement('canvas')
    tmp.width = result.width
    tmp.height = result.height
    const tmpCtx = tmp.getContext('2d')
    if (!tmpCtx) return
    tmpCtx.putImageData(new ImageData(result.pixels, result.width, result.height), 0, 0)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height)
  } catch {
    /* preview errors ignored */
  }
}

function handleConfirm() {
  const image = imageEl.value
  if (!image) return
  const size = outputSize.value
  const s = clampImportSettings({
    ...settings.value,
    outputWidth: size.width,
    outputHeight: size.height
  })
  const { pixels, width, height } = processImageImport(image, s)
  const content = createDocumentFromImport(pixels, width, height, title.value)
  content.meta.grid.size = Math.max(1, Math.min(16, Math.floor(pixelRatio.value)))
  emit('confirm', { title: normalizeImportTitle(title.value), content })
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    header="导入图片为像素画"
    modal
    append-to="body"
    class="ww-glass-dialog pa-wizard-dialog w-[min(56rem,96vw)]"
    :closable="!busy"
    :close-on-escape="!busy"
  >
    <div v-if="loading" class="pa-wizard-dialog__status">加载图片中…</div>

    <div v-else-if="needsSource && onlineMode" class="pa-wizard-dialog__source">
      <p v-if="loadError" class="pa-wizard-dialog__error">{{ loadError }}</p>
      <label class="pa-wizard-dialog__field">
        <span class="pa-wizard-dialog__field-label">在线图片地址</span>
        <div class="pa-wizard-dialog__url-row">
          <InputText
            v-model="urlInput"
            class="w-full"
            autofocus
            placeholder="https://example.com/image.png"
            @keydown.enter.prevent="loadFromUrl"
          />
          <WwButton label="加载" :disabled="!urlInput.trim()" @click="loadFromUrl" />
        </div>
      </label>
    </div>

    <p v-else-if="loadError" class="pa-wizard-dialog__error">{{ loadError }}</p>

    <div v-else-if="needsSource" class="pa-wizard-dialog__source">
      <p class="pa-wizard-dialog__hint">请选择要导入的图片</p>
      <WwButton icon="folder-open" label="选择本地图片" @click="pickLocalImage" />
    </div>

    <div v-else class="pa-wizard-dialog__body">
      <div class="pa-wizard-dialog__preview">
        <div class="pa-wizard-dialog__preview-head">
          <span class="pa-wizard-dialog__preview-title">裁剪与预览</span>
          <span class="pa-wizard-dialog__preview-meta">
            输出 {{ outputSize.width }}×{{ outputSize.height }} px
          </span>
        </div>
        <div class="pa-wizard-dialog__preview-stage pa-wizard-dialog__preview-stage--tall">
          <PixelImportCropEditor
            ref="cropEditorRef"
            v-model="settings.crop"
            :image="imageEl"
          />
        </div>
        <div class="pa-wizard-dialog__pixel-preview">
          <span class="pa-wizard-dialog__pixel-preview-label">像素化预览</span>
          <div class="pa-wizard-dialog__pixel-preview-wrap">
            <canvas ref="previewCanvasRef" class="pa-wizard-dialog__pixel-canvas" />
          </div>
        </div>
      </div>

      <div class="pa-wizard-dialog__form">
        <label class="pa-wizard-dialog__field pa-wizard-dialog__field--primary">
          <span class="pa-wizard-dialog__field-label">名称</span>
          <InputText v-model="title" class="w-full" placeholder="导入的像素画" />
        </label>

        <div class="pa-wizard-dialog__group">
          <WwSettingsRow label="像素比率">
            <div class="pa-wizard-dialog__ratio">
              <span class="pa-wizard-dialog__ratio-prefix">1:</span>
              <WwNumberInput
                size="compact"
                :model-value="pixelRatio"
                :min="1"
                :max="ratioMax"
                @update:model-value="(v) => v != null && (pixelRatio = v)"
              />
            </div>
          </WwSettingsRow>
          <WwSettingsRow label="输出尺寸">
            <span class="pa-wizard-dialog__readonly">{{ outputSize.width }}×{{ outputSize.height }}</span>
          </WwSettingsRow>
        </div>

        <WwButton
          type="button"
          icon="folder-open"
          label="更换图片"
          severity="secondary"
          text
          size="small"
          @click="pickLocalImage"
        />
      </div>
    </div>

    <template #footer>
      <WwButton label="取消" severity="secondary" text :disabled="busy" @click="open = false" />
      <WwButton
        label="导入"
        :disabled="!imageEl || busy || loading"
        :loading="busy"
        @click="handleConfirm"
      />
    </template>
  </Dialog>
</template>
