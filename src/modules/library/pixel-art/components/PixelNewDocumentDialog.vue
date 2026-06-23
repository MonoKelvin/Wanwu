<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { createBlankPixelDocument } from '@modules/library/pixel-art/lib/blankDocument'
import { maxPixelRatioDenominator } from '@modules/library/pixel-art/lib/pixelImageImport'
import {
  computePreviewFitScale,
  computeWizardPreviewGridStep,
  formatCanvasSizeLabel,
  TEMPLATE_PREVIEW_PIXEL_RATIO
} from '@modules/library/pixel-art/lib/pixelDisplayMapping'
import { PIXEL_MAX_HEIGHT, PIXEL_MAX_WIDTH, PIXEL_WPP_FILE_EXTENSION } from '@modules/library/pixel-art/domain/meta'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'

export interface PixelNewDocumentPayload {
  title: string
  content: PixelDocument
  contentPath?: string
}

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: [payload: PixelNewDocumentPayload]
}>()

defineProps<{
  busy?: boolean
}>()

const toast = useWanwuToast()

const width = ref(512)
const height = ref(512)
const lockAspect = ref(true)
const aspectRatio = ref(1)
const title = ref('未命名像素画')
const savePath = ref('')
const foreground = ref('#000000')
const backgroundColor = ref('#FFFFFF')
const pixelRatio = ref(TEMPLATE_PREVIEW_PIXEL_RATIO)

const previewStageBodyRef = ref<HTMLElement | null>(null)
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
let previewObserver: ResizeObserver | null = null

const sizeLabel = computed(() => formatCanvasSizeLabel(width.value, height.value))
const ratioMax = computed(() => maxPixelRatioDenominator(width.value, height.value))

const pixelRatioModel = computed({
  get: () => pixelRatio.value,
  set: (value: number | null) => {
    if (value == null) return
    pixelRatio.value = Math.max(1, Math.min(ratioMax.value, Math.floor(value)))
  }
})

function resetForm() {
  width.value = 512
  height.value = 512
  lockAspect.value = true
  aspectRatio.value = 1
  title.value = '未命名像素画'
  savePath.value = ''
  foreground.value = '#000000'
  backgroundColor.value = '#FFFFFF'
  pixelRatio.value = TEMPLATE_PREVIEW_PIXEL_RATIO
}

function bindPreviewObserver() {
  previewObserver?.disconnect()
  const body = previewStageBodyRef.value
  if (!body) return
  previewObserver = new ResizeObserver(() => drawPreview())
  previewObserver.observe(body)
}

function drawPreview() {
  const canvas = previewCanvasRef.value
  const body = previewStageBodyRef.value
  if (!canvas || !body) return

  const docW = Math.max(1, Math.floor(width.value))
  const docH = Math.max(1, Math.floor(height.value))
  const pad = 8
  const maxW = Math.max(1, body.clientWidth - pad)
  const maxH = Math.max(1, body.clientHeight - pad)
  const fitScale = computePreviewFitScale(docW, docH, maxW, maxH)
  const cw = Math.max(1, Math.round(docW * fitScale))
  const ch = Math.max(1, Math.round(docH * fitScale))
  const scaleX = cw / docW
  const scaleY = ch / docH
  const gridStep = computeWizardPreviewGridStep(pixelRatio.value)

  canvas.width = cw
  canvas.height = ch
  canvas.style.width = ''
  canvas.style.height = ''

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = backgroundColor.value.trim() || '#ffffff'
  ctx.fillRect(0, 0, cw, ch)

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.lineWidth = 1
  for (let px = gridStep; px < docW; px += gridStep) {
    const x = px * scaleX + 0.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, ch)
    ctx.stroke()
  }
  for (let py = gridStep; py < docH; py += gridStep) {
    const y = py * scaleY + 0.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(cw, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)'
  ctx.strokeRect(0.5, 0.5, cw - 1, ch - 1)
}

watch(open, (visible) => {
  if (visible) {
    resetForm()
    void nextTick(() => {
      bindPreviewObserver()
      drawPreview()
    })
  } else {
    previewObserver?.disconnect()
    previewObserver = null
  }
})

watch([width, height, backgroundColor, pixelRatio], () => {
  if (open.value) drawPreview()
})

watch(ratioMax, (max) => {
  if (pixelRatio.value > max) pixelRatio.value = max
})

function onWidthChange(value: number | null) {
  if (value == null) return
  const w = Math.max(1, Math.min(PIXEL_MAX_WIDTH, Math.floor(value)))
  width.value = w
  if (lockAspect.value) {
    height.value = Math.max(1, Math.min(PIXEL_MAX_HEIGHT, Math.round(w / aspectRatio.value)))
  } else {
    aspectRatio.value = w / height.value
  }
}

function onHeightChange(value: number | null) {
  if (value == null) return
  const h = Math.max(1, Math.min(PIXEL_MAX_HEIGHT, Math.floor(value)))
  height.value = h
  if (lockAspect.value) {
    width.value = Math.max(1, Math.min(PIXEL_MAX_WIDTH, Math.round(h * aspectRatio.value)))
  } else {
    aspectRatio.value = width.value / h
  }
}

watch(lockAspect, (locked) => {
  if (locked) aspectRatio.value = width.value / height.value
})

async function pickSavePath() {
  const base = (title.value.trim() || '未命名像素画')
    .replace(/\.wpp$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .trim()
    .slice(0, 120) || '未命名像素画'
  const defaultPath = `${base}${PIXEL_WPP_FILE_EXTENSION}`
  try {
    const result = await window.wanwu.shell.pickSavePath({
      defaultPath,
      filters: [{ name: 'Wanwu Pixel', extensions: ['wpp'] }]
    })
    if (result.canceled) return
    if (!result.ok || !result.path) {
      toast.error(result.error ?? '未能选择保存路径')
      return
    }
    savePath.value = result.path
  } catch {
    toast.error('打开保存对话框失败')
  }
}

function handleConfirm() {
  const w = Math.max(1, Math.min(PIXEL_MAX_WIDTH, Math.floor(width.value)))
  const h = Math.max(1, Math.min(PIXEL_MAX_HEIGHT, Math.floor(height.value)))
  const name = title.value.trim() || '未命名像素画'
  const content = createBlankPixelDocument(w, h, name)
  content.meta.foreground = foreground.value
  content.meta.backgroundColor = backgroundColor.value
  content.meta.grid.size = Math.max(1, Math.min(16, Math.floor(pixelRatio.value)))
  emit('confirm', {
    title: name,
    content,
    contentPath: savePath.value.trim() || undefined
  })
}

onBeforeUnmount(() => {
  previewObserver?.disconnect()
})
</script>

<template>
  <Dialog
    v-model:visible="open"
    header="新建空白像素画"
    modal
    append-to="body"
    class="ww-glass-dialog pa-new-doc-dialog w-[min(54rem,96vw)]"
    :closable="!busy"
    :close-on-escape="!busy"
  >
    <div class="pa-new-doc">
      <div class="pa-new-doc__stage">
        <div ref="previewStageBodyRef" class="pa-new-doc__stage-body">
          <canvas ref="previewCanvasRef" class="pa-new-doc__canvas" />
        </div>
        <p class="pa-new-doc__meta">
          {{ sizeLabel }} px · 显示 1:{{ pixelRatio }}
        </p>
      </div>

      <div class="pa-new-doc__form">
        <section class="pa-new-doc__section">
          <h3 class="pa-new-doc__section-title">基本信息</h3>
          <div class="pa-new-doc__field">
            <span class="pa-new-doc__label">名称</span>
            <InputText v-model="title" class="w-full" placeholder="未命名像素画" />
          </div>
          <div class="pa-new-doc__field">
            <span class="pa-new-doc__label">保存路径</span>
            <div class="pa-new-doc__path-row">
              <InputText
                v-model="savePath"
                class="w-full"
                readonly
                placeholder="默认保存至「文件」目录"
              />
              <button
                type="button"
                class="pa-new-doc__icon-action"
                aria-label="选择保存路径"
                @click.stop="pickSavePath"
              >
                <WwIcon name="folder-open" size="sm" />
              </button>
            </div>
          </div>
        </section>

        <section class="pa-new-doc__section">
          <h3 class="pa-new-doc__section-title">画布尺寸</h3>
          <div class="pa-new-doc__size-grid">
            <span class="pa-new-doc__label">宽</span>
            <span class="pa-new-doc__size-spacer" aria-hidden="true" />
            <span class="pa-new-doc__label">高</span>
            <WwNumberInput
              :model-value="width"
              :min="1"
              :max="PIXEL_MAX_WIDTH"
              @update:model-value="onWidthChange"
            />
            <button
              type="button"
              class="pa-new-doc__icon-action pa-new-doc__lock-btn"
              :class="{ 'is-active': lockAspect }"
              :aria-label="lockAspect ? '解除宽高比锁定' : '锁定宽高比'"
              @click="lockAspect = !lockAspect"
            >
              <WwIcon name="link" size="sm" />
            </button>
            <WwNumberInput
              :model-value="height"
              :min="1"
              :max="PIXEL_MAX_HEIGHT"
              @update:model-value="onHeightChange"
            />
          </div>
        </section>

        <section class="pa-new-doc__section">
          <h3 class="pa-new-doc__section-title">显示与颜色</h3>
          <WwSettingsRow label="像素比率">
            <div class="pa-new-doc__ratio">
              <span class="pa-new-doc__ratio-prefix">1:</span>
              <WwNumberInput v-model="pixelRatioModel" :min="1" :max="ratioMax" />
            </div>
          </WwSettingsRow>
          <WwSettingsRow label="前景色">
            <WwColorInput v-model="foreground" :block="false" aria-label="前景色" />
          </WwSettingsRow>
          <WwSettingsRow label="背景色">
            <WwColorInput v-model="backgroundColor" :block="false" aria-label="背景色" />
          </WwSettingsRow>
        </section>
      </div>
    </div>

    <template #footer>
      <WwButton label="取消" severity="secondary" text :disabled="busy" @click="open = false" />
      <WwButton label="创建" :loading="busy" :disabled="busy" @click="handleConfirm" />
    </template>
  </Dialog>
</template>

<style scoped>
.pa-new-doc {
  --pa-new-doc-control-h: var(--ww-select-height, 2.3125rem);
  --pa-new-doc-control-w: 6.5rem;
  --pa-new-doc-preview-min-h: 20rem;

  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 19rem);
  grid-template-rows: minmax(var(--pa-new-doc-preview-min-h), 1fr);
  gap: 0 1.25rem;
  align-items: stretch;
  min-height: var(--pa-new-doc-preview-min-h);
}

@media (max-width: 768px) {
  .pa-new-doc {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }

  .pa-new-doc__stage,
  .pa-new-doc__form {
    grid-column: 1;
  }

  .pa-new-doc__stage {
    grid-row: 1;
    min-height: 12rem;
  }

  .pa-new-doc__form {
    grid-row: 2;
  }
}

.pa-new-doc__stage {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 1rem;
  border: 1px solid var(--ww-border-subtle);
  border-radius: var(--pa-radius);
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--ww-accent) 6%, transparent), transparent 52%),
    var(--ww-inset);
}

.pa-new-doc__stage-body {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
}

.pa-new-doc__canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  border-radius: 0.375rem;
  image-rendering: pixelated;
  box-shadow:
    inset 0 0 0 1px rgb(0 0 0 / 0.06),
    0 0 0 1px var(--ww-border-subtle);
}

[data-theme='dark'] .pa-new-doc__canvas {
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.05),
    0 0 0 1px var(--ww-border-subtle);
}

.pa-new-doc__form {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  min-width: 0;
}

.pa-new-doc__meta {
  flex-shrink: 0;
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--ww-ink-faint);
}

.pa-new-doc__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ww-border-subtle);
  border-radius: calc(var(--pa-radius) - 0.125rem);
  background: color-mix(in srgb, var(--ww-content) 92%, var(--ww-inset));
}

.pa-new-doc__section-title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}

.pa-new-doc__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.pa-new-doc__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ww-ink-muted);
}

.pa-new-doc__path-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--pa-new-doc-control-h);
  gap: 0.5rem;
  align-items: stretch;
}

.pa-new-doc__path-row :deep(.p-inputtext) {
  min-width: 0;
  height: var(--pa-new-doc-control-h);
  min-height: var(--pa-new-doc-control-h);
  box-sizing: border-box;
}

.pa-new-doc__icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--pa-new-doc-control-h);
  height: var(--pa-new-doc-control-h);
  margin: 0;
  padding: 0;
  border: 1px solid var(--ww-border-subtle);
  border-radius: var(--dg-prop-radius, var(--ww-select-radius, 0.4375rem));
  background: var(--ww-content);
  color: var(--ww-ink-muted);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    color var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    border-color var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    box-shadow var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    transform var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease);
}

.pa-new-doc__icon-action:hover:not(:disabled) {
  background: var(--ww-inset);
  color: var(--ww-ink);
  border-color: color-mix(in srgb, var(--ww-accent) 14%, var(--ww-border-subtle));
  box-shadow: 0 4px 14px -8px rgb(18 18 22 / 0.28);
  transform: translateY(-1px);
}

.pa-new-doc__icon-action:focus-visible {
  outline: 2px solid var(--ww-accent-soft);
  outline-offset: 1px;
}

.pa-new-doc__size-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--pa-new-doc-control-h) minmax(0, 1fr);
  gap: 0.375rem;
  align-items: center;
}

.pa-new-doc__size-grid :deep(.ww-number-input-root) {
  width: 100%;
}

.pa-new-doc__size-spacer {
  display: block;
}

.pa-new-doc__lock-btn.is-active {
  border-color: color-mix(in srgb, var(--ww-accent) 22%, var(--ww-border-subtle));
  background: color-mix(in srgb, var(--ww-accent) 10%, var(--ww-inset));
  color: var(--ww-accent);
}

[data-theme='dark'] .pa-new-doc__lock-btn.is-active {
  border-color: color-mix(in srgb, var(--ww-accent) 26%, var(--ww-border-subtle));
  background: color-mix(in srgb, var(--ww-accent) 12%, rgb(255 255 255 / 0.04));
}

.pa-new-doc__section :deep(.ww-settings-row) {
  align-items: center;
  min-height: var(--pa-new-doc-control-h);
}

.pa-new-doc__section :deep(.ww-settings-row__title) {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ww-ink-muted);
}

.pa-new-doc__section :deep(.ww-settings-row__control) {
  flex: 0 0 var(--pa-new-doc-control-w);
  justify-content: flex-end;
}

.pa-new-doc__ratio {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
}

.pa-new-doc__ratio :deep(.ww-number-input-root) {
  flex: 1;
  min-width: 0;
}

.pa-new-doc__ratio-prefix {
  flex-shrink: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-muted);
}

.pa-new-doc__section :deep(.ww-color-input) {
  width: 100%;
}

.pa-new-doc__section :deep(.ww-color-input__trigger) {
  width: 100%;
  height: var(--pa-new-doc-control-h);
  min-height: var(--pa-new-doc-control-h);
  border-radius: var(--dg-prop-radius, var(--ww-select-radius, 0.4375rem));
}
</style>

<style>
/* WwColorInput 面板 teleport 到 body，需高于 Dialog */
.ww-color-input__backdrop {
  z-index: calc(var(--ww-z-dialog, 10100) + 40) !important;
}

.ww-color-input__panel {
  z-index: calc(var(--ww-z-dialog, 10100) + 41) !important;
}
</style>
