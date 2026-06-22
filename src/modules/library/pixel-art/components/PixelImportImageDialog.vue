<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Slider from 'primevue/slider'
import WwButton from '@shared/components/WwButton.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import {
  clampImportSettings,
  createDocumentFromImport,
  DEFAULT_PIXEL_IMPORT_SETTINGS,
  loadImageElementFromSource,
  normalizeImportTitle,
  processImageImport,
  suggestOutputSize,
  type PixelImportSettings
} from '@modules/library/pixel-art/lib/pixelImageImport'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import { PIXEL_MAX_HEIGHT, PIXEL_MAX_WIDTH, PIXEL_SIZE_PRESETS } from '@modules/library/pixel-art/domain/meta'

export type PixelImportSource =
  | { kind: 'path'; path: string }
  | { kind: 'url'; url: string }

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: [payload: { title: string; content: PixelDocument }]
}>()

const props = defineProps<{
  source?: PixelImportSource | null
  busy?: boolean
}>()

const loading = ref(false)
const loadError = ref('')
const imageEl = ref<HTMLImageElement | null>(null)
const revokeSrc = ref<(() => void) | undefined>()
const title = ref('导入的像素画')
const settings = ref<PixelImportSettings>({ ...DEFAULT_PIXEL_IMPORT_SETTINGS })
const lockAspect = ref(true)
const urlInput = ref('')
const pickingUrl = ref(false)

const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const sourceCanvasRef = ref<HTMLCanvasElement | null>(null)

const needsSource = computed(() => !props.source && !imageEl.value && !loading.value)

const cropMarginTop = computed({
  get: () => Math.round(settings.value.crop.y * 100),
  set: (v: number) => {
    settings.value.crop.y = Math.min(45, Math.max(0, v)) / 100
  }
})
const cropMarginLeft = computed({
  get: () => Math.round(settings.value.crop.x * 100),
  set: (v: number) => {
    settings.value.crop.x = Math.min(45, Math.max(0, v)) / 100
  }
})
const cropMarginRight = computed({
  get: () => Math.round((1 - settings.value.crop.x - settings.value.crop.w) * 100),
  set: (v: number) => {
    const right = Math.min(45, Math.max(0, v)) / 100
    settings.value.crop.w = Math.max(0.05, 1 - settings.value.crop.x - right)
  }
})
const cropMarginBottom = computed({
  get: () => Math.round((1 - settings.value.crop.y - settings.value.crop.h) * 100),
  set: (v: number) => {
    const bottom = Math.min(45, Math.max(0, v)) / 100
    settings.value.crop.h = Math.max(0.05, 1 - settings.value.crop.y - bottom)
  }
})

watch(
  () => [open.value, props.source] as const,
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
  settings,
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

watch(lockAspect, (locked) => {
  if (locked && imageEl.value) {
    const size = suggestOutputSize(imageEl.value, settings.value.crop)
    settings.value.outputWidth = size.width
    settings.value.outputHeight = size.height
  }
})

async function schedulePreviewDraw() {
  await nextTick()
  requestAnimationFrame(() => {
    drawSourcePreview()
    drawPixelPreview()
  })
}

function resetState() {
  loadError.value = ''
  title.value = '导入的像素画'
  settings.value = { ...DEFAULT_PIXEL_IMPORT_SETTINGS }
  urlInput.value = ''
  pickingUrl.value = false
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
    const size = suggestOutputSize(image, settings.value.crop)
    settings.value.outputWidth = size.width
    settings.value.outputHeight = size.height
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
  pickingUrl.value = false
  await loadSource({ kind: 'url', url })
}

async function pickLocalAgain() {
  const pick = await window.wanwu.shell.pickImageFile()
  if (!pick.ok || !pick.path) return
  await loadSource({ kind: 'path', path: pick.path })
}

function drawSourcePreview() {
  const canvas = sourceCanvasRef.value
  const image = imageEl.value
  if (!canvas || !image || !image.naturalWidth) return
  const max = 300
  const scale = Math.min(max / image.naturalWidth, max / image.naturalHeight, 1)
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const crop = settings.value.crop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.clearRect(
    crop.x * canvas.width,
    crop.y * canvas.height,
    crop.w * canvas.width,
    crop.h * canvas.height
  )
  ctx.drawImage(
    image,
    crop.x * image.naturalWidth,
    crop.y * image.naturalHeight,
    crop.w * image.naturalWidth,
    crop.h * image.naturalHeight,
    crop.x * canvas.width,
    crop.y * canvas.height,
    crop.w * canvas.width,
    crop.h * canvas.height
  )
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.95)'
  ctx.lineWidth = 2
  ctx.strokeRect(
    crop.x * canvas.width,
    crop.y * canvas.height,
    crop.w * canvas.width,
    crop.h * canvas.height
  )
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
    const result = processImageImport(image, settings.value)
    const displayScale = previewDisplayScale(result.width, result.height)
    canvas.width = result.width * displayScale
    canvas.height = result.height * displayScale
    const tmp = document.createElement('canvas')
    tmp.width = result.width
    tmp.height = result.height
    const tmpCtx = tmp.getContext('2d')
    if (!tmpCtx) return
    const imgData = new ImageData(result.pixels, result.width, result.height)
    tmpCtx.putImageData(imgData, 0, 0)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height)
  } catch {
    /* preview errors ignored */
  }
}

function setOutputPreset(size: number) {
  const image = imageEl.value
  if (!image) {
    settings.value.outputWidth = size
    settings.value.outputHeight = size
    return
  }
  const aspect =
    (image.naturalWidth * settings.value.crop.w) / (image.naturalHeight * settings.value.crop.h)
  if (aspect >= 1) {
    settings.value.outputWidth = size
    settings.value.outputHeight = Math.min(PIXEL_MAX_HEIGHT, Math.max(1, Math.round(size / aspect)))
  } else {
    settings.value.outputHeight = size
    settings.value.outputWidth = Math.min(PIXEL_MAX_WIDTH, Math.max(1, Math.round(size * aspect)))
  }
}

function onOutputWidthChange(value: number | number[]) {
  const v = Array.isArray(value) ? value[0] : value
  if (v == null) return
  settings.value.outputWidth = v
  if (lockAspect.value && imageEl.value) {
    const aspect =
      (imageEl.value.naturalWidth * settings.value.crop.w) /
      (imageEl.value.naturalHeight * settings.value.crop.h)
    settings.value.outputHeight = Math.min(
      PIXEL_MAX_HEIGHT,
      Math.max(1, Math.round(v / aspect))
    )
  }
}

function onOutputHeightChange(value: number | number[]) {
  const v = Array.isArray(value) ? value[0] : value
  if (v == null) return
  settings.value.outputHeight = v
  if (lockAspect.value && imageEl.value) {
    const aspect =
      (imageEl.value.naturalWidth * settings.value.crop.w) /
      (imageEl.value.naturalHeight * settings.value.crop.h)
    settings.value.outputWidth = Math.min(
      PIXEL_MAX_WIDTH,
      Math.max(1, Math.round(v * aspect))
    )
  }
}

function handleConfirm() {
  const image = imageEl.value
  if (!image) return
  const s = clampImportSettings(settings.value)
  const { pixels, width, height } = processImageImport(image, s)
  const content = createDocumentFromImport(pixels, width, height, title.value)
  emit('confirm', { title: normalizeImportTitle(title.value), content })
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    header="导入图片为像素画"
    modal
    append-to="body"
    class="ww-glass-dialog pa-import-dialog w-[min(52rem,96vw)]"
    :closable="!busy"
    :close-on-escape="!busy"
  >
    <div v-if="loading" class="pa-import-dialog__status">加载图片中…</div>
    <p v-else-if="loadError" class="pa-import-dialog__error">{{ loadError }}</p>

    <div v-else-if="needsSource" class="pa-import-dialog__source-picker">
      <p class="pa-import-dialog__hint">选择本地图片，或粘贴在线图片地址</p>
      <div class="pa-import-dialog__source-actions">
        <WwButton icon="folder-open" label="选择本地图片" @click="pickLocalAgain" />
        <WwButton
          icon="link"
          label="在线图片"
          severity="secondary"
          variant="outlined"
          @click="pickingUrl = true"
        />
      </div>
      <div v-if="pickingUrl" class="pa-import-dialog__url-field">
        <InputText
          v-model="urlInput"
          class="w-full"
          placeholder="https://example.com/image.png"
          @keydown.enter.prevent="loadFromUrl"
        />
        <WwButton label="加载" :disabled="!urlInput.trim()" @click="loadFromUrl" />
      </div>
    </div>

    <div v-else class="pa-import-dialog__body">
      <div class="pa-import-dialog__preview-col">
        <div class="pa-import-dialog__preview-block">
          <span class="pa-import-dialog__preview-label">原图与裁剪</span>
          <div class="pa-import-dialog__canvas-wrap">
            <canvas ref="sourceCanvasRef" class="pa-import-dialog__canvas" />
          </div>
        </div>
        <div class="pa-import-dialog__preview-block">
          <span class="pa-import-dialog__preview-label">像素化预览</span>
          <div class="pa-import-dialog__canvas-wrap pa-import-dialog__canvas-wrap--pixel">
            <canvas ref="previewCanvasRef" class="pa-import-dialog__canvas pa-import-dialog__canvas--pixel" />
          </div>
          <span class="pa-import-dialog__preview-meta">
            {{ settings.outputWidth }}×{{ settings.outputHeight }} px
          </span>
        </div>
      </div>

      <div class="pa-import-dialog__controls">
        <label class="pa-import-dialog__field">
          <span class="pa-import-dialog__field-label">文件名</span>
          <InputText v-model="title" class="w-full" placeholder="导入的像素画" />
        </label>

        <div class="pa-import-dialog__section">
          <span class="pa-import-dialog__section-label">裁剪边距 (%)</span>
          <div class="pa-import-dialog__slider-grid">
            <label>上 <Slider v-model="cropMarginTop" :min="0" :max="45" /></label>
            <label>左 <Slider v-model="cropMarginLeft" :min="0" :max="45" /></label>
            <label>右 <Slider v-model="cropMarginRight" :min="0" :max="45" /></label>
            <label>下 <Slider v-model="cropMarginBottom" :min="0" :max="45" /></label>
          </div>
        </div>

        <div class="pa-import-dialog__section">
          <span class="pa-import-dialog__section-label">输出尺寸</span>
          <div class="pa-import-dialog__preset-row">
            <button
              v-for="size in PIXEL_SIZE_PRESETS"
              :key="size"
              type="button"
              class="pa-import-dialog__preset-btn"
              @click="setOutputPreset(size)"
            >
              {{ size }}
            </button>
          </div>
          <div class="pa-import-dialog__size-row">
            <label>宽
              <Slider
                :model-value="settings.outputWidth"
                :min="1"
                :max="PIXEL_MAX_WIDTH"
                @update:model-value="onOutputWidthChange"
              />
            </label>
            <label>高
              <Slider
                :model-value="settings.outputHeight"
                :min="1"
                :max="PIXEL_MAX_HEIGHT"
                @update:model-value="onOutputHeightChange"
              />
            </label>
          </div>
          <WwSettingsRow label="锁定宽高比">
            <WwToggleSwitch v-model="lockAspect" />
          </WwSettingsRow>
        </div>

        <div class="pa-import-dialog__section">
          <span class="pa-import-dialog__section-label">颜色调整</span>
          <label>亮度
            <Slider v-model="settings.color.brightness" :min="-100" :max="100" />
          </label>
          <label>对比度
            <Slider v-model="settings.color.contrast" :min="-100" :max="100" />
          </label>
          <label>饱和度
            <Slider v-model="settings.color.saturation" :min="-100" :max="100" />
          </label>
        </div>

        <WwButton
          type="button"
          icon="folder-open"
          label="更换图片"
          severity="secondary"
          text
          size="small"
          @click="pickLocalAgain"
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
