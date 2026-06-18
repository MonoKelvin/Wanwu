<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { LeisureReadFavorite } from '@modules/library/leisure-read/domain/types'
import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'
import { toFavoriteCardView, type FavoriteCardView } from '@modules/library/leisure-read/domain/favorites'
import { LEISURE_READ_TAB_LABELS } from '@modules/library/leisure-read/domain/settings'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'
import type { WwMenuItem } from '@shared/types/menu'

const TAB_ICONS: Record<LeisureReadTabId, WwIconName> = {
  quote: 'sparkles',
  joke: 'thumbs-up',
  riddle: 'circle-help',
  article: 'book-open'
}

const CARD_ICONS: Record<string, WwIconName> = {
  full: 'book-open',
  snippet: 'paintbrush',
  item: 'star'
}

const tabs: LeisureReadTabId[] = ['quote', 'joke', 'riddle', 'article']

const REMOVE_RATIO = 0.6
const CLICK_DRAG_THRESHOLD = 8
const SNAP_MS = 520
const EXIT_MS = 440
const SHIFT_STAGGER_MS = 42
const OVERLAY_CLOSE_GUARD_MS = 420
const SNAP_EASE = 'cubic-bezier(0.34, 1.22, 0.64, 1)'
const EXIT_EASE = 'cubic-bezier(0.32, 0, 0.67, 0.35)'

type MotionPhase = 'drag' | 'snap' | 'exit'

interface DragPointer {
  card: FavoriteCardView
  pointerId: number
  startX: number
  startY: number
  deleteThreshold: number
  slideEl: HTMLElement
  cardLi: HTMLElement
  moved: boolean
}

const props = defineProps<{
  open: boolean
  favorites: LeisureReadFavorite[]
  activeTab: LeisureReadTabId
}>()

const emit = defineEmits<{
  close: []
  open: [favorite: LeisureReadFavorite]
  remove: [id: string]
}>()

const filterTab = defineModel<LeisureReadTabId>('filterTab', { required: true })

const glassSoft = ref(false)
const drawerRef = ref<HTMLElement | null>(null)
const gestureCardId = ref<string | null>(null)
const gesturePhase = ref<MotionPhase | null>(null)
const dragPointer = ref<DragPointer | null>(null)
const shiftFromIndex = ref<number | null>(null)
const contextMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const contextMenuCardId = ref<string | null>(null)

let motionGeneration = 0
let lastDragGestureAt = 0
let shiftResetTimer: ReturnType<typeof setTimeout> | null = null
let dragRafId = 0
let dragPendingOffset = 0
let dragDeleteReady = false

const contextMenuItems = computed<WwMenuItem[]>(() => [
  {
    label: '取消收藏',
    wwIcon: 'trash-2',
    command: () => {
      const id = contextMenuCardId.value
      if (id) removeCardAtIndex(id)
      contextMenuCardId.value = null
    }
  }
])

watch(
  () => props.open,
  (open) => {
    if (open) filterTab.value = props.activeTab
    else {
      glassSoft.value = false
      resetMotion()
    }
  }
)

function onAfterEnter() {
  glassSoft.value = true
}

function onBeforeLeave() {
  glassSoft.value = false
}

function onClose() {
  glassSoft.value = false
  emit('close')
}

const tabCounts = computed(() => {
  const counts: Record<LeisureReadTabId, number> = {
    quote: 0,
    joke: 0,
    riddle: 0,
    article: 0
  }
  for (const fav of props.favorites) counts[fav.tab] += 1
  return counts
})

const cards = computed(() =>
  props.favorites
    .filter((item) => item.tab === filterTab.value)
    .map(toFavoriteCardView)
)

function formatDate(ts: number) {
  const date = new Date(ts)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getDeleteThreshold() {
  return (drawerRef.value?.clientWidth ?? 368) * REMOVE_RATIO
}

function deleteToneProgress(offsetX: number) {
  const threshold = getDeleteThreshold()
  const abs = Math.abs(offsetX)
  if (abs < threshold) return 0
  const edge = threshold * 1.15
  if (abs >= edge) return 1
  return (abs - threshold) / (edge - threshold)
}

function shouldDelete(offsetX: number) {
  return Math.abs(offsetX) >= getDeleteThreshold()
}

function cardShiftDelay(index: number) {
  const origin = shiftFromIndex.value
  if (origin == null || index <= origin) return '0ms'
  return `${(index - origin) * SHIFT_STAGGER_MS}ms`
}

function cardLiStyle(cardId: string, index: number) {
  return {
    '--lr-fav-stagger': `${Math.min(index, 10) * 32}ms`,
    '--lr-fav-shift-delay': cardShiftDelay(index)
  }
}

function resetMotion() {
  const pointer = dragPointer.value
  if (pointer) clearGestureVisuals(pointer.slideEl, pointer.cardLi)

  motionGeneration++
  if (dragRafId) {
    cancelAnimationFrame(dragRafId)
    dragRafId = 0
  }
  dragPointer.value = null
  gestureCardId.value = null
  gesturePhase.value = null
  dragDeleteReady = false
  shiftFromIndex.value = null
  if (shiftResetTimer) {
    clearTimeout(shiftResetTimer)
    shiftResetTimer = null
  }
  unbindDragListeners()
}

function bindDragListeners() {
  document.addEventListener('pointermove', onDocPointerMove, { passive: false })
  document.addEventListener('pointerup', onDocPointerUp)
  document.addEventListener('pointercancel', onDocPointerUp)
}

function unbindDragListeners() {
  document.removeEventListener('pointermove', onDocPointerMove)
  document.removeEventListener('pointerup', onDocPointerUp)
  document.removeEventListener('pointercancel', onDocPointerUp)
}

function writeSlideOffset(slide: HTMLElement, offsetX: number) {
  slide.style.transform = `translate3d(${offsetX}px, 0, 0)`
}

function readSlideOffset(slide: HTMLElement) {
  const inline = slide.style.transform
  const match = inline.match(/translate3d\(([-\d.]+)px/)
  if (match) return Number.parseFloat(match[1])
  return new DOMMatrixReadOnly(getComputedStyle(slide).transform).m41
}

function setGestureTone(cardLi: HTMLElement, offsetX: number) {
  const tone = deleteToneProgress(offsetX)
  cardLi.style.setProperty('--lr-fav-drag-progress', String(tone))
  const ready = tone > 0
  if (ready !== dragDeleteReady) {
    dragDeleteReady = ready
    cardLi.classList.toggle('is-drag-delete-ready', ready)
  }
}

function clearGestureVisuals(slide: HTMLElement, cardLi: HTMLElement) {
  slide.style.removeProperty('transform')
  slide.style.removeProperty('transition')
  slide.style.removeProperty('opacity')
  slide.classList.remove('is-motion-animated')
  cardLi.classList.remove(
    'is-dragging',
    'is-snap-back',
    'is-exiting',
    'is-drag-delete-ready',
    'is-motion-animated'
  )
  cardLi.style.removeProperty('--lr-fav-drag-progress')
  dragDeleteReady = false
}

function settleSlideAfterGesture(slide: HTMLElement, cardLi: HTMLElement) {
  writeSlideOffset(slide, 0)
  slide.style.transition = 'none'
  slide.style.opacity = '1'
  slide.classList.remove('is-motion-animated')
  cardLi.classList.add('is-entered')
  cardLi.classList.remove(
    'is-dragging',
    'is-snap-back',
    'is-exiting',
    'is-drag-delete-ready',
    'is-motion-animated'
  )
  cardLi.style.removeProperty('--lr-fav-drag-progress')
  dragDeleteReady = false

  requestAnimationFrame(() => {
    slide.style.removeProperty('transform')
    slide.style.removeProperty('transition')
  })
}

function onCardEnterAnimationEnd(e: AnimationEvent) {
  if (e.animationName !== 'lr-fav-card-in') return
  const cardLi = (e.currentTarget as HTMLElement).closest('.lr-fav-drawer__card') as HTMLElement | null
  cardLi?.classList.add('is-entered')
}

function waitTransformTransition(slide: HTMLElement, timeoutMs: number) {
  return new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      slide.removeEventListener('transitionend', onEnd)
      resolve()
    }
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== slide) return
      if (event.propertyName === 'transform') finish()
    }
    slide.addEventListener('transitionend', onEnd)
    window.setTimeout(finish, timeoutMs)
  })
}

async function animateSlideOffset(
  slide: HTMLElement,
  cardLi: HTMLElement,
  fromOffset: number,
  toOffset: number,
  durationMs: number,
  ease: string,
  phaseClass: 'is-snap-back' | 'is-exiting',
  options?: { fadeOut?: boolean; tone?: number }
) {
  gesturePhase.value = phaseClass === 'is-snap-back' ? 'snap' : 'exit'
  cardLi.classList.remove('is-dragging', 'is-snap-back', 'is-exiting')
  cardLi.classList.add(phaseClass)

  if (phaseClass === 'is-snap-back') {
    dragDeleteReady = false
    cardLi.classList.remove('is-drag-delete-ready')
    cardLi.style.setProperty('--lr-fav-drag-progress', '0')
  } else if (options?.tone != null) {
    cardLi.style.setProperty('--lr-fav-drag-progress', String(options.tone))
    cardLi.classList.toggle('is-drag-delete-ready', options.tone > 0)
  }

  writeSlideOffset(slide, fromOffset)
  slide.style.transition = 'none'
  slide.style.opacity = '1'
  void slide.offsetWidth

  slide.classList.add('is-motion-animated')
  cardLi.classList.add('is-motion-animated')

  if (options?.fadeOut) {
    slide.style.transition = `transform ${durationMs}ms ${ease}, opacity ${Math.round(durationMs * 0.65)}ms ease ${Math.round(durationMs * 0.28)}ms`
  } else {
    slide.style.transition = `transform ${durationMs}ms ${ease}`
  }

  void slide.offsetWidth
  writeSlideOffset(slide, toOffset)
  if (options?.fadeOut) slide.style.opacity = '0'

  await waitTransformTransition(slide, durationMs + 80)
}

function rubberBandOffset(offsetX: number, threshold: number) {
  const edge = threshold * 1.15
  const abs = Math.abs(offsetX)
  if (abs <= edge) return offsetX
  const sign = Math.sign(offsetX)
  return sign * (edge + (abs - edge) * 0.14)
}

function computeExitOffset(currentOffset: number, slide: HTMLElement) {
  const sign = Math.sign(currentOffset)
  if (sign === 0) return currentOffset

  const drawer = drawerRef.value
  if (!drawer) return currentOffset + sign * 400

  const drawerRect = drawer.getBoundingClientRect()
  const rect = slide.getBoundingClientRect()
  const baseLeft = rect.left - currentOffset

  if (sign > 0) {
    return drawerRect.right - baseLeft + 40
  }
  return -(baseLeft - drawerRect.left + 40)
}

function scheduleShiftReset() {
  if (shiftResetTimer) clearTimeout(shiftResetTimer)
  shiftResetTimer = window.setTimeout(() => {
    shiftFromIndex.value = null
    shiftResetTimer = null
  }, 680)
}

function removeCardAtIndex(cardId: string) {
  const removedIndex = cards.value.findIndex((card) => card.id === cardId)
  if (removedIndex >= 0) shiftFromIndex.value = removedIndex
  emit('remove', cardId)
  scheduleShiftReset()
}

function flushDragFrame() {
  dragRafId = 0
  const pointer = dragPointer.value
  if (!pointer) return

  writeSlideOffset(pointer.slideEl, dragPendingOffset)
  setGestureTone(pointer.cardLi, dragPendingOffset)
}

function scheduleDragFrame() {
  if (dragRafId) return
  dragRafId = requestAnimationFrame(flushDragFrame)
}

async function runSnapBack(pointer: DragPointer, generation: number) {
  const { card, slideEl, cardLi } = pointer
  const currentOffset = readSlideOffset(slideEl)

  await animateSlideOffset(slideEl, cardLi, currentOffset, 0, SNAP_MS, SNAP_EASE, 'is-snap-back')

  if (generation !== motionGeneration) return
  settleSlideAfterGesture(slideEl, cardLi)
  gestureCardId.value = null
  gesturePhase.value = null
}

async function runExit(pointer: DragPointer, generation: number, exitTone: number) {
  const { card, slideEl, cardLi } = pointer
  const currentOffset = readSlideOffset(slideEl)
  const exitOffset = computeExitOffset(currentOffset, slideEl)

  await animateSlideOffset(
    slideEl,
    cardLi,
    currentOffset,
    exitOffset,
    EXIT_MS,
    EXIT_EASE,
    'is-exiting',
    { fadeOut: true, tone: exitTone }
  )

  if (generation !== motionGeneration) return

  writeSlideOffset(slideEl, exitOffset)
  slideEl.style.transition = 'none'
  removeCardAtIndex(card.id)
  gestureCardId.value = null
  gesturePhase.value = null
}

function onCardShiftAfterLeave(el: Element) {
  const slide = el.querySelector('.lr-fav-drawer__card-slide') as HTMLElement | null
  const cardLi = el as HTMLElement
  if (slide) clearGestureVisuals(slide, cardLi)
}

function onCardPointerDown(e: PointerEvent, card: FavoriteCardView) {
  if (e.button !== 0) return
  if (gesturePhase.value === 'exit') return

  e.stopPropagation()

  const slide = (e.currentTarget as HTMLElement).closest('.lr-fav-drawer__card-slide') as HTMLElement
  const cardLi = slide?.closest('.lr-fav-drawer__card') as HTMLElement
  if (!slide || !cardLi) return

  motionGeneration++
  unbindDragListeners()
  if (dragRafId) {
    cancelAnimationFrame(dragRafId)
    dragRafId = 0
  }

  let resumeOffset = 0
  if (gestureCardId.value === card.id) {
    resumeOffset = readSlideOffset(slide)
    clearGestureVisuals(slide, cardLi)
  } else if (gestureCardId.value) {
    resetMotion()
  }

  gestureCardId.value = card.id
  gesturePhase.value = 'drag'
  dragDeleteReady = deleteToneProgress(resumeOffset) > 0

  cardLi.classList.add('is-dragging')
  if (dragDeleteReady) cardLi.classList.add('is-drag-delete-ready')
  setGestureTone(cardLi, resumeOffset)
  writeSlideOffset(slide, resumeOffset)
  slide.style.transition = 'none'

  dragPointer.value = {
    card,
    pointerId: e.pointerId,
    startX: e.clientX - resumeOffset,
    startY: e.clientY,
    deleteThreshold: getDeleteThreshold(),
    slideEl: slide,
    cardLi,
    moved: false
  }

  bindDragListeners()
}

function onDocPointerMove(e: PointerEvent) {
  const pointer = dragPointer.value
  if (!pointer || pointer.pointerId !== e.pointerId) return

  const dx = e.clientX - pointer.startX
  const dy = e.clientY - pointer.startY
  if (!pointer.moved && Math.hypot(dx, dy) < CLICK_DRAG_THRESHOLD) return

  pointer.moved = true
  dragPendingOffset = rubberBandOffset(dx, pointer.deleteThreshold)
  scheduleDragFrame()
  e.preventDefault()
}

function onDocPointerUp(e: PointerEvent) {
  const pointer = dragPointer.value
  if (!pointer || pointer.pointerId !== e.pointerId) return

  unbindDragListeners()
  dragPointer.value = null
  if (dragRafId) {
    cancelAnimationFrame(dragRafId)
    dragRafId = 0
  }

  const { card, moved, slideEl, cardLi } = pointer
  flushDragFrame()

  const offsetX = readSlideOffset(slideEl)
  const exitTone = Math.max(deleteToneProgress(offsetX), 1)
  const generation = motionGeneration

  if (moved) lastDragGestureAt = Date.now()

  if (!moved) {
    clearGestureVisuals(slideEl, cardLi)
    gestureCardId.value = null
    gesturePhase.value = null
    emit('open', card.favorite)
    return
  }

  cardLi.classList.remove('is-dragging')

  if (shouldDelete(offsetX)) {
    void runExit({ ...pointer, moved: true }, generation, exitTone)
    return
  }

  void runSnapBack({ ...pointer, moved: true }, generation)
}

function onOverlayClick(e: MouseEvent) {
  if (e.target !== e.currentTarget) return
  if (dragPointer.value) return
  if (gesturePhase.value === 'exit') return
  if (Date.now() - lastDragGestureAt < OVERLAY_CLOSE_GUARD_MS) return
  onClose()
}

async function onCardContextMenu(e: MouseEvent, cardId: string) {
  e.preventDefault()
  e.stopPropagation()
  resetMotion()
  contextMenuCardId.value = cardId
  await nextTick()
  await contextMenuRef.value?.show(e)
}

function onCardKeydown(e: KeyboardEvent, favorite: LeisureReadFavorite) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('open', favorite)
  }
}

onBeforeUnmount(() => {
  unbindDragListeners()
  if (dragRafId) cancelAnimationFrame(dragRafId)
  if (shiftResetTimer) clearTimeout(shiftResetTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      name="lr-drawer"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
    >
      <div v-if="open" class="lr-fav-overlay" @click.self="onOverlayClick">
        <aside
          ref="drawerRef"
          class="lr-fav-drawer"
          :class="{ 'is-glass-soft': glassSoft }"
          role="dialog"
          aria-label="我的收藏"
          @click.stop
        >
          <header class="lr-fav-drawer__header">
            <div>
              <h2>我的收藏</h2>
              <p class="lr-fav-drawer__hint">
                点击可查看详情；通过右键菜单、左右拖动滑出面板后可取消收藏。
              </p>
            </div>
            <button
              type="button"
              class="lr-fav-drawer__close"
              v-tooltip.bottom="'关闭'"
              aria-label="关闭"
              @click="onClose"
            >
              <WwIcon name="x" size="sm" />
            </button>
          </header>

          <div class="lr-fav-drawer__tabs" role="tablist" aria-label="收藏分类">
            <button
              v-for="tab in tabs"
              :key="tab"
              type="button"
              role="tab"
              class="lr-fav-drawer__tab"
              :class="{ 'is-active': filterTab === tab }"
              :aria-selected="filterTab === tab"
              v-tooltip.bottom="LEISURE_READ_TAB_LABELS[tab]"
              :aria-label="LEISURE_READ_TAB_LABELS[tab]"
              @click="filterTab = tab"
            >
              <WwIcon :name="TAB_ICONS[tab]" size="sm" />
              <span v-if="tabCounts[tab]" class="lr-fav-drawer__tab-badge">{{ tabCounts[tab] }}</span>
            </button>
          </div>

          <div class="lr-fav-drawer__list-shell">
            <Transition name="lr-fav-list" mode="out-in">
              <TransitionGroup
                v-if="cards.length"
                :key="filterTab"
                tag="ul"
                name="lr-fav-card-shift"
                class="lr-fav-drawer__list"
                @after-leave="onCardShiftAfterLeave"
              >
                <li
                  v-for="(card, index) in cards"
                  :key="card.id"
                  v-memo="[card.id, gestureCardId === card.id, filterTab, index, shiftFromIndex]"
                  class="lr-fav-drawer__card"
                  :style="cardLiStyle(card.id, index)"
                  :data-card-id="card.id"
                >
                  <div
                    class="lr-fav-drawer__card-slide"
                    @animationend="onCardEnterAnimationEnd"
                  >
                    <div
                      role="button"
                      tabindex="0"
                      class="lr-fav-drawer__card-main"
                      @pointerdown="onCardPointerDown($event, card)"
                      @contextmenu="onCardContextMenu($event, card.id)"
                      @keydown="onCardKeydown($event, card.favorite)"
                    >
                      <span class="lr-fav-drawer__card-icon" :class="`is-${card.kind}`">
                        <WwIcon :name="CARD_ICONS[card.kind]" size="sm" />
                      </span>
                      <span class="lr-fav-drawer__card-body">
                        <span class="lr-fav-drawer__card-top">
                          <span class="lr-fav-drawer__title">{{ card.title }}</span>
                          <span v-if="card.kind === 'full'" class="lr-fav-drawer__chip is-muted">
                            全文
                          </span>
                        </span>
                        <span class="lr-fav-drawer__preview">{{ card.preview }}</span>
                        <span v-if="card.meta" class="lr-fav-drawer__meta">{{ card.meta }}</span>
                      </span>
                      <span class="lr-fav-drawer__card-trail" aria-hidden="true">
                        <span class="lr-fav-drawer__card-arrow-wrap">
                          <WwIcon name="chevron-right" size="sm" class="lr-fav-drawer__card-arrow" />
                        </span>
                        <span class="lr-fav-drawer__time">{{ formatDate(card.createdAt) }}</span>
                      </span>
                    </div>
                  </div>
                </li>
              </TransitionGroup>
              <div v-else :key="`empty-${filterTab}`" class="lr-fav-drawer__empty">
                <WwIcon name="inbox" :size="40" class="lr-fav-drawer__empty-icon" />
                <p>「{{ LEISURE_READ_TAB_LABELS[filterTab] }}」暂无收藏</p>
              </div>
            </Transition>
          </div>
        </aside>
        <WwContextMenu ref="contextMenuRef" :model="contextMenuItems" />
      </div>
    </Transition>
  </Teleport>
</template>
