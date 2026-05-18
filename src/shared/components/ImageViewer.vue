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
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    go(-1)
  } else if (e.key === 'ArrowRight') {
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
