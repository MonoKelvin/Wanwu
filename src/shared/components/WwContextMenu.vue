<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwMenuItem } from '@shared/types/menu'

const props = defineProps<{
  model: WwMenuItem[]
}>()

const open = defineModel<boolean>('open', { default: false })

const menuRef = ref<HTMLElement | null>(null)
const pos = ref({ x: 0, y: 0 })

const visibleItems = computed(() => props.model.filter((item) => item.visible !== false))

function clampPosition(x: number, y: number) {
  const pad = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = menuRef.value?.offsetWidth ?? 168
  const h = menuRef.value?.offsetHeight ?? 160
  return {
    x: Math.min(Math.max(pad, x), Math.max(pad, vw - w - pad)),
    y: Math.min(Math.max(pad, y), Math.max(pad, vh - h - pad))
  }
}

async function placeAt(x: number, y: number) {
  open.value = true
  await nextTick()
  pos.value = clampPosition(x, y)
}

async function show(event: Event) {
  const e = event as MouseEvent
  await placeAt(e.clientX, e.clientY)
}

/** 锚点按钮下方、右对齐（图片区右上角菜单） */
async function showBelowAnchor(anchor: HTMLElement, gap = 6) {
  open.value = true
  await nextTick()
  const rect = anchor.getBoundingClientRect()
  const w = menuRef.value?.offsetWidth ?? 168
  pos.value = clampPosition(rect.right - w, rect.bottom + gap)
}

function toggleAnchor(anchor: HTMLElement) {
  if (open.value) hide()
  else void showBelowAnchor(anchor)
}

function hide() {
  open.value = false
}

function itemDisabled(item: WwMenuItem): boolean {
  const disabled = item.disabled
  return typeof disabled === 'function' ? disabled() : Boolean(disabled)
}

function runItem(item: WwMenuItem, event: MouseEvent) {
  if (itemDisabled(item)) return
  hide()
  item.command?.({ originalEvent: event, item })
}

function onDocPointerDown(e: PointerEvent) {
  if (!open.value) return
  const el = menuRef.value
  if (el?.contains(e.target as Node)) return
  hide()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') hide()
}

function bindGlobal() {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeydown)
}

function unbindGlobal() {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
}

watch(open, (v) => {
  if (v) bindGlobal()
  else unbindGlobal()
})

onUnmounted(unbindGlobal)

defineExpose({ show, hide, showBelowAnchor, toggleAnchor })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menuRef"
      class="ww-action-menu ww-glass-blur"
      role="menu"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <template v-for="(item, index) in visibleItems" :key="index">
        <hr v-if="item.separator" class="ww-action-menu__sep" />
        <button
          v-else
          type="button"
          role="menuitem"
          class="ww-action-menu__item"
          :class="[item.class, { 'is-disabled': itemDisabled(item) }]"
          :disabled="itemDisabled(item)"
          @click="runItem(item, $event)"
        >
          <WwIcon v-if="item.wwIcon" :name="item.wwIcon" size="sm" />
          <span class="ww-action-menu__label">{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
