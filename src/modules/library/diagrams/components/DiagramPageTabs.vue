<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { DiagramPage } from '@shared/types/diagrams'
import InputText from 'primevue/inputtext'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { useDiagramPageCommands } from '@modules/library/diagrams/composables/useDiagramPageCommands'
import { useDiagramEditorGuard } from '@modules/library/diagrams/composables/useDiagramEditorGuard'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { focusInputText } from '@modules/library/diagrams/lib/diagramInputFocus'
import { isDuplicatePageName } from '@modules/library/diagrams/lib/diagramPageNames'

const props = defineProps<{
  pages: DiagramPage[]
  activePageId: string | null
}>()

const pageCmd = useDiagramPageCommands()
const editorGuard = useDiagramEditorGuard()
const { ask } = useWanwuConfirm()
const toast = useWanwuToast()
const barRef = ref<HTMLElement | null>(null)
const inlineRef = ref<HTMLElement | null>(null)
const contextPageId = ref<string | null>(null)
const renamingPageId = ref<string | null>(null)
const renameValue = ref('')
const renameInputRef = ref<InstanceType<typeof InputText> | null>(null)
const skipRenameBlurCommit = ref(false)
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
  const page = props.pages.find((p) => p.id === pageId)
  if (!page) return []
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

function focusRenameInput(pageId: string) {
  void nextTick(() => {
    focusInputText(renameInputRef.value, { select: true })
    if (overflowPages.value.some((p) => p.id === pageId)) {
      const el = barRef.value?.querySelector('.dg-tab-rename--overflow input') as HTMLInputElement | null
      el?.focus()
      el?.select()
    }
  })
}

async function switchPage(pageId: string) {
  if (renamingPageId.value) {
    await commitRename()
  }
  if (pageId === editorGuard?.getActivePageId()) return
  overflowOpen.value = false
  await editorGuard?.flushSave()
  const result = await pageCmd.switch(pageId)
  if (!result.ok) {
    toast.error(result.message ?? '切换页面失败')
  }
}

async function addPage() {
  if (renamingPageId.value) {
    await commitRename()
  }
  overflowOpen.value = false
  await editorGuard?.flushSave()
  const result = await pageCmd.add()
  if (!result.ok) {
    toast.error(result.message ?? '新建页面失败')
  }
}

function startRename(pageId: string) {
  const page = props.pages.find((p) => p.id === pageId)
  if (!page) return
  renamingPageId.value = pageId
  renameValue.value = page.name
  overflowOpen.value = overflowPages.value.some((p) => p.id === pageId)
  focusRenameInput(pageId)
}

async function commitRename() {
  const pageId = renamingPageId.value
  if (!pageId) return
  const page = props.pages.find((p) => p.id === pageId)
  const trimmed = renameValue.value.trim()
  const name = trimmed || page?.name || ''
  renamingPageId.value = null

  if (!trimmed) return
  if (!page || name === page.name) return

  if (isDuplicatePageName(props.pages, name, pageId)) {
    toast.info('页面名称已存在', '无法重命名')
    renamingPageId.value = pageId
    renameValue.value = page.name
    focusRenameInput(pageId)
    return
  }

  await editorGuard?.flushSave()
  const result = await pageCmd.rename(pageId, name)
  if (!result.ok) {
    toast.info(result.message ?? '重命名失败', '无法重命名')
    renamingPageId.value = pageId
    renameValue.value = page.name
    focusRenameInput(pageId)
  }
}

function onRenameBlur() {
  if (skipRenameBlurCommit.value) {
    skipRenameBlurCommit.value = false
    return
  }
  void commitRename()
}

function cancelRename() {
  skipRenameBlurCommit.value = true
  renamingPageId.value = null
}

async function deletePage(pageId: string) {
  const page = props.pages.find((p) => p.id === pageId)
  if (!page || !canDeletePage.value) return

  const confirmed = await ask({
    header: '删除页面',
    message: `确定删除「${page.name}」？此操作不可撤销，页面内所有图元将一并删除。`,
    acceptLabel: '删除',
    rejectLabel: '取消',
    danger: true,
    width: 'min(92vw, 24rem)'
  })
  if (!confirmed) return

  if (renamingPageId.value === pageId) {
    renamingPageId.value = null
  }

  await editorGuard?.flushSave()
  const result = await pageCmd.delete(pageId)
  if (!result.ok) {
    toast.error(result.message ?? '删除页面失败')
  }
}

async function duplicatePage(pageId: string) {
  await editorGuard?.flushSave()
  const result = await pageCmd.duplicate(pageId)
  if (!result.ok) {
    toast.error(result.message ?? '复制页面失败')
  }
}

function onTabContextMenu(event: MouseEvent, pageId: string) {
  event.preventDefault()
  event.stopPropagation()
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
          @blur="onRenameBlur"
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
          @dblclick.prevent="onTabDblClick(page.id)"
          @contextmenu="onTabContextMenu($event, page.id)"
        >
          <InputText
            v-if="renamingPageId === page.id"
            v-model="renameValue"
            class="dg-tab-rename dg-tab-rename--overflow"
            @click.stop
            @keydown.enter.prevent="commitRename"
            @keydown.esc.prevent="cancelRename"
            @blur="onRenameBlur"
          />
          <span v-else>{{ page.name }}</span>
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
