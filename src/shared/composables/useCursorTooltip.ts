import { computed, onBeforeUnmount, ref, toValue, type MaybeRefOrGetter } from 'vue'

const DEFAULT_OFFSET_X = 12
const DEFAULT_OFFSET_Y = 16
const DEFAULT_SHOW_DELAY_MS = 420

export type UseCursorTooltipOptions = {
  offsetX?: number
  offsetY?: number
  showDelayMs?: number
}

/** 跟随鼠标的轻量 tooltip（样式与 Prime Tooltip / 图片区一致） */
export function useCursorTooltip(
  message: MaybeRefOrGetter<string>,
  options: UseCursorTooltipOptions = {}
) {
  const visible = ref(false)
  const x = ref(0)
  const y = ref(0)
  const messageText = computed(() => toValue(message))

  const offsetX = options.offsetX ?? DEFAULT_OFFSET_X
  const offsetY = options.offsetY ?? DEFAULT_OFFSET_Y
  const showDelayMs = options.showDelayMs ?? DEFAULT_SHOW_DELAY_MS

  let showTimer: ReturnType<typeof setTimeout> | null = null

  function clearShowTimer() {
    if (showTimer) {
      clearTimeout(showTimer)
      showTimer = null
    }
  }

  function updatePosition(event: MouseEvent) {
    const pad = 8
    const maxX = window.innerWidth - pad
    const maxY = window.innerHeight - pad
    x.value = Math.min(event.clientX + offsetX, maxX)
    y.value = Math.min(event.clientY + offsetY, maxY)
  }

  function scheduleShow() {
    clearShowTimer()
    showTimer = setTimeout(() => {
      visible.value = true
      showTimer = null
    }, showDelayMs)
  }

  function onMouseEnter(event: MouseEvent) {
    updatePosition(event)
    scheduleShow()
  }

  function onMouseMove(event: MouseEvent) {
    updatePosition(event)
    if (!visible.value && !showTimer) scheduleShow()
  }

  function onMouseLeave() {
    clearShowTimer()
    visible.value = false
  }

  onBeforeUnmount(clearShowTimer)

  return {
    visible,
    x,
    y,
    message: messageText,
    onMouseEnter,
    onMouseMove,
    onMouseLeave
  }
}
