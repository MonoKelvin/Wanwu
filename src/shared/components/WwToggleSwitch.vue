<script setup lang="ts">
import { computed, ref, useAttrs, type HTMLAttributes } from 'vue'

defineOptions({ inheritAttrs: false })

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    ariaLabel?: string
    /** 拖拽改值；布局会随开关变化的属性面板建议关闭 */
    dragToChange?: boolean
  }>(),
  {
    disabled: false,
    dragToChange: true
  }
)

const attrs = useAttrs() as HTMLAttributes
const passthroughAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
const rootRef = ref<HTMLButtonElement | null>(null)
const dragging = ref(false)
/** 超过阈值后为 true，用于拖拽态样式 */
const dragActive = ref(false)
/** 拖拽时 0–1 预览位置，松手后还原由 CSS 控制 */
const dragRatio = ref<number | null>(null)

const DRAG_THRESHOLD_PX = 4

type PointerSession = { x: number; moved: boolean }

let session: PointerSession | null = null

/** 拖拽中按预览比例显示，避免未提交前轨道样式滞后 */
const displayOn = computed(() => {
  if (dragRatio.value !== null) return dragRatio.value >= 0.5
  return Boolean(model.value)
})

const thumbStyle = computed(() => {
  if (dragRatio.value === null) return undefined
  const r = dragRatio.value
  return { left: `calc(2px + (100% - 1.125rem - 4px) * ${r})` }
})

function ratioFromClientX(clientX: number): number | null {
  const el = rootRef.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0) return null
  return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
}

/** 拖拽过程仅更新拇指预览，不写 model（避免父级重排导致开关位移后反复切换） */
function previewFromClientX(clientX: number) {
  const ratio = ratioFromClientX(clientX)
  if (ratio !== null) dragRatio.value = ratio
}

function commitFromClientX(clientX: number) {
  const ratio = ratioFromClientX(clientX)
  if (ratio === null) return
  const next = ratio >= 0.5
  if (model.value !== next) model.value = next
}

function resetPointerSession(event?: PointerEvent) {
  session = null
  dragging.value = false
  dragActive.value = false
  dragRatio.value = null
  if (event && rootRef.value?.hasPointerCapture(event.pointerId)) {
    rootRef.value.releasePointerCapture(event.pointerId)
  }
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled || !props.dragToChange) return
  session = { x: event.clientX, moved: false }
  dragging.value = true
  dragActive.value = false
  rootRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!session || props.disabled || !props.dragToChange) return
  if (!session.moved && Math.abs(event.clientX - session.x) >= DRAG_THRESHOLD_PX) {
    session.moved = true
    dragActive.value = true
  }
  if (session.moved) previewFromClientX(event.clientX)
}

function endPointer(event: PointerEvent) {
  if (!session || props.disabled || !props.dragToChange) return
  const { moved } = session
  try {
    if (!moved) {
      model.value = !model.value
    } else {
      commitFromClientX(event.clientX)
    }
  } finally {
    resetPointerSession(event)
  }
}

function onLostPointerCapture(event: PointerEvent) {
  if (!session || !props.dragToChange) return
  if (session.moved) {
    const ratio = dragRatio.value
    if (ratio !== null) {
      const next = ratio >= 0.5
      if (model.value !== next) model.value = next
    }
  }
  resetPointerSession(event)
}

function onClick() {
  if (props.disabled || props.dragToChange) return
  model.value = !model.value
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    model.value = !model.value
  }
}
</script>

<template>
  <button
    ref="rootRef"
    type="button"
    role="switch"
    v-bind="passthroughAttrs"
    class="ww-toggle-switch"
    :class="[
      attrs.class,
      {
        'is-on': displayOn,
        'is-disabled': disabled,
        'is-dragging': dragActive
      }
    ]"
    :aria-checked="displayOn"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="onClick"
    @pointerdown.prevent="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endPointer"
    @pointercancel="endPointer"
    @lostpointercapture="onLostPointerCapture"
    @keydown="onKeydown"
  >
    <span class="ww-toggle-switch__track" aria-hidden="true">
      <span class="ww-toggle-switch__thumb" :style="thumbStyle" />
    </span>
  </button>
</template>

<style scoped>
.ww-toggle-switch {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.375rem;
  height: 1.375rem;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.ww-toggle-switch.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ww-toggle-switch:focus-visible .ww-toggle-switch__track {
  outline: 2px solid var(--ww-list-hover-ring);
  outline-offset: 2px;
}

.ww-toggle-switch__track {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 999px;
  background: var(--ww-switch-track);
  box-sizing: border-box;
  transition:
    background 0.2s var(--ww-ease-out),
    border-color 0.2s var(--ww-ease-out);
}

.ww-toggle-switch:not(.is-disabled):hover .ww-toggle-switch__track {
  background: var(--ww-switch-track-hover);
}

.ww-toggle-switch.is-on .ww-toggle-switch__track {
  background: var(--ww-switch-track-on);
  border-color: var(--ww-switch-track-on);
}

.ww-toggle-switch.is-on:not(.is-disabled):hover .ww-toggle-switch__track {
  background: var(--ww-switch-track-on-hover);
  border-color: var(--ww-switch-track-on-hover);
}

.ww-toggle-switch__thumb {
  position: absolute;
  top: 50%;
  left: 2px;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  background: var(--ww-switch-thumb);
  box-shadow: var(--ww-switch-thumb-shadow);
  transform: translateY(-50%);
  transition:
    left 0.24s cubic-bezier(0.33, 1, 0.68, 1),
    background 0.16s var(--ww-ease-out),
    transform 0.16s cubic-bezier(0.33, 1, 0.68, 1);
}

.ww-toggle-switch.is-dragging .ww-toggle-switch__thumb {
  transition:
    left 0.04s linear,
    background 0.16s var(--ww-ease-out),
    transform 0.16s var(--ww-ease-out);
}

.ww-toggle-switch.is-on .ww-toggle-switch__thumb {
  left: calc(100% - 1.125rem - 2px);
  background: var(--ww-switch-thumb-on);
}

.ww-toggle-switch:active:not(.is-disabled):not(.is-dragging) .ww-toggle-switch__thumb {
  transform: translateY(-50%) scale(0.92);
}
</style>
