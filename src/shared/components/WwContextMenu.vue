<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { wwMenuItemHasCheckColumn, type WwMenuItem } from '@shared/types/menu'

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
          <span
            v-if="wwMenuItemHasCheckColumn(item)"
            class="ww-action-menu__check"
            aria-hidden="true"
          >
            <WwIcon v-if="item.checked" name="check" size="sm" />
          </span>
          <WwIcon v-if="item.wwIcon" :name="item.wwIcon" size="sm" />
          <span class="ww-action-menu__label">{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style>
/* 统一操作菜单（右键 / 锚点弹出，与图片区右上角菜单一致） */
.ww-action-menu {
  position: fixed;
  z-index: 10050;
  min-width: 10.5rem;
  padding: 0.375rem;
  border: none;
  border-radius: 0.75rem;
  background: var(--ww-glass-bg);
  box-shadow: var(--ww-menu-shadow);
}

.ww-action-menu.ww-glass-blur {
  border: none;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.ww-action-menu.ww-glass-blur::before {
  border-radius: 0.75rem;
  background: var(--ww-glass-bg-soft);
  backdrop-filter: blur(var(--ww-blur-glass)) saturate(1.35);
  -webkit-backdrop-filter: blur(var(--ww-blur-glass)) saturate(1.35);
}

.ww-action-menu__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4375rem 0.5625rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  font-size: 0.75rem;
  color: var(--ww-ink);
  text-align: left;
  cursor: pointer;
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-action-menu__check {
  flex-shrink: 0;
  display: flex;
  width: 1rem;
  align-items: center;
  justify-content: center;
}

.ww-action-menu__check .ww-icon {
  color: var(--ww-ink);
}

.ww-action-menu__item .ww-icon {
  flex-shrink: 0;
  color: var(--ww-ink-muted);
}

.ww-action-menu__item:hover:not(:disabled):not(.is-disabled) {
  background: var(--ww-action-menu-item-hover-bg);
}

.ww-action-menu__item.ww-page-toolbar-menu__item--active {
  background: var(--ww-list-selected-bg);
  font-weight: 500;
}

.ww-action-menu__item:disabled,
.ww-action-menu__item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ww-action-menu__label {
  flex: 1;
  min-width: 0;
}

.ww-action-menu__sep {
  margin: 0.25rem 0.375rem;
  border: none;
  border-top: 1px solid var(--ww-border-faint);
}
</style>
