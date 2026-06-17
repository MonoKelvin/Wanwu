<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { ImageViewerSlide } from '@shared/types/image-viewer'

const props = withDefaults(
  defineProps<{
    open: boolean
    slides: ImageViewerSlide[]
    index: number
    /** 滚轮缩放灵敏度 */
    wheelSensitivity?: number
    minScale?: number
    maxScale?: number
  }>(),
  {
    wheelSensitivity: 0.0022,
    minScale: 0.2,
    maxScale: 6
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:index': [value: number]
}>()

const viewportRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
/** 缩放为 1 时图片在视口内的适配尺寸 */
const imageBase = ref({ w: 0, h: 0 })
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const targetScale = ref(1)
const targetPanX = ref(0)
const targetPanY = ref(0)
const dragging = ref(false)
const wheelAnimating = ref(false)
const navEdgeHover = ref<'prev' | 'next' | null>(null)
const NAV_EDGE_PX = 72
/** 单侧移出视口超过该比例时，回弹至边沿对齐视口中心 */
const OUTSIDE_SNAP_RATIO = 0.8
const dragStart = { x: 0, y: 0, panX: 0, panY: 0 }

const helpShortcuts = [
  { keys: ['滚轮'], label: '缩放' },
  { keys: ['双击'], label: '放大 / 还原' },
  { keys: ['中键'], label: '重置缩放' },
  { keys: ['拖拽'], label: '移动画面' },
  { keys: ['←', '→'], label: '上一张 / 下一张', whenMany: true },
  { keys: ['Esc'], label: '关闭' },
  { keys: ['0'], label: '重置缩放' }
]

let zoomRafId: number | null = null
let zoomLastTs = 0
/** 时间常数：越小越跟手，越大越「先快后慢」 */
const ZOOM_SMOOTH_TIME = 0.16

const current = computed(() => props.slides[props.index] ?? null)
const hasMany = computed(() => props.slides.length > 1)
const visibleHelpShortcuts = computed(() =>
  helpShortcuts.filter((item) => !item.whenMany || hasMany.value)
)
const counterLabel = computed(() =>
  props.slides.length ? `${props.index + 1} / ${props.slides.length}` : ''
)

const isZoomedAway = computed(() => Math.abs(scale.value - 1) > 0.01)

const transformStyle = computed(() => ({
  transform: `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${scale.value})`
}))

function clampScale(v: number) {
  return Math.min(props.maxScale, Math.max(props.minScale, v))
}

function stopZoomAnimation() {
  if (zoomRafId !== null) {
    cancelAnimationFrame(zoomRafId)
    zoomRafId = null
  }
  zoomLastTs = 0
  wheelAnimating.value = false
}

function syncZoomTargetsToCurrent() {
  targetScale.value = scale.value
  targetPanX.value = panX.value
  targetPanY.value = panY.value
}

function resetZoom(opts?: { animate?: boolean }) {
  dragging.value = false
  targetScale.value = 1
  targetPanX.value = 0
  targetPanY.value = 0
  if (opts?.animate) {
    startZoomAnimation()
    return
  }
  stopZoomAnimation()
  scale.value = 1
  panX.value = 0
  panY.value = 0
}

function viewportPointer(e: { clientX: number; clientY: number }) {
  const el = viewportRef.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return {
    x: e.clientX - rect.left - rect.width / 2,
    y: e.clientY - rect.top - rect.height / 2
  }
}

function updateImageBase() {
  const img = imgRef.value
  const vp = viewportRef.value
  if (!img?.naturalWidth || !vp) return

  const vw = vp.clientWidth
  const vh = vp.clientHeight
  const ar = img.naturalWidth / img.naturalHeight

  if (vw / vh > ar) {
    imageBase.value = { w: vh * ar, h: vh }
  } else {
    imageBase.value = { w: vw, h: vw / ar }
  }
}

function imageBounds(px: number, py: number, s: number) {
  const vp = viewportRef.value
  const { w: bw, h: bh } = imageBase.value
  if (!vp || !bw) return null

  const vw = vp.clientWidth
  const vh = vp.clientHeight
  const w = bw * s
  const h = bh * s
  return {
    vw,
    vh,
    w,
    h,
    L: vw / 2 + px - w / 2,
    R: vw / 2 + px + w / 2,
    T: vh / 2 + py - h / 2,
    B: vh / 2 + py + h / 2
  }
}

function outsideRatios(px: number, py: number, s: number) {
  const b = imageBounds(px, py, s)
  if (!b) return { left: 0, right: 0, top: 0, bottom: 0 }
  const { vw, vh, w, h, L, R, T, B } = b
  return {
    left: L < 0 ? Math.min(1, -L / w) : 0,
    right: R > vw ? Math.min(1, (R - vw) / w) : 0,
    top: T < 0 ? Math.min(1, -T / h) : 0,
    bottom: B > vh ? Math.min(1, (B - vh) / h) : 0
  }
}

function peekClampAxis(
  value: number,
  size: number,
  view: number,
  peek: number
) {
  if (size <= view) return 0
  const min = peek - view / 2 - size / 2
  const max = view - peek - view / 2 + size / 2
  return Math.min(max, Math.max(min, value))
}

/** 平移：拖拽中用软边界；松手或缩放后超 80% 移出则回弹至边沿对齐中心 */
function resolvePan(
  px: number,
  py: number,
  s: number,
  opts?: { allowSnap?: boolean }
) {
  const b = imageBounds(px, py, s)
  if (!b) return { x: px, y: py, didSnap: false }

  const { vw, vh, w, h } = b
  const peek = Math.min(56, vw * 0.14, vh * 0.14)
  let x = px
  let y = py
  let didSnap = false

  if (w <= vw) {
    x = 0
  } else if (opts?.allowSnap) {
    const r = outsideRatios(px, py, s)
    // 左侧移出过多 → 右缘对齐视口中心；右侧移出过多 → 左缘对齐视口中心
    if (r.left >= OUTSIDE_SNAP_RATIO) {
      x = -w / 2
      didSnap = true
    } else if (r.right >= OUTSIDE_SNAP_RATIO) {
      x = w / 2
      didSnap = true
    } else {
      x = peekClampAxis(px, w, vw, peek)
    }
  } else {
    x = peekClampAxis(px, w, vw, peek)
  }

  if (h <= vh) {
    y = 0
  } else if (opts?.allowSnap) {
    const r = outsideRatios(px, py, s)
    if (r.top >= OUTSIDE_SNAP_RATIO) {
      y = -h / 2
      didSnap = true
    } else if (r.bottom >= OUTSIDE_SNAP_RATIO) {
      y = h / 2
      didSnap = true
    } else {
      y = peekClampAxis(py, h, vh, peek)
    }
  } else {
    y = peekClampAxis(py, h, vh, peek)
  }

  return { x, y, didSnap }
}

function applyPanResolve(opts?: { animate?: boolean; allowSnap?: boolean }) {
  const s = targetScale.value
  const resolved = resolvePan(targetPanX.value, targetPanY.value, s, {
    allowSnap: opts?.allowSnap ?? true
  })
  targetPanX.value = resolved.x
  targetPanY.value = resolved.y

  if (opts?.animate) {
    startZoomAnimation()
    return
  }

  const live = resolvePan(panX.value, panY.value, scale.value, {
    allowSnap: opts?.allowSnap ?? true
  })
  panX.value = live.x
  panY.value = live.y
}

function clampPanState(syncDisplay = false, allowSnap = true) {
  const useSnap = allowSnap && !wheelAnimating.value
  applyPanResolve({ animate: false, allowSnap: useSnap })
  if (syncDisplay) {
    const live = resolvePan(panX.value, panY.value, scale.value, { allowSnap: false })
    panX.value = live.x
    panY.value = live.y
  }
}

function applyZoomAtPointer(mx: number, my: number, nextScale: number) {
  const s1 = targetScale.value
  const s2 = clampScale(nextScale)
  if (s2 === s1) return

  const ratio = s2 / s1
  targetPanX.value = mx - (mx - targetPanX.value) * ratio
  targetPanY.value = my - (my - targetPanY.value) * ratio
  targetScale.value = s2
  clampPanState()
}

function tickZoomAnimation(ts: number) {
  if (!zoomLastTs) zoomLastTs = ts
  const dt = Math.min((ts - zoomLastTs) / 1000, 0.032)
  zoomLastTs = ts

  const alpha = 1 - Math.exp(-dt / ZOOM_SMOOTH_TIME)
  const ds = targetScale.value - scale.value
  const dx = targetPanX.value - panX.value
  const dy = targetPanY.value - panY.value

  scale.value += ds * alpha
  panX.value += dx * alpha
  panY.value += dy * alpha

  if (Math.abs(ds) < 0.0004 && Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) {
    scale.value = targetScale.value
    panX.value = targetPanX.value
    panY.value = targetPanY.value
    stopZoomAnimation()
    return
  }

  zoomRafId = requestAnimationFrame(tickZoomAnimation)
}

function startZoomAnimation() {
  wheelAnimating.value = true
  if (zoomRafId === null) {
    zoomLastTs = 0
    zoomRafId = requestAnimationFrame(tickZoomAnimation)
  }
}

function close() {
  emit('update:open', false)
}

function go(delta: number) {
  if (!props.slides.length) return
  const next = (props.index + delta + props.slides.length) % props.slides.length
  emit('update:index', next)
}

function zoomBy(factor: number, mx = 0, my = 0) {
  applyZoomAtPointer(mx, my, targetScale.value * factor)
  startZoomAnimation()
}

function onWheel(e: WheelEvent) {
  if (!props.open || !current.value) return
  e.preventDefault()
  const { x: mx, y: my } = viewportPointer(e)
  const factor = Math.exp(-e.deltaY * props.wheelSensitivity)
  applyZoomAtPointer(mx, my, targetScale.value * factor)
  startZoomAnimation()
}

function blockNativeDrag(e: Event) {
  e.preventDefault()
}

function onImageDblClick(e: MouseEvent) {
  const { x: mx, y: my } = viewportPointer(e)
  if (targetScale.value > 1.05 || targetScale.value < 0.95) {
    resetZoom({ animate: true })
  } else {
    applyZoomAtPointer(mx, my, 2)
    startZoomAnimation()
  }
}

function onMiddleClickReset(e: MouseEvent | PointerEvent) {
  if (e.button !== 1) return
  e.preventDefault()
  resetZoom({ animate: true })
}

function canPanNow() {
  return (
    Math.abs(scale.value - 1) > 0.01 ||
    Math.abs(panX.value) > 0.5 ||
    Math.abs(panY.value) > 0.5
  )
}

function onViewportPointerDown(e: PointerEvent) {
  if (e.button === 1) {
    onMiddleClickReset(e)
    return
  }
  if (e.button !== 0 || !canPanNow()) return
  e.preventDefault()
  stopZoomAnimation()
  syncZoomTargetsToCurrent()
  dragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  dragStart.panX = panX.value
  dragStart.panY = panY.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onViewportPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const next = resolvePan(
    dragStart.panX + (e.clientX - dragStart.x),
    dragStart.panY + (e.clientY - dragStart.y),
    scale.value,
    { allowSnap: false }
  )
  panX.value = next.x
  panY.value = next.y
  targetPanX.value = next.x
  targetPanY.value = next.y
}

function onViewportPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  syncZoomTargetsToCurrent()
  applyPanResolve({ animate: true, allowSnap: true })
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowLeft' && hasMany.value) {
    e.preventDefault()
    go(-1)
  } else if (e.key === 'ArrowRight' && hasMany.value) {
    e.preventDefault()
    go(1)
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    zoomBy(1.15)
  } else if (e.key === '-') {
    e.preventDefault()
    zoomBy(1 / 1.15)
  } else if (e.key === '0') {
    e.preventDefault()
    resetZoom({ animate: true })
  }
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) resetZoom()
  }
)

watch(
  () => props.index,
  () => {
    resetZoom()
    imageBase.value = { w: 0, h: 0 }
  }
)

watch(
  () => current.value?.url,
  () => {
    imageBase.value = { w: 0, h: 0 }
  }
)

function onViewportResize() {
  if (props.open) updateImageBase()
}

function onViewerMouseMove(e: MouseEvent) {
  if (!props.open || !hasMany.value) {
    navEdgeHover.value = null
    return
  }
  const x = e.clientX
  const w = window.innerWidth
  if (x <= NAV_EDGE_PX) navEdgeHover.value = 'prev'
  else if (x >= w - NAV_EDGE_PX) navEdgeHover.value = 'next'
  else navEdgeHover.value = null
}

function onViewerMouseLeave() {
  navEdgeHover.value = null
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onViewportResize)
})
onUnmounted(() => {
  stopZoomAnimation()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onViewportResize)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ww-image-viewer">
      <div
        v-if="open"
        class="ww-image-viewer"
        :class="{ 'is-panning': dragging }"
        role="dialog"
        aria-modal="true"
        :aria-label="current?.alt ?? '图片查看'"
        @click.self="close"
        @mousemove="onViewerMouseMove"
        @mouseleave="onViewerMouseLeave"
      >
        <!-- 背景层：先暗角再动画模糊，不与图片同层避免糊图 -->
        <div class="ww-image-viewer__scrim" aria-hidden="true" />
        <div class="ww-image-viewer__blur" aria-hidden="true" />

        <div class="ww-image-viewer__stage">
            <div
              ref="viewportRef"
              class="ww-image-viewer__viewport"
              @wheel.prevent="onWheel"
              @dblclick.stop="onImageDblClick"
              @dragstart.prevent="blockNativeDrag"
              @pointerdown="onViewportPointerDown"
              @pointermove="onViewportPointerMove"
              @pointerup="onViewportPointerUp"
              @pointercancel="onViewportPointerUp"
              @auxclick.prevent="onMiddleClickReset"
            >
            <Transition name="ww-image-viewer-slide" mode="out-in">
              <div
                v-if="current"
                :key="current.url"
                class="ww-image-viewer__transform"
                :class="{
                  'is-dragging': dragging,
                  'is-zoomed': isZoomedAway,
                  'is-wheel-animating': wheelAnimating
                }"
                :style="transformStyle"
              >
                <img
                  ref="imgRef"
                  :src="current.url"
                  :alt="current.alt ?? ''"
                  class="ww-image-viewer__img"
                  draggable="false"
                  @load="updateImageBase"
                  @dragstart.prevent="blockNativeDrag"
                />
              </div>
            </Transition>
            </div>
        </div>

        <div class="ww-image-viewer__hud">
          <div
            v-if="hasMany"
            class="ww-image-viewer__nav-zone ww-image-viewer__nav-zone--prev"
          >
            <button
              type="button"
              class="ww-image-viewer__nav ww-image-viewer__nav-btn ww-glass-btn ww-glass-btn--icon ww-image-viewer__btn"
              :class="{ 'is-visible': navEdgeHover === 'prev' }"
              aria-label="上一张"
              @click.stop="go(-1)"
            >
              <WwIcon name="chevron-left" size="sm" />
            </button>
          </div>
          <div
            v-if="hasMany"
            class="ww-image-viewer__nav-zone ww-image-viewer__nav-zone--next"
          >
            <button
              type="button"
              class="ww-image-viewer__nav ww-image-viewer__nav-btn ww-glass-btn ww-glass-btn--icon ww-image-viewer__btn"
              :class="{ 'is-visible': navEdgeHover === 'next' }"
              aria-label="下一张"
              @click.stop="go(1)"
            >
              <WwIcon name="chevron-right" size="sm" />
            </button>
          </div>
          <span v-if="hasMany" class="ww-image-viewer__counter ww-glass-chip">{{ counterLabel }}</span>
          <div class="ww-image-viewer__top-actions">
            <div class="ww-image-viewer__help">
              <span
                class="ww-image-viewer__help-trigger ww-glass-btn ww-glass-btn--icon ww-image-viewer__btn"
                aria-hidden="true"
              >
                <WwIcon name="circle-help" size="sm" />
              </span>
              <div class="ww-image-viewer__help-popover" role="tooltip">
                <p class="ww-image-viewer__help-title">操作说明</p>
                <ul class="ww-image-viewer__help-list">
                  <li
                    v-for="(item, i) in visibleHelpShortcuts"
                    :key="i"
                    class="ww-image-viewer__help-row"
                  >
                    <span class="ww-image-viewer__help-keys">
                      <kbd
                        v-for="(key, ki) in item.keys"
                        :key="ki"
                        class="ww-image-viewer__help-kbd"
                      >{{ key }}</kbd>
                    </span>
                    <span class="ww-image-viewer__help-label">{{ item.label }}</span>
                  </li>
                </ul>
              </div>
            </div>
            <button
              type="button"
              class="ww-image-viewer__close ww-glass-btn ww-glass-btn--icon ww-image-viewer__btn"
              aria-label="关闭"
              @click="close"
            >
              <WwIcon name="x" size="sm" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.ww-glass-chip {
  border: 1px solid rgb(255 255 255 / 0.18);
  background: rgb(18 18 22 / 0.28);
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  color: #fff;
}


.ww-image-viewer {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.ww-image-viewer__scrim {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgb(8 8 10 / 0.35);
}

/* 默认即保持模糊（避免 enter-to 结束后回到 blur(0)） */
.ww-image-viewer__blur {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: rgb(10 10 12 / 0.28);
  backdrop-filter: blur(22px) saturate(1.15);
  -webkit-backdrop-filter: blur(22px) saturate(1.15);
}

.ww-image-viewer__stage {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: stretch;
  pointer-events: none;
}

.ww-image-viewer__stage > .ww-image-viewer__viewport {
  pointer-events: auto;
}

.ww-image-viewer__hud {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.ww-image-viewer__counter {
  position: absolute;
  top: var(--ww-viewer-inset);
  left: var(--ww-viewer-inset);
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0 0.5625rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.88);
  border-radius: 0.375rem;
  pointer-events: auto;
}

.ww-image-viewer__top-actions {
  position: absolute;
  top: var(--ww-viewer-inset);
  right: var(--ww-viewer-inset);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  pointer-events: auto;
}

.ww-image-viewer__close {
  position: static;
  flex-shrink: 0;
}

.ww-image-viewer__help {
  position: relative;
  flex-shrink: 0;
}

.ww-image-viewer__help-trigger {
  display: inline-flex;
  cursor: default;
}

.ww-image-viewer__help-popover {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 10;
  width: max-content;
  min-width: 11.75rem;
  max-width: 15.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.625rem;
  border: 1px solid rgb(255 255 255 / 0.12);
  background: rgb(12 12 16 / 0.52);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.04) inset,
    0 16px 48px rgb(0 0 0 / 0.38);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px) scale(0.98);
  transform-origin: top right;
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out),
    visibility var(--ww-duration) var(--ww-ease-out);
  pointer-events: none;
}

.ww-image-viewer__help:hover .ww-image-viewer__help-popover,
.ww-image-viewer__help:focus-within .ww-image-viewer__help-popover {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.ww-image-viewer__help-title {
  margin: 0 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.5);
}

.ww-image-viewer__help-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ww-image-viewer__help-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.875rem;
}

.ww-image-viewer__help-keys {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.ww-image-viewer__help-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.375rem;
  padding: 0.125rem 0.3125rem;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 0.25rem;
  background: rgb(255 255 255 / 0.08);
  font-family: inherit;
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 1.3;
  color: rgb(255 255 255 / 0.92);
}

.ww-image-viewer__help-label {
  font-size: 0.6875rem;
  line-height: 1.35;
  color: rgb(255 255 255 / 0.76);
  white-space: nowrap;
}

.ww-image-viewer .ww-image-viewer__btn.ww-glass-btn--icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgb(18 18 22 / 0.32);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border-color: rgb(255 255 255 / 0.16);
}

.ww-image-viewer .ww-image-viewer__btn.ww-glass-btn--icon:hover {
  background: rgb(18 18 22 / 0.48);
}

.ww-image-viewer .ww-image-viewer__btn.ww-glass-btn--icon .ww-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.ww-image-viewer .ww-image-viewer__nav-btn.ww-glass-btn--icon {
  width: 1.625rem;
  height: 2.5rem;
  border-radius: 0.4375rem;
}

.ww-image-viewer__nav-zone {
  position: absolute;
  top: 50%;
  z-index: 4;
  display: flex;
  align-items: center;
  width: auto;
  pointer-events: none;
  transform: translateY(-50%);
}

.ww-image-viewer__nav-zone--prev {
  left: 0;
  justify-content: flex-start;
  padding-left: var(--ww-viewer-inset);
}

.ww-image-viewer__nav-zone--next {
  right: 0;
  justify-content: flex-end;
  padding-right: var(--ww-viewer-inset);
}

.ww-image-viewer__nav {
  flex-shrink: 0;
  pointer-events: auto;
  opacity: 0;
  transform: translateX(0);
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-image-viewer__nav-zone--prev .ww-image-viewer__nav {
  transform: translateX(-4px);
}

.ww-image-viewer__nav-zone--next .ww-image-viewer__nav {
  transform: translateX(4px);
}

.ww-image-viewer__nav.is-visible,
.ww-image-viewer__nav:hover,
.ww-image-viewer__nav:focus-visible {
  opacity: 1;
  transform: translateX(0);
}

.ww-image-viewer__viewport {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: default;
  touch-action: none;
  pointer-events: auto;
}

.ww-image-viewer__transform {
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  will-change: transform;
  touch-action: none;
}

.ww-image-viewer__transform.is-zoomed {
  cursor: grab;
}

.ww-image-viewer__transform.is-dragging,
.ww-image-viewer__transform.is-wheel-animating {
  cursor: grab;
}

.ww-image-viewer__transform.is-dragging {
  cursor: grabbing;
}

.ww-image-viewer.is-panning .ww-image-viewer__viewport,
.ww-image-viewer.is-panning .ww-image-viewer__transform {
  cursor: grabbing !important;
}

.ww-image-viewer__img {
  display: block;
  max-width: 100dvw;
  max-height: 100dvh;
  object-fit: contain;
  border-radius: 0;
  box-shadow: none;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

/* 打开/关闭：遮罩淡入 + 模糊层动画（图片在 chrome 层保持清晰） */
.ww-image-viewer-enter-active,
.ww-image-viewer-leave-active {
  transition: opacity var(--ww-duration-slow) var(--ww-ease-out-slow);
}

.ww-image-viewer-enter-active .ww-image-viewer__scrim,
.ww-image-viewer-leave-active .ww-image-viewer__scrim {
  transition: background-color var(--ww-duration-slow) var(--ww-ease-out-slow);
}

.ww-image-viewer-enter-active .ww-image-viewer__blur,
.ww-image-viewer-leave-active .ww-image-viewer__blur {
  transition:
    backdrop-filter var(--ww-duration-slow) var(--ww-ease-out-slow),
    -webkit-backdrop-filter var(--ww-duration-slow) var(--ww-ease-out-slow),
    background-color var(--ww-duration-slow) var(--ww-ease-out-slow);
}

.ww-image-viewer-enter-active .ww-image-viewer__img,
.ww-image-viewer-leave-active .ww-image-viewer__img {
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-image-viewer-enter-from,
.ww-image-viewer-leave-to {
  opacity: 1;
}

.ww-image-viewer-enter-from .ww-image-viewer__scrim,
.ww-image-viewer-leave-to .ww-image-viewer__scrim {
  background: rgb(8 8 10 / 0);
}

.ww-image-viewer-enter-from .ww-image-viewer__blur,
.ww-image-viewer-leave-to .ww-image-viewer__blur {
  backdrop-filter: blur(0);
  -webkit-backdrop-filter: blur(0);
  background: rgb(10 10 12 / 0);
}

.ww-image-viewer-enter-from .ww-image-viewer__hud {
  opacity: 0;
}

.ww-image-viewer-enter-active .ww-image-viewer__hud {
  transition: opacity var(--ww-duration) var(--ww-ease-out) 0.08s;
}

.ww-image-viewer-enter-to .ww-image-viewer__hud,
.ww-image-viewer-leave-from .ww-image-viewer__hud {
  opacity: 1;
}

.ww-image-viewer-leave-active .ww-image-viewer__hud {
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-image-viewer-leave-to .ww-image-viewer__hud {
  opacity: 0;
}

.ww-image-viewer-enter-from .ww-image-viewer__img,
.ww-image-viewer-leave-to .ww-image-viewer__img {
  opacity: 0;
  transform: scale(0.97);
}

.ww-image-viewer-enter-to .ww-image-viewer__img,
.ww-image-viewer-leave-from .ww-image-viewer__img {
  opacity: 1;
  transform: scale(1);
}

.ww-image-viewer-slide-enter-active,
.ww-image-viewer-slide-leave-active {
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-image-viewer-slide-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.ww-image-viewer-slide-leave-to {
  opacity: 0;
  transform: scale(1.01);
}

@media (prefers-reduced-motion: reduce) {
  .ww-image-viewer-enter-active .ww-image-viewer__blur,
  .ww-image-viewer-leave-active .ww-image-viewer__blur {
    transition: background-color var(--ww-duration) var(--ww-ease-out);
  }

  .ww-image-viewer-enter-from .ww-image-viewer__blur,
  .ww-image-viewer-leave-to .ww-image-viewer__blur {
    backdrop-filter: blur(22px) saturate(1.15);
    -webkit-backdrop-filter: blur(22px) saturate(1.15);
    background: rgb(10 10 12 / 0.28);
  }

  .ww-image-viewer__transform {
    transition: none;
  }

  .ww-image-viewer__nav {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
