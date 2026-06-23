<script setup lang="ts">
defineOptions({ name: 'PixelEditorToolbar' })

import { computed, ref } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import type { WwShortcutSection } from '@shared/types/shortcuts'
import type { PixelFileMeta } from '@modules/library/pixel-art/domain/types'
import { PA_SHORTCUT, PIXEL_SHORTCUT_SECTIONS } from '@modules/library/pixel-art/lib/pixelShortcutSections'
import { PIXEL_WPP_FILE_EXTENSION } from '@modules/library/pixel-art/domain/meta'
import WwShortcutsDialog from '@shared/components/WwShortcutsDialog.vue'

const props = defineProps<{
  title: string
  canUndo: boolean
  canRedo: boolean
  dirty?: boolean
  saved?: boolean
  fileId?: string | null
  folderName?: string
  booting?: boolean
  hasSelection?: boolean
  gridVisible?: boolean
  checkerboardVisible?: boolean
  recentFiles?: PixelFileMeta[]
  shortcutSections?: WwShortcutSection[]
  zoomPercent?: number
  foreground?: string
  background?: string
}>()

const emit = defineEmits<{
  save: []
  saveAs: []
  export: []
  undo: []
  redo: []
  zoomFit: []
  zoomIn: []
  zoomOut: []
  zoomReset: []
  back: []
  newDoc: []
  openRecent: [fileId: string]
  toggleGrid: []
  toggleCheckerboard: []
  selectAll: []
  clearSelection: []
  swapColors: []
}>()

const fileMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const editMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const viewMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const shortcutsOpen = ref(false)

const shortcutSections = computed(
  () => props.shortcutSections ?? PIXEL_SHORTCUT_SECTIONS
)

const displayTitle = computed(() => props.title.trim() || '未命名像素画')
const showDirtyMark = computed(() => !props.booting && (!!props.dirty || !props.saved))
const zoomLabel = computed(() => `${props.zoomPercent ?? 100}%`)

const titleTooltip = computed(() => {
  if (props.booting) return '加载中…'
  const lines: string[] = []
  if (props.fileId) {
    lines.push(`文件：${displayTitle.value}.${PIXEL_WPP_FILE_EXTENSION}`)
    if (props.folderName) lines.push(`位置：${props.folderName}`)
  } else {
    lines.push('尚未保存到磁盘')
  }
  lines.push(props.dirty || !props.saved ? '状态：未保存' : '状态：已保存')
  return lines.join('\n')
})

const recentMenuItems = computed((): WwMenuItem[] => {
  const files = props.recentFiles ?? []
  if (!files.length) {
    return [{ label: '暂无最近文件', disabled: true }]
  }
  return files.slice(0, 8).map((file) => ({
    label: file.title,
    command: () => emit('openRecent', file.id)
  }))
})

const fileMenuItems = computed((): WwMenuItem[] => {
  const items: WwMenuItem[] = [
    {
      label: '新建',
      wwIcon: 'plus',
      shortcut: PA_SHORTCUT.newDoc,
      disabled: props.booting,
      command: () => emit('newDoc')
    },
    {
      label: '最近文件',
      wwIcon: 'clock',
      shortcut: PA_SHORTCUT.openRecent,
      disabled: props.booting,
      items: recentMenuItems.value
    },
    { separator: true },
    {
      label: '保存',
      wwIcon: 'save',
      shortcut: PA_SHORTCUT.save,
      disabled: props.booting || (!props.dirty && props.saved),
      command: () => emit('save')
    },
    {
      label: '另存为',
      wwIcon: 'copy',
      shortcut: PA_SHORTCUT.saveAs,
      disabled: props.booting,
      command: () => emit('saveAs')
    },
    { separator: true },
    {
      label: '导出…',
      wwIcon: 'download',
      disabled: props.booting,
      command: () => emit('export')
    },
    { separator: true },
    {
      label: '关闭',
      wwIcon: 'x',
      disabled: props.booting,
      command: () => emit('back')
    }
  ]
  return items
})

const editMenuItems = computed((): WwMenuItem[] => [
  {
    label: '撤销',
    wwIcon: 'undo',
    shortcut: PA_SHORTCUT.undo,
    disabled: props.booting || !props.canUndo,
    command: () => emit('undo')
  },
  {
    label: '重做',
    wwIcon: 'redo',
    shortcut: PA_SHORTCUT.redo,
    disabled: props.booting || !props.canRedo,
    command: () => emit('redo')
  },
  { separator: true },
  {
    label: '全选',
    wwIcon: 'square',
    shortcut: PA_SHORTCUT.selectAll,
    disabled: props.booting,
    command: () => emit('selectAll')
  },
  {
    label: '清除选区',
    wwIcon: 'eraser',
    shortcut: PA_SHORTCUT.delete,
    disabled: props.booting || !props.hasSelection,
    command: () => emit('clearSelection')
  }
])

const viewMenuItems = computed((): WwMenuItem[] => [
  {
    label: '放大',
    wwIcon: 'plus',
    shortcut: PA_SHORTCUT.zoomIn,
    disabled: props.booting,
    command: () => emit('zoomIn')
  },
  {
    label: '缩小',
    wwIcon: 'minus',
    shortcut: PA_SHORTCUT.zoomOut,
    disabled: props.booting,
    command: () => emit('zoomOut')
  },
  { separator: true },
  {
    label: '重置缩放',
    wwIcon: 'maximize',
    shortcut: PA_SHORTCUT.zoomReset,
    disabled: props.booting,
    command: () => emit('zoomReset')
  },
  {
    label: '适应画布',
    wwIcon: 'layout-grid',
    shortcut: PA_SHORTCUT.zoomFit,
    disabled: props.booting,
    command: () => emit('zoomFit')
  },
  { separator: true },
  {
    label: '显示网格',
    wwIcon: 'layout-grid',
    checked: props.gridVisible,
    disabled: props.booting,
    command: () => emit('toggleGrid')
  },
  {
    label: '显示棋盘格',
    wwIcon: 'columns-2',
    checked: props.checkerboardVisible,
    disabled: props.booting,
    command: () => emit('toggleCheckerboard')
  }
])

function openMenu(event: MouseEvent, menu: InstanceType<typeof WwContextMenu> | null) {
  event.stopPropagation()
  const anchor = event.currentTarget as HTMLElement
  void menu?.showBelowAnchorStart(anchor, 6)
}

function goBack() {
  emit('back')
}
</script>

<template>
  <header
    class="pa-editor-toolbar pa-float pa-float--top-center ww-glass-blur"
    role="toolbar"
    :aria-busy="booting || undefined"
  >
    <div class="pa-editor-toolbar__left">
      <WwButton
        icon="arrow-left"
        severity="secondary"
        text
        rounded
        class="pa-toolbar-icon-btn"
        aria-label="返回"
        @click="goBack"
      />
      <div class="pa-editor-toolbar__menus">
        <WwButton
          label="文件"
          severity="secondary"
          text
          size="small"
          class="pa-toolbar-menu-btn"
          :disabled="booting"
          @click="openMenu($event, fileMenuRef)"
        />
        <WwButton
          label="编辑"
          severity="secondary"
          text
          size="small"
          class="pa-toolbar-menu-btn"
          :disabled="booting"
          @click="openMenu($event, editMenuRef)"
        />
        <WwButton
          label="视图"
          severity="secondary"
          text
          size="small"
          class="pa-toolbar-menu-btn"
          :disabled="booting"
          @click="openMenu($event, viewMenuRef)"
        />
        <span class="pa-editor-toolbar__divider" aria-hidden="true" />
        <WwButton
          icon="save"
          severity="secondary"
          text
          rounded
          class="pa-toolbar-icon-btn"
          aria-label="保存"
          :disabled="booting || (!dirty && saved)"
          v-tooltip.bottom="'保存 (Ctrl+S)'"
          @click="emit('save')"
        />
        <WwButton
          icon="undo"
          severity="secondary"
          text
          rounded
          class="pa-toolbar-icon-btn"
          aria-label="撤销"
          :disabled="booting || !canUndo"
          v-tooltip.bottom="'撤销 (Ctrl+Z)'"
          @click="emit('undo')"
        />
        <WwButton
          icon="redo"
          severity="secondary"
          text
          rounded
          class="pa-toolbar-icon-btn"
          aria-label="重做"
          :disabled="booting || !canRedo"
          v-tooltip.bottom="'重做 (Ctrl+Y)'"
          @click="emit('redo')"
        />
      </div>
    </div>

    <div class="pa-editor-toolbar__center">
      <span
        class="pa-editor-toolbar__title"
        v-tooltip.bottom="titleTooltip"
        :aria-label="titleTooltip.replace('\n', '，')"
      >
        <span class="pa-editor-toolbar__title-name">{{ displayTitle }}</span>
        <span v-if="showDirtyMark" class="pa-editor-toolbar__title-dirty" aria-hidden="true">*</span>
      </span>
    </div>

    <div class="pa-editor-toolbar__right">
      <div class="pa-editor-toolbar__zoom">
        <WwButton
          icon="minus"
          severity="secondary"
          text
          rounded
          class="pa-toolbar-icon-btn"
          aria-label="缩小"
          :disabled="booting"
          v-tooltip.bottom="'缩小'"
          @click="emit('zoomOut')"
        />
        <button
          type="button"
          class="pa-editor-toolbar__zoom-label"
          :disabled="booting"
          :title="booting ? undefined : `当前缩放 ${zoomLabel}，点击重置`"
          @click="emit('zoomReset')"
        >
          {{ zoomLabel }}
        </button>
        <WwButton
          icon="plus"
          severity="secondary"
          text
          rounded
          class="pa-toolbar-icon-btn"
          aria-label="放大"
          :disabled="booting"
          v-tooltip.bottom="'放大'"
          @click="emit('zoomIn')"
        />
        <WwButton
          icon="layout-grid"
          severity="secondary"
          text
          rounded
          class="pa-toolbar-icon-btn"
          aria-label="适应画布"
          :disabled="booting"
          v-tooltip.bottom="'适应画布'"
          @click="emit('zoomFit')"
        />
      </div>

      <WwButton
        icon="circle-help"
        severity="secondary"
        text
        rounded
        class="pa-toolbar-icon-btn"
        aria-label="快捷键"
        :disabled="booting"
        v-tooltip.bottom="'快捷键'"
        @click="shortcutsOpen = true"
      />
    </div>

    <WwContextMenu ref="fileMenuRef" :model="fileMenuItems" />
    <WwContextMenu ref="editMenuRef" :model="editMenuItems" />
    <WwContextMenu ref="viewMenuRef" :model="viewMenuItems" />
    <WwShortcutsDialog v-model:open="shortcutsOpen" :sections="shortcutSections" />
  </header>
</template>

<style scoped>
.pa-toolbar-menu-btn {
  min-width: 2.25rem;
  padding-inline: 0.5rem;
  font-size: 0.8125rem;
  color: var(--ww-ink) !important;
}

.pa-toolbar-menu-btn:disabled {
  color: var(--ww-ink-faint) !important;
}

.pa-editor-toolbar__divider {
  width: 1px;
  height: 1.25rem;
  margin-inline: 0.125rem;
  background: var(--ww-border);
}
</style>
