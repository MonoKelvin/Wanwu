<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { wwMenuItemHasCheckColumn, type WwMenuItem } from '@shared/types/menu'

const props = defineProps<{
  model: WwMenuItem[]
}>()

const open = defineModel<boolean>('open', { default: false })

const menuRef = ref<HTMLElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)
const pos = ref({ x: 0, y: 0 })
const menuOrigin = ref('0% 0%')

const wrapStyle = computed(() => ({
  left: `${pos.value.x}px`,
  top: `${pos.value.y}px`,
  '--ww-action-menu-origin': menuOrigin.value
}))

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
  menuOrigin.value = '0% 0%'
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
  menuOrigin.value = '100% 0%'
  open.value = true
  await nextTick()
  const rect = anchor.getBoundingClientRect()
  const w = menuRef.value?.offsetWidth ?? 168
  pos.value = clampPosition(rect.right - w, rect.bottom + gap)
}

async function showBelowAnchorLeft(anchor: HTMLElement, gap = 4, offset = 8) {
  menuOrigin.value = '100% 0%'
  open.value = true
  await nextTick()
  const rect = anchor.getBoundingClientRect()
  const w = menuRef.value?.offsetWidth ?? 168
  pos.value = clampPosition(rect.left - w - offset, rect.bottom + gap)
}

function toggleAnchor(anchor: HTMLElement) {
  if (open.value) hide()
  else void showBelowAnchor(anchor)
}

function hide() {
  open.value = false
}

function containsTarget(node: Node | null | undefined): boolean {
  return Boolean(node && wrapRef.value?.contains(node))
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
  const el = menuRef.value?.parentElement
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

defineExpose({ show, hide, placeAt, showBelowAnchor, showBelowAnchorLeft, toggleAnchor, containsTarget })
</script>

<template>
  <Teleport to="body">
    <Transition name="ww-action-menu-pop">
      <div
        v-if="open"
        ref="wrapRef"
        class="ww-action-menu-wrap"
        :style="wrapStyle"
        @click.stop
        @contextmenu.prevent
      >
        <div ref="menuRef" class="ww-action-menu" role="menu">
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
              <kbd v-if="item.shortcut" class="ww-action-menu__shortcut">{{ item.shortcut }}</kbd>
            </button>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* 统一操作菜单（右键 / 锚点弹出） */
.ww-action-menu-wrap {
  position: fixed;
  z-index: var(--ww-z-context-menu, 10050);
}

.ww-action-menu-wrap .ww-action-menu {
  --ww-action-menu-blur: 3rem;
  --ww-action-menu-bg: rgb(255 255 255 / 0.72);

  min-width: 10.5rem;
  padding: 0.375rem;
  border: 1px solid var(--ww-glass-border);
  border-radius: 0.75rem;
  background: var(--ww-action-menu-bg);
  backdrop-filter: blur(var(--ww-action-menu-blur)) saturate(1.5);
  -webkit-backdrop-filter: blur(var(--ww-action-menu-blur)) saturate(1.5);
  box-shadow: var(--ww-menu-shadow);
  transform-origin: var(--ww-action-menu-origin, 0% 0%);
  isolation: isolate;
}

[data-theme='dark'] .ww-action-menu-wrap .ww-action-menu {
  --ww-action-menu-bg: rgb(32 32 36 / 0.76);
  border-color: var(--ww-glass-border);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .ww-action-menu-wrap .ww-action-menu {
    background: var(--ww-elevated);
  }
}

.ww-action-menu-pop-enter-active .ww-action-menu,
.ww-action-menu-pop-leave-active .ww-action-menu {
  transition: transform var(--ww-duration-fast) cubic-bezier(0.34, 1.12, 0.64, 1);
}

.ww-action-menu-pop-leave-active .ww-action-menu {
  transition-duration: 0.16s;
  transition-timing-function: var(--ww-ease-out);
}

.ww-action-menu-pop-enter-from .ww-action-menu,
.ww-action-menu-pop-leave-to .ww-action-menu {
  transform: scale(0.94) translateY(-0.25rem);
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

.ww-action-menu__shortcut {
  flex-shrink: 0;
  margin-left: 1.375rem;
  padding: 0;
  border: none;
  border-radius: 0;
  background: none;
  font: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  color: var(--ww-ink-muted);
  letter-spacing: normal;
}

.ww-action-menu__sep {
  margin: 0.25rem 0.375rem;
  border: none;
  border-top: 1px solid var(--ww-border-faint);
}

@media (prefers-reduced-motion: reduce) {
  .ww-action-menu-pop-enter-active .ww-action-menu,
  .ww-action-menu-pop-leave-active .ww-action-menu {
    transition: none;
  }

  .ww-action-menu-pop-enter-from .ww-action-menu,
  .ww-action-menu-pop-leave-to .ww-action-menu {
    transform: none;
  }
}
</style>
