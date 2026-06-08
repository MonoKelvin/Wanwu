<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { DiagramPage } from '@shared/types/diagrams'
import InputText from 'primevue/inputtext'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramEditorGuard } from '@modules/library/diagrams/composables/useDiagramEditorGuard'
import { focusInputText } from '@modules/library/diagrams/lib/diagramInputFocus'

const props = defineProps<{
  pages: DiagramPage[]
  activePageId: string | null
}>()

const bus = useDiagramCommandBus()
const editorGuard = useDiagramEditorGuard()
const barRef = ref<HTMLElement | null>(null)
const inlineRef = ref<HTMLElement | null>(null)
const contextPageId = ref<string | null>(null)
const renamingPageId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRef = ref<InstanceType<typeof InputText> | null>(null)
const tabMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const overflowOpen = ref(false)
const maxInlineTabs = ref(6)

const sortedPages = computed(() =>
  [...props.pages].sort((a, b) => a.sortOrder - b.sortOrder)
)

const needsOverflow = computed(() => sortedPages.value.length > maxInlineTabs.value)

const inlinePages = computed(() => {
  const pages = sortedPages.value
  if (!needsOverflow.value) return pages
  const limit = Math.max(1, maxInlineTabs.value - 1)
  const activeIdx = pages.findIndex((p) => p.id === props.activePageId)
  const start = Math.max(0, Math.min(activeIdx < 0 ? 0 : activeIdx - 1, pages.length - limit))
  return pages.slice(start, start + limit)
})

const overflowPages = computed(() => {
  if (!needsOverflow.value) return []
  const inlineIds = new Set(inlinePages.value.map((p) => p.id))
  return sortedPages.value.filter((p) => !inlineIds.has(p.id))
})

const canDeletePage = computed(() => props.pages.length > 1)

const tabMenuItems = computed<WwMenuItem[]>(() => {
  const pageId = contextPageId.value
  if (!pageId) return []
  return [
    { label: '重命名', wwIcon: 'pencil', command: () => startRename(pageId) },
    { label: '复制页', wwIcon: 'copy', command: () => void duplicatePage(pageId) },
    {
      label: '删除页',
      wwIcon: 'trash-2',
      disabled: !canDeletePage.value,
      command: () => void deletePage(pageId)
    }
  ]
})

let resizeObserver: ResizeObserver | null = null
let resizeRaf = 0

function recalcInlineCapacity() {
  const bar = barRef.value
  const inline = inlineRef.value
  if (!bar || !inline) return
  const reserved = 88
  const available = Math.max(120, bar.clientWidth - reserved)
  const tabWidth = 76
  maxInlineTabs.value = Math.max(2, Math.min(8, Math.floor(available / tabWidth)))
}

onMounted(() => {
  recalcInlineCapacity()
  if (barRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        recalcInlineCapacity()
      })
    })
    resizeObserver.observe(barRef.value)
  }
  document.addEventListener('pointerdown', onDocPointerDown)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  document.removeEventListener('pointerdown', onDocPointerDown)
})

function onDocPointerDown(event: PointerEvent) {
  if (!overflowOpen.value) return
  const target = event.target as Node | null
  if (barRef.value?.contains(target)) return
  overflowOpen.value = false
}

async function switchPage(pageId: string) {
  if (renamingPageId.value || pageId === props.activePageId) return
  overflowOpen.value = false
  await editorGuard?.flushSave()
  void bus.dispatch({ type: 'page.switch', payload: { pageId } })
}

async function addPage() {
  overflowOpen.value = false
  await editorGuard?.flushSave()
  void bus.dispatch({ type: 'page.add' })
}

function startRename(pageId: string) {
  const page = props.pages.find((p) => p.id === pageId)
  if (!page) return
  renamingPageId.value = pageId
  renameValue.value = page.name
  overflowOpen.value = false
  void nextTick(() => focusInputText(renameInputRef.value, { select: true }))
}

async function commitRename() {
  const pageId = renamingPageId.value
  if (!pageId) return
  const name = renameValue.value.trim()
  renamingPageId.value = null
  if (!name) return
  await editorGuard?.flushSave()
  await bus.dispatch({ type: 'page.rename', payload: { pageId, name } })
}

function cancelRename() {
  renamingPageId.value = null
}

async function deletePage(pageId: string) {
  await editorGuard?.flushSave()
  await bus.dispatch({ type: 'page.delete', payload: { pageId } })
}

async function duplicatePage(pageId: string) {
  await editorGuard?.flushSave()
  await bus.dispatch({ type: 'page.duplicate', payload: { pageId } })
}

function onTabContextMenu(event: MouseEvent, pageId: string) {
  event.preventDefault()
  contextPageId.value = pageId
  void tabMenuRef.value?.show(event)
}

function onTabDblClick(pageId: string) {
  startRename(pageId)
}

function toggleOverflow() {
  overflowOpen.value = !overflowOpen.value
}
</script>

<template>
  <footer ref="barRef" class="dg-tabs-bar dg-tabs-float ww-glass-blur">
    <div ref="inlineRef" class="dg-tabs-bar__inline">
      <button
        v-for="page in inlinePages"
        :key="page.id"
        type="button"
        class="dg-tab"
        :class="{ 'dg-tab--active': page.id === activePageId }"
        @click="switchPage(page.id)"
        @dblclick.prevent="onTabDblClick(page.id)"
        @contextmenu="onTabContextMenu($event, page.id)"
      >
        <InputText
          v-if="renamingPageId === page.id"
          ref="renameInputRef"
          v-model="renameValue"
          class="dg-tab-rename"
          @click.stop
          @keydown.enter.prevent="commitRename"
          @keydown.esc.prevent="cancelRename"
          @blur="commitRename"
        />
        <span v-else class="dg-tab__label">{{ page.name }}</span>
      </button>
    </div>

    <div v-if="overflowPages.length" class="dg-tabs-overflow-wrap">
      <button
        type="button"
        class="dg-tabs-overflow-btn"
        :class="{ 'dg-tabs-overflow-btn--open': overflowOpen }"
        :aria-expanded="overflowOpen"
        aria-label="更多页面"
        @click="toggleOverflow"
      >
        <WwIcon name="ellipsis" size="sm" />
        <span v-if="overflowPages.length" class="dg-tabs-overflow-btn__count">{{ overflowPages.length }}</span>
      </button>
      <div v-if="overflowOpen" class="dg-tabs-overflow-panel ww-glass-blur">
        <button
          v-for="page in overflowPages"
          :key="page.id"
          type="button"
          class="dg-tabs-overflow-item"
          :class="{ 'dg-tabs-overflow-item--active': page.id === activePageId }"
          @click="switchPage(page.id)"
          @contextmenu="onTabContextMenu($event, page.id)"
        >
          {{ page.name }}
        </button>
      </div>
    </div>

    <WwIconButton
      icon="plus"
      icon-size="sm"
      class="dg-tab-add dg-toolbar-icon-btn"
      ariaLabel="新增页"
      compact
      @click="addPage"
    />
    <WwContextMenu ref="tabMenuRef" :model="tabMenuItems" />
  </footer>
</template>
