import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { PersonalBackgroundConfig, PersonalBackgroundCrop } from '@shared/types/profile'
import { DEFAULT_BACKGROUND_CONFIG } from '@shared/types/profile'
import {
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SCALE_MIN,
  BACKGROUND_SNAP_OUTSIDE_RATIO,
  clampCropToBounds,
  computeBackgroundFitScale,
  computeCropDragRegion,
  computeDefaultCrop,
  fitCropToCropDragRegion,
  imageCropToViewportStyle,
  loadImageDimensions,
  migrateConfigCropToImageSpace,
  normalizeBackgroundConfig,
  opacityFromUi,
  opacityToUi,
  panOffsetDeltaFromPixels,
  resizeCropByCorner,
  backgroundOffsetNeedsSnap,
  resolveBackgroundOffset,
  scaleBackgroundAboutViewportPoint,
  scaleImageCropAboutViewportPoint,
  viewportNormDeltaToImageCrop
} from '@shared/utils/profileMedia'
import {
  WHEEL_ZOOM_SENS,
  WHEEL_CROP_SENS,
  SMOOTH_TIME,
  WHEEL_IDLE_MS,
  helpShortcuts,
  cropHandles,
  clamp
} from './personalBackgroundEditorConstants'
import type { CropResizeHandle } from '@shared/utils/profileMedia'

export interface PersonalBackgroundEditorProps {
  imageUrl: string
  autoFit?: boolean
  viewportEl?: HTMLElement | null
}

export function usePersonalBackgroundEditor(
  props: PersonalBackgroundEditorProps,
  draft: Ref<PersonalBackgroundConfig>,
  emit: {
    (e: 'confirm', config: PersonalBackgroundConfig): void
    (e: 'cancel'): void
    (e: 'replace'): void
    (e: 'reset'): void
  }
) {
const SNAP_RATIO = BACKGROUND_SNAP_OUTSIDE_RATIO

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
const spaceHeld = ref(false)

/** 操作说明浮层：用 Teleport 跳出面板（避免父级 backdrop-filter 屏蔽子层模糊） */
const helpTriggerRef = ref<HTMLElement | null>(null)
const helpOpen = ref(false)
const helpPos = ref({ top: 0, right: 0 })

function updateHelpPos() {
  const el = helpTriggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  helpPos.value = {
    top: r.bottom + 6,
    right: Math.max(8, window.innerWidth - r.right)
  }
}

function openHelp() {
  updateHelpPos()
  helpOpen.value = true
}

function closeHelp() {
  helpOpen.value = false
}

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
let wheelIdleTimer: ReturnType<typeof setTimeout> | null = null

const visibleHelpShortcuts = computed(() =>
  helpShortcuts.filter((item) => !item.whenCrop || cropMode.value)
)

const scalePercent = computed(() => Math.round(draft.value.scale * 100))

/** 滑块本地值；watch 隔离，避免 draft → slider → draft 的回流卡顿 */
const scaleSliderValue = ref(draft.value.scale)
let scaleSliderDragging = false
let scaleSliderSyncFromDraft = false

watch(
  () => draft.value.scale,
  (v) => {
    if (scaleSliderDragging) return
    if (Math.abs(scaleSliderValue.value - v) < 1e-6) return
    scaleSliderSyncFromDraft = true
    scaleSliderValue.value = v
  }
)

watch(scaleSliderValue, (v, oldV) => {
  if (scaleSliderSyncFromDraft) {
    scaleSliderSyncFromDraft = false
    return
  }
  if (oldV == null || Math.abs(v - oldV) < 1e-6) return
  applyScaleFromSlider(v)
})

const opacityUi = computed({
  get: () => opacityToUi(draft.value.opacity),
  set: (ui: number) => {
    targets.opacity = opacityFromUi(ui)
    draft.value = { ...draft.value, opacity: targets.opacity }
  }
})

const stageHint = computed(() => {
  if (!cropMode.value) return '拖拽页面调整背景位置'
  if (spaceHeld.value) return '拖拽移动背景 · 滚轮缩放'
  return '滚轮缩放背景 · Alt/空格+拖拽移动 · 拖拽框调整裁剪'
})

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

function bumpWheelGesture() {
  const isNewGesture = wheelIdleTimer === null
  if (wheelIdleTimer !== null) clearTimeout(wheelIdleTimer)
  wheelIdleTimer = setTimeout(onWheelGestureIdle, WHEEL_IDLE_MS)
  // 动画进行中 draft 滞后于 targets，勿把 targets 拉回 draft，否则会破坏以指针为中心的缩放
  if (isNewGesture && smoothRafId === null) syncTargetsFromDraft()
}

function onWheelGestureIdle() {
  wheelIdleTimer = null
  const vp = getViewportRect()
  if (
    vp?.width &&
    imageSize.value.width &&
    backgroundOffsetNeedsSnap(
      targets.offsetX,
      targets.offsetY,
      targets.scale,
      vp.width,
      vp.height,
      imageSize.value.width,
      imageSize.value.height,
      SNAP_RATIO
    )
  ) {
    snapBackgroundToTargets(true)
  } else {
    applyTargetsToDraft()
  }
  if (draft.value.crop) clampDraftCrop()
}

function cropAnimDone(): boolean {
  if (!targets.crop || !draft.value.crop) return true
  const t = targets.crop
  const d = draft.value.crop
  return (
    Math.abs(t.x - d.x) < 0.0008 &&
    Math.abs(t.y - d.y) < 0.0008 &&
    Math.abs(t.width - d.width) < 0.0008 &&
    Math.abs(t.height - d.height) < 0.0008
  )
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
  } else if (targets.crop && draft.value.crop) {
    crop = draft.value.crop
  }

  draft.value = normalizeBackgroundConfig({ ...draft.value, ...next, crop })

  const done =
    Math.abs(targets.scale - draft.value.scale) < 0.0004 &&
    Math.abs(targets.offsetX - draft.value.offsetX) < 0.08 &&
    Math.abs(targets.offsetY - draft.value.offsetY) < 0.08 &&
    Math.abs(targets.opacity - draft.value.opacity) < 0.002 &&
    (!targets.crop || !draft.value.crop || cropAnimDone())

  if (done) {
    applyTargetsToDraft()
    stopSmoothAnimation()
    return
  }

  smoothRafId = requestAnimationFrame(tickSmoothAnimation)
}

function startSmoothAnimation(animateCrop = false) {
  if (animateCrop) smoothAnimateCrop = true
  else if (smoothRafId === null) smoothAnimateCrop = false
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

function getCropRegion(
  scale = draft.value.scale,
  offsetX = draft.value.offsetX,
  offsetY = draft.value.offsetY
): PersonalBackgroundCrop {
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }
  return computeCropDragRegion(
    vp.width,
    vp.height,
    scale,
    offsetX,
    offsetY,
    imageSize.value.width,
    imageSize.value.height
  )
}

function wheelFocalPx(e: WheelEvent) {
  const vp = getViewportRect()
  if (!vp?.width) return { x: vp?.width ? vp.width / 2 : 0, y: vp?.height ? vp.height / 2 : 0 }
  return {
    x: e.clientX - vp.left,
    y: e.clientY - vp.top
  }
}

function beginSmoothTransform(animateCrop = false) {
  startSmoothAnimation(animateCrop)
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

function snapBackgroundToTargets(animate = true) {
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) return false
  const resolved = resolveBackgroundOffset(
    targets.offsetX,
    targets.offsetY,
    targets.scale,
    vp.width,
    vp.height,
    imageSize.value.width,
    imageSize.value.height,
    { allowSnap: true, snapRatio: SNAP_RATIO }
  )
  if (
    Math.abs(resolved.offsetX - targets.offsetX) < 0.02 &&
    Math.abs(resolved.offsetY - targets.offsetY) < 0.02
  ) {
    return false
  }
  targets.offsetX = resolved.offsetX
  targets.offsetY = resolved.offsetY
  if (animate) beginSmoothTransform(false)
  else {
    draft.value = { ...draft.value, offsetX: targets.offsetX, offsetY: targets.offsetY }
  }
  return true
}

function onScaleSliderStart() {
  scaleSliderDragging = true
  if (wheelIdleTimer !== null) {
    clearTimeout(wheelIdleTimer)
    wheelIdleTimer = null
  }
  stopSmoothAnimation()
  syncTargetsFromDraft()
}

function applyScaleFromSlider(v: number) {
  const newScale = clamp(v, BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX)
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) {
    targets.scale = newScale
    draft.value = { ...draft.value, scale: newScale }
    return
  }
  const oldScale = targets.scale
  if (Math.abs(oldScale - newScale) < 1e-6) return
  applyScaleAboutPoint(oldScale, newScale, vp.width / 2, vp.height / 2, { scaleCrop: false })
  applyTargetsToDraft()
}

function onScaleSlideEnd() {
  scaleSliderDragging = false
  const vp = getViewportRect()
  if (
    vp?.width &&
    imageSize.value.width &&
    backgroundOffsetNeedsSnap(
      targets.offsetX,
      targets.offsetY,
      targets.scale,
      vp.width,
      vp.height,
      imageSize.value.width,
      imageSize.value.height,
      SNAP_RATIO
    )
  ) {
    snapBackgroundToTargets(false)
  }
  applyTargetsToDraft()
  if (draft.value.crop && vp?.width && imageSize.value.width) {
    const crop = fitCropToCropDragRegion(
      draft.value.crop,
      vp.width,
      vp.height,
      draft.value.scale,
      draft.value.offsetX,
      draft.value.offsetY,
      imageSize.value.width,
      imageSize.value.height
    )
    draft.value = { ...draft.value, crop }
    targets.crop = { ...crop }
  }
}

async function loadImageSize() {
  try {
    imageSize.value = await loadImageDimensions(props.imageUrl)
  } catch {
    imageSize.value = { width: 0, height: 0 }
  }
}

function pointerPos(e: PointerEvent) {
  const el = props.viewportEl ?? surfaceRef.value
  if (!el) return { x: 0, y: 0 }
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return { x: 0, y: 0 }
  return {
    x: (e.clientX - r.left) / r.width,
    y: (e.clientY - r.top) / r.height
  }
}

function applyScaleAboutPoint(
  oldScale: number,
  newScale: number,
  focalX: number,
  focalY: number,
  opts?: { scaleCrop?: boolean }
) {
  const newScaleClamped = clamp(newScale, BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX)
  if (oldScale === newScaleClamped) return
  newScale = newScaleClamped
  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width || oldScale === newScale) return

  const next = scaleBackgroundAboutViewportPoint(
    oldScale,
    newScale,
    targets.offsetX,
    targets.offsetY,
    focalX,
    focalY,
    vp.width,
    vp.height,
    imageSize.value.width,
    imageSize.value.height
  )
  targets.scale = next.scale
  targets.offsetX = next.offsetX
  targets.offsetY = next.offsetY

  if (opts?.scaleCrop !== false && cropMode.value && targets.crop) {
    const factor = newScale / oldScale
    const bounds = computeCropDragRegion(
      vp.width,
      vp.height,
      targets.scale,
      targets.offsetX,
      targets.offsetY,
      imageSize.value.width,
      imageSize.value.height
    )
    targets.crop = scaleImageCropAboutViewportPoint(
      targets.crop,
      factor,
      focalX,
      focalY,
      vp.width,
      vp.height,
      targets.scale,
      targets.offsetX,
      targets.offsetY,
      imageSize.value.width,
      imageSize.value.height,
      bounds
    )
  }
}

function canPanBackground(e?: PointerEvent) {
  return !cropMode.value || spaceHeld.value || e?.altKey === true
}

function startPanGesture(e: PointerEvent) {
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

  if (e.button !== 0 || !canPanBackground(e)) return
  startPanGesture(e)
}

function onCropPointerDown(
  e: PointerEvent,
  mode: 'crop-move' | 'crop-resize',
  corner: CropResizeHandle = 'se'
) {
  if (canPanBackground(e)) {
    e.preventDefault()
    e.stopPropagation()
    startPanGesture(e)
    return
  }
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
    targets.scale,
    targets.offsetX,
    targets.offsetY,
    imageSize.value.width,
    imageSize.value.height
  )
  const bounds = getCropRegion(targets.scale, targets.offsetX, targets.offsetY)
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
    if (!snapBackgroundToTargets(true)) applyTargetsToDraft()
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

  if (e.ctrlKey) {
    targets.opacity = clamp(targets.opacity - e.deltaY * 0.002, 0, 1)
    beginSmoothTransform(false)
    return
  }

  const vp = getViewportRect()
  if (!vp?.width || !imageSize.value.width) return
  const focal = wheelFocalPx(e)
  stopSmoothAnimation()
  bumpWheelGesture()

  if (e.shiftKey && cropMode.value && targets.crop) {
    const factor = Math.exp(-e.deltaY * WHEEL_CROP_SENS)
    const bounds = getCropRegion(targets.scale, targets.offsetX, targets.offsetY)
    targets.crop = scaleImageCropAboutViewportPoint(
      targets.crop,
      factor,
      focal.x,
      focal.y,
      vp.width,
      vp.height,
      targets.scale,
      targets.offsetX,
      targets.offsetY,
      imageSize.value.width,
      imageSize.value.height,
      bounds
    )
    applyTargetsToDraft()
    return
  }

  const prevScale = targets.scale
  const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENS)
  const newScale = clamp(targets.scale * factor, BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX)
  applyScaleAboutPoint(prevScale, newScale, focal.x, focal.y, { scaleCrop: false })
  // 立即写入 draft：scale/offset 必须同步变化才能保持指针下像素不动，不能做独立插值
  applyTargetsToDraft()
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
  if (cropMode.value && targets.crop) {
    targets.crop = { ...getDefaultCrop() }
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
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    spaceHeld.value = true
  }
}

function onKeyup(e: KeyboardEvent) {
  if (e.code === 'Space') spaceHeld.value = false
}

async function applyFitScale() {
  await resetView({ animate: false })
}

let resizeObserver: ResizeObserver | null = null
let resizeClampRaf: number | null = null

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('scroll', updateHelpPos, true)
  window.addEventListener('resize', updateHelpPos)
  syncTargetsFromDraft()
  await loadImageSize()
  syncCropImageSpace()
  if (props.autoFit) await applyFitScale()

  if (props.viewportEl) {
    resizeObserver = new ResizeObserver(() => {
      if (!draft.value.crop || smoothRafId !== null || dragging.value) return
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
  window.removeEventListener('keyup', onKeyup)
  window.removeEventListener('scroll', updateHelpPos, true)
  window.removeEventListener('resize', updateHelpPos)
  unbindWindowPointer()
  if (wheelIdleTimer !== null) clearTimeout(wheelIdleTimer)
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

function resetDraft() {
  stopSmoothAnimation()
  const defaults = normalizeBackgroundConfig({ ...DEFAULT_BACKGROUND_CONFIG })
  targets.scale = defaults.scale
  targets.offsetX = defaults.offsetX
  targets.offsetY = defaults.offsetY
  targets.opacity = defaults.opacity
  targets.crop = null
  draft.value = defaults
  emit('reset')
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

  return {
    cropMode,
    surfaceRef,
    helpTriggerRef,
    helpOpen,
    helpPos,
    openHelp,
    closeHelp,
    spaceHeld,
    scalePercent,
    scaleSliderValue,
    opacityUi,
    stageHint,
    cropFrameStyle,
    visibleHelpShortcuts,
    cropHandles,
    BACKGROUND_SCALE_MIN,
    BACKGROUND_SCALE_MAX,
    onScaleSliderStart,
    onScaleSlideEnd,
    onSurfacePointerDown,
    onCropPointerDown,
    onSurfaceWheel,
    resetDraft,
    confirm,
    emit
  }
}
