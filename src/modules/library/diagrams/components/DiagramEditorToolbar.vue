<script setup lang="ts">
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import { computed, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import DiagramShortcutsDialog from '@modules/library/diagrams/components/DiagramShortcutsDialog.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramCanvasCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import { useDiagramEditorGuard } from '@modules/library/diagrams/composables/useDiagramEditorGuard'
import { useDiagramCatalogFileActions } from '@modules/library/diagrams/composables/useDiagramCatalogFileActions'
import { useDiagramSaveFlow } from '@modules/library/diagrams/composables/useDiagramSaveFlow'
import { useDiagramUiRuntime } from '@modules/library/diagrams/composables/useDiagramUiRuntime'
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
import {
  ExportAllPagesPngUiCommand,
  ExportCurrentPagePngUiCommand,
  ExportSvgUiCommand,
  ExportWfgUiCommand,
  runImportExternalFileUiCommand
} from '@modules/library/diagrams/app/command/ui/fileExportUiCommands'

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
const canvas = useDiagramCanvasCommands()
const saveFlow = useDiagramSaveFlow()
const editorGuard = useDiagramEditorGuard()
const catalogActions = useDiagramCatalogFileActions()
const uiRuntime = useDiagramUiRuntime()
const exportPngCmd = new ExportCurrentPagePngUiCommand()
const exportAllPngCmd = new ExportAllPagesPngUiCommand()
const exportWfgCmd = new ExportWfgUiCommand()
const exportSvgCmd = new ExportSvgUiCommand()
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
  if (formatPainterActive.value) canvas.formatPainterCancel()
  else canvas.formatPainterStart()
}

function clearStyles() {
  canvas.clearStyles()
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
  await exportPngCmd.run(
    bus,
    { defaultName: `${props.title || '流程图'}.png` },
    uiRuntime
  )
}

async function exportAllPagesPng() {
  await editorGuard?.flushSave()
  await exportAllPngCmd.run(bus, { titleBase: props.title || '流程图' }, uiRuntime)
}

async function importExternalFile(
  type: typeof DiagramCmd.File.ImportWfg | typeof DiagramCmd.File.ImportDrawio,
  label: string
) {
  await editorGuard?.flushSave()
  await runImportExternalFileUiCommand(
    bus,
    { type, folderId: props.folderId, label },
    uiRuntime
  )
}

async function exportWfg() {
  await editorGuard?.flushSave()
  await exportWfgCmd.run(bus, undefined!, uiRuntime)
}

async function exportSvg() {
  await editorGuard?.flushSave()
  await exportSvgCmd.run(
    bus,
    { defaultName: `${props.title || '流程图'}.svg` },
    uiRuntime
  )
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

const fileMenuItems = computed(() => {
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
    { label: '打开流程图文件', wwIcon: 'inbox', command: () => void importExternalFile(DiagramCmd.File.ImportWfg, '流程图') },
    { label: '打开 draw.io', wwIcon: 'external-link', command: () => void importExternalFile(DiagramCmd.File.ImportDrawio, ' draw.io') }
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
    command: () => canvas.zoom(0.1)
  },
  {
    label: '缩小',
    wwIcon: 'minus',
    command: () => canvas.zoom(-0.1)
  },
  { separator: true },
  {
    label: '重置缩放',
    wwIcon: 'maximize',
    shortcut: DG_SHORTCUT.zoomReset,
    command: () => canvas.zoomReset()
  },
  {
    label: '适应画布',
    wwIcon: 'layout-grid',
    shortcut: DG_SHORTCUT.zoomFit,
    command: () => canvas.zoomToFit()
  },
  {
    label: '原点居中',
    wwIcon: 'compass',
    command: () => canvas.centerOrigin()
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
          @click="canvas.undo()"
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
          @click="canvas.redo()"
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
          @click="canvas.zoomToFit()"
        />
        <button
          type="button"
          class="dg-editor-toolbar__zoom-label"
          :disabled="booting"
          :title="booting ? undefined : `当前缩放 ${zoomLabel}，点击重置`"
          @click="canvas.zoomReset()"
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
