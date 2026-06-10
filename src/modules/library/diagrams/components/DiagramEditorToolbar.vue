<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import DiagramShortcutsDialog from '@modules/library/diagrams/components/DiagramShortcutsDialog.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramEditorGuard } from '@modules/library/diagrams/composables/useDiagramEditorGuard'
import { useDiagramCatalogFileActions } from '@modules/library/diagrams/composables/useDiagramCatalogFileActions'
import { useDiagramSaveFlow } from '@modules/library/diagrams/composables/useDiagramSaveFlow'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { focusInputText } from '@modules/library/diagrams/lib/diagramInputFocus'
import {
  diagramTitleBase,
  normalizeDiagramTitleInput
} from '@modules/library/diagrams/lib/diagramHomeUtils'
import { DG_SHORTCUT } from '@modules/library/diagrams/lib/diagramKeyboardShortcuts'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  effectiveEdgeCount,
  effectiveNodeCount
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

const props = defineProps<{
  title: string
  dirty?: boolean
  saving?: boolean
  zoomPercent?: number
  folderId?: string
  fileId?: string | null
  /** 画布尚未就绪时禁用编辑操作，保留工具栏布局 */
  booting?: boolean
}>()

const selectionApi = useDiagramEditorSelection()
const editorSelection = selectionApi.selection

const saveBadge = computed(() => {
  if (props.saving) return { text: '保存中…', tone: 'saving' as const }
  if (props.dirty) return { text: '未保存', tone: 'dirty' as const }
  return null
})

const emit = defineEmits<{ back: [] }>()

const bus = useDiagramCommandBus()
const saveFlow = useDiagramSaveFlow()
const editorGuard = useDiagramEditorGuard()
const catalogActions = useDiagramCatalogFileActions()
const toast = useWanwuToast()
const { ask } = useWanwuConfirm()
const titleDraft = ref(diagramTitleBase(props.title))
const displayTitleBase = computed(() => diagramTitleBase(props.title))
const editingTitle = ref(false)
const titleInputRef = ref<InstanceType<typeof InputText> | null>(null)
const zoomLabel = computed(() => `${props.zoomPercent ?? 100}%`)

const canFormatPaint = computed(() => {
  if (props.booting) return false
  const s = editorSelection.value
  if (!s) return false
  const nc = effectiveNodeCount(s)
  const ec = effectiveEdgeCount(s)
  return (nc === 1 && ec === 0) || (ec === 1 && nc === 0)
})

const canClearStyle = computed(() => {
  if (props.booting) return false
  const s = editorSelection.value
  if (!s) return false
  if (s.canClearStyle != null) return s.canClearStyle
  return effectiveNodeCount(s) + effectiveEdgeCount(s) > 0
})

const formatPainterActive = computed(() => editorSelection.value.formatPainterActive ?? false)

function toggleFormatPainter() {
  if (formatPainterActive.value) {
    void bus.dispatch({ type: 'canvas.formatPainterCancel' })
    return
  }
  void bus.dispatch({ type: 'canvas.formatPainterStart' })
}

function clearStyles() {
  void bus.dispatch({ type: 'canvas.clearStyles' })
}

watch(
  () => props.title,
  (value) => {
    if (!editingTitle.value) titleDraft.value = diagramTitleBase(value)
  }
)

const fileMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const exportMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const viewMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const shortcutsOpen = ref(false)

async function save() {
  if (!props.dirty && !props.saving) return
  await editorGuard?.flushSave()
  await saveFlow.saveDocument({ title: titleDraft.value.trim() || undefined })
}

function saveAs() {
  saveFlow.promptSaveAs(titleDraft.value.trim() || undefined)
}

async function exportPng() {
  await editorGuard?.flushSave()
  const result = await bus.dispatch({ type: 'document.export', payload: { format: 'png' } })
  if (!result.ok || !result.data) {
    toast.error(result.ok ? '导出失败' : (result.message ?? '导出失败'))
    return
  }
  const blob = (result.data as { blob: Blob }).blob
  const dataUrl = await blobToDataUrl(blob)
  const saved = await window.wanwu.shell.savePngDataUrl({
    dataUrl,
    defaultName: `${props.title || '流程图'}.png`
  })
  if (saved.ok && saved.path) toast.success('已导出 PNG')
}

async function exportAllPagesPng() {
  await editorGuard?.flushSave()
  const result = await bus.dispatch({
    type: 'document.export',
    payload: { format: 'png', scope: 'all' }
  })
  if (!result.ok || !result.data) {
    toast.error(result.ok ? '导出失败' : (result.message ?? '导出失败'))
    return
  }
  const pages = (result.data as { pages: Array<{ pageName: string; blob: Blob }> }).pages
  let savedCount = 0
  const base = props.title || '流程图'
  for (const page of pages) {
    const dataUrl = await blobToDataUrl(page.blob)
    const saved = await window.wanwu.shell.savePngDataUrl({
      dataUrl,
      defaultName: `${base}-${page.pageName}.png`
    })
    if (saved.canceled) break
    if (saved.ok) savedCount++
  }
  if (savedCount > 0) toast.success(`已导出 ${savedCount} 页 PNG`)
}

async function importExternalFile(type: 'document.importWfg' | 'document.importDrawio', label: string) {
  await editorGuard?.flushSave()
  let result = await bus.dispatch({ type, payload: { folderId: props.folderId } })
  if (!result.ok && result.code === 'VALIDATION') {
    const discard = await ask({
      header: '未保存的更改',
      message: '导入将替换当前画布内容。不保存并导入，还是取消？',
      acceptLabel: '不保存并导入',
      rejectLabel: '取消'
    })
    if (!discard) return
    result = await bus.dispatch({
      type,
      payload: { discard: true, folderId: props.folderId }
    })
  }
  if (!result.ok) {
    if (result.message && result.code !== 'VALIDATION') toast.error(result.message)
    return
  }
  const data = result.data as { canceled?: boolean; title?: string }
  if (data.canceled) return
  toast.success(`已导入${label}${data.title ? `：${data.title}` : ''}`)
}

async function exportWfg() {
  await editorGuard?.flushSave()
  const result = await bus.dispatch({ type: 'document.export', payload: { format: 'wfg' } })
  if (!result.ok) {
    toast.error(result.message ?? '导出失败')
    return
  }
  const data = result.data as { canceled?: boolean; path?: string }
  if (data.canceled) return
  if (data.path) toast.success('已导出流程图')
}

async function exportSvg() {
  await editorGuard?.flushSave()
  const result = await bus.dispatch({ type: 'document.export', payload: { format: 'svg' } })
  if (!result.ok || !result.data) {
    toast.error(result.ok ? '导出失败' : (result.message ?? '导出失败'))
    return
  }
  const svg = (result.data as { svg: string }).svg
  const saved = await window.wanwu.shell.saveTextFile({
    content: svg,
    defaultName: `${props.title || '流程图'}.svg`,
    extension: 'svg'
  })
  if (saved.ok && saved.path) toast.success('已导出 SVG')
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function startTitleEdit() {
  editingTitle.value = true
  titleDraft.value = displayTitleBase.value
  requestAnimationFrame(() => focusInputText(titleInputRef.value, { select: true }))
}

async function commitTitleEdit() {
  editingTitle.value = false
  const next = normalizeDiagramTitleInput(titleDraft.value)
  if (!next || next === displayTitleBase.value) {
    titleDraft.value = displayTitleBase.value
    return
  }
  await editorGuard?.flushSave()
  const result = await saveFlow.saveDocument({ title: next })
  if (!result) titleDraft.value = displayTitleBase.value
}

function cancelTitleEdit() {
  editingTitle.value = false
  titleDraft.value = displayTitleBase.value
}

const fileMenuItems = computed<WwMenuItem[]>(() => {
  const items: WwMenuItem[] = [
    {
      label: '保存',
      wwIcon: 'save',
      shortcut: DG_SHORTCUT.save,
      disabled: !props.dirty && !props.saving,
      command: () => void save()
    },
    { label: '另存为', wwIcon: 'copy', shortcut: DG_SHORTCUT.saveAs, command: () => void saveAs() }
  ]
  if (props.fileId) {
    items.push({
      label: '在文件夹中显示',
      wwIcon: 'folder-open',
      command: () => void catalogActions.revealFile(props.fileId!)
    })
  }
  items.push(
    { separator: true },
    { label: '打开流程图文件', wwIcon: 'inbox', command: () => void importExternalFile('document.importWfg', '流程图') },
    { label: '打开 draw.io', wwIcon: 'external-link', command: () => void importExternalFile('document.importDrawio', ' draw.io') }
  )
  return items
})

const exportMenuItems: WwMenuItem[] = [
  { label: '导出流程图', wwIcon: 'box', command: () => void exportWfg() },
  { separator: true },
  { label: '导出当前页 PNG', wwIcon: 'image', command: () => void exportPng() },
  { label: '导出全部页 PNG', wwIcon: 'layers', command: () => void exportAllPagesPng() },
  { label: '导出当前页 SVG', wwIcon: 'download', command: () => void exportSvg() }
]

const viewMenuItems: WwMenuItem[] = [
  {
    label: '放大',
    wwIcon: 'plus',
    command: () => void bus.dispatch({ type: 'canvas.zoom', payload: { delta: 0.1 } })
  },
  {
    label: '缩小',
    wwIcon: 'minus',
    command: () => void bus.dispatch({ type: 'canvas.zoom', payload: { delta: -0.1 } })
  },
  { separator: true },
  {
    label: '重置缩放',
    wwIcon: 'maximize',
    shortcut: DG_SHORTCUT.zoomReset,
    command: () => void bus.dispatch({ type: 'canvas.zoomReset' })
  },
  {
    label: '适应画布',
    wwIcon: 'layout-grid',
    shortcut: DG_SHORTCUT.zoomFit,
    command: () => void bus.dispatch({ type: 'canvas.zoomToFit' })
  },
  {
    label: '原点居中',
    wwIcon: 'compass',
    command: () => void bus.dispatch({ type: 'canvas.centerOrigin' })
  }
]

function openMenu(
  event: MouseEvent,
  menu: InstanceType<typeof WwContextMenu> | null
) {
  event.stopPropagation()
  const anchor = event.currentTarget as HTMLElement
  void menu?.showBelowAnchor(anchor, 6)
}
</script>

<template>
  <header
    class="dg-editor-toolbar dg-float dg-float--top-center ww-glass-blur"
    :class="{ 'dg-editor-toolbar--booting': booting }"
    role="toolbar"
    :aria-busy="booting || undefined"
  >
    <div class="dg-editor-toolbar__lead">
      <WwButton
        icon="arrow-left"
        severity="secondary"
        text
        rounded
        class="dg-toolbar-icon-btn"
        aria-label="返回"
        @click="emit('back')"
      />
      <div v-if="editingTitle" class="dg-editor-toolbar__title-edit">
        <InputText
          ref="titleInputRef"
          v-model="titleDraft"
          class="dg-editor-toolbar__title-input"
          @keydown.enter.prevent="commitTitleEdit"
          @keydown.esc.prevent="cancelTitleEdit"
          @blur="commitTitleEdit"
        />
      </div>
      <button
        v-else-if="!booting"
        type="button"
        class="dg-editor-toolbar__title"
        :title="displayTitleBase"
        @click="startTitleEdit"
      >
        <span class="dg-editor-toolbar__title-name">{{ displayTitleBase }}</span>
      </button>
      <span v-else class="dg-editor-toolbar__title dg-editor-toolbar__title--static">
        <span class="dg-editor-toolbar__title-name">{{ displayTitleBase }}</span>
      </span>
      <span
        v-if="saveBadge && !booting"
        class="dg-editor-toolbar__badge"
        :class="`dg-editor-toolbar__badge--${saveBadge.tone}`"
        :aria-live="saveBadge.tone === 'saving' ? 'polite' : undefined"
      >
        {{ saveBadge.text }}
      </span>
    </div>

    <div class="dg-editor-toolbar__actions">
      <div class="dg-editor-toolbar__zoom">
        <WwButton
          icon="paintbrush"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          :class="{ 'dg-toolbar-icon-btn--active': formatPainterActive }"
          aria-label="格式刷"
          :disabled="booting || (!formatPainterActive && !canFormatPaint)"
          v-tooltip.bottom="'格式刷'"
          @click="toggleFormatPainter"
        />
        <WwButton
          icon="eraser"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="清空样式"
          :disabled="booting || !canClearStyle"
          v-tooltip.bottom="'清空样式'"
          @click="clearStyles"
        />
        <WwButton
          icon="undo"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="撤销"
          :disabled="booting"
          v-tooltip.bottom="'撤销 (Ctrl+Z)'"
          @click="bus.dispatch({ type: 'canvas.undo' })"
        />
        <WwButton
          icon="redo"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="重做"
          :disabled="booting"
          v-tooltip.bottom="'重做 (Ctrl+Y)'"
          @click="bus.dispatch({ type: 'canvas.redo' })"
        />
        <WwButton
          icon="layout-grid"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="适应画布"
          :disabled="booting"
          v-tooltip.bottom="'适应画布'"
          @click="bus.dispatch({ type: 'canvas.zoomToFit' })"
        />
        <button
          type="button"
          class="dg-editor-toolbar__zoom-label"
          :disabled="booting"
          :title="booting ? undefined : `当前缩放 ${zoomLabel}，点击重置`"
          @click="bus.dispatch({ type: 'canvas.zoomReset' })"
        >
          {{ zoomLabel }}
        </button>
      </div>

      <div class="dg-editor-toolbar__menus">
        <WwButton
          icon="save"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="保存"
          :disabled="booting || (!dirty && !saving)"
          v-tooltip.bottom="'保存 (Ctrl+S)'"
          @click="save"
        />
        <WwButton
          icon="folder"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="文件"
          :disabled="booting"
          v-tooltip.bottom="'文件'"
          @click="openMenu($event, fileMenuRef)"
        />
        <WwButton
          icon="download"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="导出"
          :disabled="booting"
          v-tooltip.bottom="'导出'"
          @click="openMenu($event, exportMenuRef)"
        />
        <WwButton
          icon="eye"
          severity="secondary"
          text
          rounded
          class="dg-toolbar-icon-btn"
          aria-label="视图"
          :disabled="booting"
          v-tooltip.bottom="'视图'"
          @click="openMenu($event, viewMenuRef)"
        />
      </div>
    </div>

    <div class="dg-editor-toolbar__trail">
      <WwButton
        icon="circle-help"
        severity="secondary"
        text
        rounded
        class="dg-toolbar-icon-btn"
        aria-label="快捷键"
        :disabled="booting"
        v-tooltip.bottom="'快捷键'"
        @click="shortcutsOpen = true"
      />
    </div>

    <WwContextMenu ref="fileMenuRef" :model="fileMenuItems" />
    <WwContextMenu ref="exportMenuRef" :model="exportMenuItems" />
    <WwContextMenu ref="viewMenuRef" :model="viewMenuItems" />
    <DiagramShortcutsDialog v-model:open="shortcutsOpen" />
  </header>
</template>
