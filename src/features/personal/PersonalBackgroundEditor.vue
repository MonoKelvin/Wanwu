<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Slider from 'primevue/slider'
import ToggleSwitch from 'primevue/toggleswitch'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import SettingsRow from '@features/settings/SettingsRow.vue'
import type { PersonalBackgroundConfig, PersonalBackgroundCrop } from '@shared/types/profile'
import { DEFAULT_BACKGROUND_CONFIG } from '@shared/types/profile'
import type { CropResizeHandle } from '@shared/utils/profileMedia'
import {
  clampCropToBounds,
  computeBackgroundFitScale,
  computeCropDragRegion,
  computeDefaultCrop,
  imageCropToViewportStyle,
  loadImageDimensions,
  migrateConfigCropToImageSpace,
  normalizeBackgroundConfig,
  opacityFromUi,
  opacityToUi,
  panOffsetDeltaFromPixels,
  resizeCropByCorner,
  resolveBackgroundOffset,
  viewportNormDeltaToImageCrop
} from '@shared/utils/profileMedia'

const props = defineProps<{
  imageUrl: string
  autoFit?: boolean
  viewportEl?: HTMLElement | null
}>()

const draft = defineModel<PersonalBackgroundConfig>({ required: true })

const emit = defineEmits<{
  confirm: [config: PersonalBackgroundConfig]
  cancel: []
  replace: []
}>()

const WHEEL_ZOOM_SENS = 0.0022
const WHEEL_CROP_SENS = 0.0022
const SMOOTH_TIME = 0.16
const SNAP_RATIO = 0.9

const cropMode = computed({
  get: () => draft.value.crop != null,
  set: (on: boolean) => {
    if (on) {
      const crop = { ...getDefaultCrop() }
      targets.crop = crop
      draft.value = { ...draft.value, crop }
      queueMicrotask(() => clampDraftCrop())
    } else {
      targets.crop = null
      draft.value = { ...draft.value, crop: null }
    }
  }
})
const surfaceRef = ref<HTMLElement | null>(null)
const imageSize = ref({ width: 0, height: 0 })

const dragging = ref<'pan' | 'crop-move' | 'crop-resize' | null>(null)
const cropResizeCorner = ref<CropResizeHandle>('se')
const dragStart = ref({
  px: 0,
  py: 0,
  ox: 0,
  oy: 0,
  ow: 0,
  oh: 0,
  normX: 0,
  normY: 0,
  crop: null as PersonalBackgroundCrop | null
})

const targets = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
  crop: null as PersonalBackgroundCrop | null
}

let smoothRafId: number | null = null
let smoothLastTs = 0
let smoothAnimateCrop = false

const helpShortcuts = [
  { keys: ['滚轮'], label: '缩放背景' },
  { keys: ['拖拽'], label: '移动背景位置' },
  { keys: ['中键'], label: '还原缩放与位置' },
  { keys: ['Ctrl', '滚轮'], label: '调整透明度' },
  { keys: ['Shift', '滚轮'], label: '缩放裁剪框', whenCrop: true },
  { keys: ['Shift', '中键'], label: '裁剪框铺满图片', whenCrop: true },
  { keys: ['Esc'], label: '取消' }
]

const visibleHelpShortcuts = computed(() =>
  helpShortcuts.filter((item) => !item.whenCrop || cropMode.value)
)

const scalePercent = computed(() => Math.round(draft.value.scale * 100))

const opacityUi = computed({
  get: () => opacityToUi(draft.value.opacity),
  set: (ui: number) => {
    targets.opacity = opacityFromUi(ui)
    draft.value = { ...draft.value, opacity: targets.opacity }
  }
})

const stageHint = computed(() =>
  cropMode.value ? '拖拽框移动 · 四角缩放' : '拖拽页面调整背景位置'
)

const cropFrameStyle = computed(() => {
  const crop = draft.value.crop
  const vp = getViewportRect()
  if (!crop || !vp?.width || !imageSize.value.width) return {}
  return imageCropToViewportStyle(
    crop,
    vp.width,
    vp.height,
    draft.value.scale,
    draft.value.offsetX,
    draft.value.offsetY,
    imageSize.value.width,
    imageSize.value.height
  )
})

function syncTargetsFromDraft() {
  targets.scale = draft.value.scale
  targets.offsetX = draft.value.offsetX
  targets.offsetY = draft.value.offsetY
  targets.opacity = draft.value.opacity
  targets.crop = draft.value.crop ? { ...draft.value.crop } : null
}

function applyTargetsToDraft() {
  draft.value = normalizeBackgroundConfig({
    ...draft.value,
    scale: targets.scale,
    offsetX: targets.offsetX,
    offsetY: targets.offsetY,
    opacity: targets.opacity,
    crop: targets.crop ? { ...targets.crop } : null
  })
}

function stopSmoothAnimation() {
  if (smoothRafId !== null) {
    cancelAnimationFrame(smoothRafId)
    smoothRafId = null
  }
  smoothLastTs = 0
  smoothAnimateCrop = false
}

function tickSmoothAnimation(ts: number) {
  if (!smoothLastTs) smoothLastTs = ts
  const dt = Math.min((ts - smoothLastTs) / 1000, 0.032)
  smoothLastTs = ts
  const alpha = 1 - Math.exp(-dt / SMOOTH_TIME)

  const next = {
    scale: draft.value.scale + (targets.scale - draft.value.scale) * alpha,
    offsetX: draft.value.offsetX + (targets.offsetX - draft.value.offsetX) * alpha,
    offsetY: draft.value.offsetY + (targets.offsetY - draft.value.offsetY) * alpha,
    opacity: draft.value.opacity + (targets.opacity - draft.value.opacity) * alpha
  }

  let crop = draft.value.crop
  if (smoothAnimateCrop && crop && targets.crop) {
    crop = {
      x: crop.x + (targets.crop.x - crop.x) * alpha,
      y: crop.y + (targets.crop.y - crop.y) * alpha,
      width: crop.width + (targets.crop.width - crop.width) * alpha,
      height: crop.height + (targets.crop.height - crop.height) * alpha
    }
  } else if (targets.crop) {
    crop = { ...targets.crop }
  }

  draft.value = normalizeBackgroundConfig({ ...draft.value, ...next, crop })

  const done =
    Math.abs(targets.scale - draft.value.scale) < 0.0004 &&
    Math.abs(targets.offsetX - draft.value.offsetX) < 0.08 &&
    Math.abs(targets.offsetY - draft.value.offsetY) < 0.08 &&
    Math.abs(targets.opacity - draft.value.opacity) < 0.002 &&
    (!targets.crop ||
      !draft.value.crop ||
      (Math.abs(targets.crop.width - draft.value.crop.width) < 0.0008 &&
        Math.abs(targets.crop.height - draft.value.crop.height) < 0.0008))

  if (done) {
    applyTargetsToDraft()
    if (draft.value.crop) clampDraftCrop()
    stopSmoothAnimation()
    return
  }

  smoothRafId = requestAnimationFrame(tickSmoothAnimation)
}

function startSmoothAnimation(animateCrop = false) {
  if (!animateCrop) smoothAnimateCrop = false
  else smoothAnimateCrop = true
  if (smoothRafId === null) {
    smoothLastTs = 0
    smoothRafId = requestAnimationFrame(tickSmoothAnimation)
  }
}

function getViewportRect() {
  const el = props.viewportEl ?? surfaceRef.value
  if (!el) return null
  return el.getBoundingClientRect()
}

function syncCropImageSpace() {
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) return
  draft.value = migrateConfigCropToImageSpace(
    draft.value,
    vp.width,
    vp.height,
    imageSize.value.width,
    imageSize.value.height
  )
  syncTargetsFromDraft()
}

function getCropRegion(): PersonalBackgroundCrop {
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }
  return computeCropDragRegion(
    vp.width,
    vp.height,
    draft.value.scale,
    draft.value.offsetX,
    draft.value.offsetY,
    imageSize.value.width,
    imageSize.value.height
  )
}

function getDefaultCrop(): PersonalBackgroundCrop {
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }
  return computeDefaultCrop(
    vp.width,
    vp.height,
    draft.value.scale,
    draft.value.offsetX,
    draft.value.offsetY,
    imageSize.value.width,
    imageSize.value.height
  )
}

function ensureCrop(): PersonalBackgroundCrop {
  if (draft.value.crop) return { ...draft.value.crop }
  return { ...getDefaultCrop() }
}

function clampDraftCrop() {
  if (!draft.value.crop || !imageSize.value.width) return
  const next = clampCropToBounds(draft.value.crop, getCropRegion())
  draft.value = { ...draft.value, crop: next }
  if (targets.crop) targets.crop = { ...next }
}

function resolvePanTargets(allowSnap: boolean) {
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) return
  const resolved = resolveBackgroundOffset(
    targets.offsetX,
    targets.offsetY,
    targets.scale,
    vp.width,
    vp.height,
    imageSize.value.width,
    imageSize.value.height,
    { allowSnap, snapRatio: SNAP_RATIO }
  )
  targets.offsetX = resolved.offsetX
  targets.offsetY = resolved.offsetY
  if (!dragging.value) {
    draft.value = { ...draft.value, offsetX: targets.offsetX, offsetY: targets.offsetY }
  }
}

function onScaleSlideEnd() {
  syncTargetsFromDraft()
  if (draft.value.crop) clampDraftCrop()
}

async function loadImageSize() {
  try {
    imageSize.value = await loadImageDimensions(props.imageUrl)
  } catch {
    imageSize.value = { width: 0, height: 0 }
  }
}

function pointerPos(e: PointerEvent) {
  const el = surfaceRef.value
  if (!el) return { x: 0, y: 0 }
  const r = el.getBoundingClientRect()
  return {
    x: (e.clientX - r.left) / r.width,
    y: (e.clientY - r.top) / r.height
  }
}

function bindWindowPointer() {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function unbindWindowPointer() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function onSurfacePointerDown(e: PointerEvent) {
  const t = e.target as HTMLElement
  if (t.closest('.ww-bg-editor__panel') || t.closest('.ww-bg-editor__crop-handle')) return

  if (e.button === 1) {
    e.preventDefault()
    if (e.shiftKey) {
      resetCropToImage()
    } else {
      void resetView({ animate: true })
    }
    return
  }

  if (e.button !== 0 || cropMode.value) return

  e.preventDefault()
  stopSmoothAnimation()
  syncTargetsFromDraft()
  dragging.value = 'pan'
  dragStart.value = {
    px: e.clientX,
    py: e.clientY,
    ox: targets.offsetX,
    oy: targets.offsetY,
    ow: 0,
    oh: 0,
    normX: 0,
    normY: 0,
    crop: null
  }
  surfaceRef.value?.setPointerCapture(e.pointerId)
  bindWindowPointer()
}

function onCropPointerDown(
  e: PointerEvent,
  mode: 'crop-move' | 'crop-resize',
  corner: CropResizeHandle = 'se'
) {
  e.preventDefault()
  e.stopPropagation()
  stopSmoothAnimation()
  syncTargetsFromDraft()
  const crop = ensureCrop()
  const p = pointerPos(e)
  dragging.value = mode
  cropResizeCorner.value = corner
  dragStart.value = {
    px: e.clientX,
    py: e.clientY,
    ox: crop.x,
    oy: crop.y,
    ow: crop.width,
    oh: crop.height,
    normX: p.x,
    normY: p.y,
    crop: { ...crop }
  }
  bindWindowPointer()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return

  if (dragging.value === 'pan') {
    const vp = getViewportRect()
    if (!vp?.width || !imageSize.value.width) return
    const dx = e.clientX - dragStart.value.px
    const dy = e.clientY - dragStart.value.py
    const delta = panOffsetDeltaFromPixels(
      dx,
      dy,
      vp.width,
      vp.height,
      targets.scale,
      imageSize.value.width,
      imageSize.value.height
    )
    targets.offsetX = dragStart.value.ox + delta.offsetX
    targets.offsetY = dragStart.value.oy + delta.offsetY
    draft.value = {
      ...draft.value,
      offsetX: targets.offsetX,
      offsetY: targets.offsetY
    }
    return
  }

  const pos = pointerPos(e)
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) return
  const { dx, dy } = viewportNormDeltaToImageCrop(
    pos.x - dragStart.value.normX,
    pos.y - dragStart.value.normY,
    vp.width,
    vp.height,
    draft.value.scale,
    draft.value.offsetX,
    draft.value.offsetY,
    imageSize.value.width,
    imageSize.value.height
  )
  const bounds = getCropRegion()
  const start = dragStart.value.crop ?? ensureCrop()

  if (dragging.value === 'crop-move') {
    const crop = clampCropToBounds(
      { ...start, x: dragStart.value.ox + dx, y: dragStart.value.oy + dy },
      bounds
    )
    targets.crop = crop
    draft.value = { ...draft.value, crop }
  } else if (dragging.value === 'crop-resize') {
    const crop = resizeCropByCorner(
      { x: dragStart.value.ox, y: dragStart.value.oy, width: dragStart.value.ow, height: dragStart.value.oh },
      dx,
      dy,
      cropResizeCorner.value,
      bounds
    )
    targets.crop = crop
    draft.value = { ...draft.value, crop }
  }
}

function onPointerUp(e: PointerEvent) {
  if (dragging.value === 'pan') {
    syncTargetsFromDraft()
    resolvePanTargets(true)
    applyTargetsToDraft()
    if (draft.value.crop) clampDraftCrop()
  } else if (dragging.value) {
    syncTargetsFromDraft()
    applyTargetsToDraft()
  }
  dragging.value = null
  unbindWindowPointer()
  try {
    surfaceRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onSurfaceWheel(e: WheelEvent) {
  if ((e.target as HTMLElement).closest('.ww-bg-editor__panel')) return
  e.preventDefault()
  syncTargetsFromDraft()

  if (e.ctrlKey) {
    targets.opacity = clamp(targets.opacity - e.deltaY * 0.002, 0, 1)
    startSmoothAnimation(false)
    return
  }

  if (e.shiftKey && cropMode.value && targets.crop) {
    resizeCropByWheel(e.deltaY)
    startSmoothAnimation(true)
    return
  }

  const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENS)
  targets.scale = clamp(targets.scale * factor, 0.25, 3)
  startSmoothAnimation(false)
}

function resizeCropByWheel(deltaY: number) {
  if (!targets.crop) return
  const bounds = getCropRegion()
  const crop = targets.crop
  const factor = Math.exp(-deltaY * WHEEL_CROP_SENS)
  const cx = crop.x + crop.width / 2
  const cy = crop.y + crop.height / 2
  const width = clamp(crop.width * factor, 0.05, bounds.width)
  const height = clamp(crop.height * factor, 0.05, bounds.height)
  targets.crop = clampCropToBounds(
    { x: cx - width / 2, y: cy - height / 2, width, height },
    bounds
  )
}

function resetCropToImage() {
  if (!cropMode.value) return
  const crop = { ...getDefaultCrop() }
  targets.crop = crop
  draft.value = { ...draft.value, crop }
  startSmoothAnimation(true)
}

async function resetView(opts?: { animate?: boolean }) {
  const root = props.viewportEl ?? surfaceRef.value
  if (!root || !imageSize.value.width) {
    targets.scale = 1
    targets.offsetX = 0
    targets.offsetY = 0
  } else {
    const r = root.getBoundingClientRect()
    targets.scale = computeBackgroundFitScale(
      imageSize.value.width,
      imageSize.value.height,
      r.width,
      r.height
    )
    targets.offsetX = 0
    targets.offsetY = 0
  }
  if (opts?.animate) startSmoothAnimation(false)
  else {
    stopSmoothAnimation()
    applyTargetsToDraft()
    if (draft.value.crop) clampDraftCrop()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

async function applyFitScale() {
  await resetView({ animate: false })
}

let resizeObserver: ResizeObserver | null = null
let resizeClampRaf: number | null = null

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  syncTargetsFromDraft()
  await loadImageSize()
  syncCropImageSpace()
  if (props.autoFit) await applyFitScale()

  if (props.viewportEl) {
    resizeObserver = new ResizeObserver(() => {
      if (!draft.value.crop) return
      if (resizeClampRaf !== null) cancelAnimationFrame(resizeClampRaf)
      resizeClampRaf = requestAnimationFrame(() => {
        resizeClampRaf = null
        clampDraftCrop()
      })
    })
    resizeObserver.observe(props.viewportEl)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  unbindWindowPointer()
  stopSmoothAnimation()
  resizeObserver?.disconnect()
  if (resizeClampRaf !== null) cancelAnimationFrame(resizeClampRaf)
})

watch(
  () => props.imageUrl,
  async () => {
    await loadImageSize()
    syncCropImageSpace()
    if (props.autoFit) await applyFitScale()
    else if (draft.value.crop) clampDraftCrop()
  }
)

watch(
  () => props.autoFit,
  async (fit) => {
    if (!fit || !imageSize.value.width) return
    await applyFitScale()
  }
)

watch(
  () => draft.value.scale,
  (v) => {
    if (dragging.value || smoothRafId !== null) return
    if (Math.abs(v - targets.scale) > 0.001) targets.scale = v
  }
)

function resetDraft() {
  stopSmoothAnimation()
  draft.value = normalizeBackgroundConfig({ ...DEFAULT_BACKGROUND_CONFIG })
  cropMode.value = false
  syncTargetsFromDraft()
  if (props.autoFit) void applyFitScale()
}

function confirm() {
  stopSmoothAnimation()
  applyTargetsToDraft()
  const next = normalizeBackgroundConfig(draft.value)
  emit('confirm', {
    ...next,
    cropSpace: next.crop ? 'image' : next.cropSpace
  })
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

const cropHandles: { corner: CropResizeHandle; class: string }[] = [
  { corner: 'nw', class: 'ww-bg-editor__crop-handle--nw' },
  { corner: 'ne', class: 'ww-bg-editor__crop-handle--ne' },
  { corner: 'sw', class: 'ww-bg-editor__crop-handle--sw' },
  { corner: 'se', class: 'ww-bg-editor__crop-handle--se' }
]
</script>

<template>
  <div class="ww-bg-editor" role="dialog" aria-modal="true" aria-label="调整背景图">
    <div
      ref="surfaceRef"
      class="ww-bg-editor__surface"
      :class="{ 'is-cropping': cropMode }"
      @pointerdown="onSurfacePointerDown"
      @wheel.prevent="onSurfaceWheel"
      @contextmenu.prevent
    >
      <p class="ww-bg-editor__hint">{{ stageHint }}</p>

      <template v-if="cropMode && draft.crop">
        <div
          class="ww-bg-editor__crop"
          :style="cropFrameStyle"
          @pointerdown="onCropPointerDown($event, 'crop-move')"
        >
          <span
            v-for="h in cropHandles"
            :key="h.corner"
            class="ww-bg-editor__crop-handle"
            :class="h.class"
            @pointerdown.stop="onCropPointerDown($event, 'crop-resize', h.corner)"
          />
        </div>
      </template>
    </div>

    <div class="ww-bg-editor__panel" @pointerdown.stop @wheel.stop>
      <header class="ww-bg-editor__panel-head">
        <div class="ww-bg-editor__panel-head-text">
          <h2 class="ww-bg-editor__panel-title">背景设置</h2>
          <p class="ww-bg-editor__panel-desc">对照页面内容调整位置与可见范围</p>
        </div>
        <div class="ww-bg-editor__help">
          <span class="ww-bg-editor__help-trigger" tabindex="0" aria-label="操作说明">
            <WwIcon name="circle-help" size="sm" />
          </span>
          <div class="ww-bg-editor__help-popover" role="tooltip">
            <p class="ww-bg-editor__help-title">操作说明</p>
            <ul class="ww-bg-editor__help-list">
              <li
                v-for="(item, i) in visibleHelpShortcuts"
                :key="i"
                class="ww-bg-editor__help-row"
              >
                <span class="ww-bg-editor__help-keys">
                  <kbd
                    v-for="(key, ki) in item.keys"
                    :key="ki"
                    class="ww-bg-editor__help-kbd"
                  >{{ key }}</kbd>
                </span>
                <span class="ww-bg-editor__help-label">{{ item.label }}</span>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <div class="ww-bg-editor__panel-body">
        <SettingsRow label="缩放">
          <div class="ww-bg-editor__slider-field">
            <Slider
              v-model="draft.scale"
              class="ww-bg-editor__slider"
              :min="0.25"
              :max="3"
              :step="0.01"
              @slideend="onScaleSlideEnd"
            />
            <span class="ww-bg-editor__value">{{ scalePercent }}%</span>
          </div>
        </SettingsRow>

        <SettingsRow label="透明度">
          <div class="ww-bg-editor__slider-field">
            <Slider v-model="opacityUi" class="ww-bg-editor__slider" :min="0" :max="100" :step="1" />
            <span class="ww-bg-editor__value">{{ opacityUi }}%</span>
          </div>
        </SettingsRow>

        <SettingsRow
          label="剪裁区域"
          subtitle="框选页面可见范围"
          class="ww-bg-editor__crop-row"
        >
          <ToggleSwitch v-model="cropMode" class="ww-bg-editor__switch" />
        </SettingsRow>
      </div>

      <footer class="ww-bg-editor__panel-foot">
        <div class="ww-bg-editor__panel-foot-start">
          <button
            type="button"
            class="ww-bg-editor__icon-btn"
            aria-label="更换图片"
            v-tooltip.bottom="'更换图片'"
            @click="emit('replace')"
          >
            <WwIcon name="image" size="sm" />
          </button>
          <button
            type="button"
            class="ww-bg-editor__icon-btn"
            aria-label="恢复默认"
            v-tooltip.bottom="'恢复默认'"
            @click="resetDraft"
          >
            <WwIcon name="rotate-ccw" size="sm" />
          </button>
        </div>
        <div class="ww-bg-editor__panel-actions">
          <WwButton label="取消" size="small" severity="secondary" outlined @click="emit('cancel')" />
          <WwButton label="应用" icon="check" icon-size="xs" size="small" @click="confirm" />
        </div>
      </footer>
    </div>
  </div>
</template>