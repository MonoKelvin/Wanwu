<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMinuteClock } from '@shared/composables/useMinuteClock'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { DiagramFileMeta, DiagramFolder } from '@modules/library/diagrams/domain/types'
import type { WwMenuItem } from '@shared/types/menu'
import {
  diagramTitleBase,
  formatFileSize,
  formatRelativeTime
} from '@modules/library/diagrams/lib/diagramHomeUtils'
import { DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'

export type DiagramFileTableVariant = 'recent' | 'folder' | 'recycle'

const props = withDefaults(
  defineProps<{
    files: DiagramFileMeta[]
    folders?: DiagramFolder[]
    fileCountByFolderId?: (folderId: string) => number
    folderNameById: (id: string) => string | undefined
    variant?: DiagramFileTableVariant
    showMove?: boolean
  }>(),
  { variant: 'recent', showMove: true, folders: () => [] }
)

const emit = defineEmits<{
  open: [fileId: string]
  openFolder: [folderId: string]
  copy: [fileId: string]
  togglePin: [file: DiagramFileMeta]
  reveal: [fileId: string]
  dismiss: [fileId: string]
  softDelete: [fileId: string]
  rename: [file: DiagramFileMeta]
  move: [file: DiagramFileMeta]
  restore: [fileId: string]
  purge: [fileId: string]
  renameFolder: [folderId: string]
  deleteFolder: [folderId: string]
}>()

const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuTarget = ref<DiagramFileMeta | null>(null)
const folderMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const folderMenuTarget = ref<DiagramFolder | null>(null)
const nowTs = useMinuteClock()

const isRecycle = computed(() => props.variant === 'recycle')
const showLocationColumn = computed(() => props.variant === 'recent' || isRecycle.value)
const nameColumnLabel = '文件名'
const timeColumnLabel = computed(() => {
  if (isRecycle.value) return '删除时间'
  if (props.variant === 'folder') return '更新时间'
  return '最近修改'
})
const locationColumnLabel = computed(() => (isRecycle.value ? '原分组' : '分组'))

const menuItems = computed<WwMenuItem[]>(() => {
  const file = menuTarget.value
  if (!file) return []

  if (props.variant === 'folder') {
    const items: WwMenuItem[] = [
      { label: '打开', wwIcon: 'external-link', command: () => emit('open', file.id) },
      { label: '重命名', wwIcon: 'pencil', command: () => emit('rename', file) },
      { label: '复制', wwIcon: 'copy', command: () => emit('copy', file.id) }
    ]
    if (props.showMove) {
      items.push({ label: '移动到分组', wwIcon: 'folder', command: () => emit('move', file) })
    }
    items.push(
      { label: '打开文件位置', wwIcon: 'folder-open', command: () => emit('reveal', file.id) },
      { separator: true },
      {
        label: '移入回收站',
        wwIcon: 'trash-2',
        command: () => emit('softDelete', file.id)
      }
    )
    return items
  }

  const items: WwMenuItem[] = [
    { label: '打开', wwIcon: 'external-link', command: () => emit('open', file.id) },
    { label: '重命名', wwIcon: 'pencil', command: () => emit('rename', file) },
    { label: '复制', wwIcon: 'copy', command: () => emit('copy', file.id) }
  ]
  if (props.showMove) {
    items.push({ label: '移动到分组', wwIcon: 'folder', command: () => emit('move', file) })
  }
  items.push(
    {
      label: file.pinned ? '取消置顶' : '置顶',
      wwIcon: file.pinned ? 'pin-off' : 'pin',
      class: file.pinned ? 'dg-recent-menu-item--pinned' : undefined,
      command: () => emit('togglePin', file)
    },
    { separator: true },
    { label: '打开文件位置', wwIcon: 'folder-open', command: () => emit('reveal', file.id) },
    {
      label: '从最近列表移除',
      wwIcon: 'x',
      command: () => emit('dismiss', file.id)
    },
    { separator: true },
    {
      label: '移入回收站',
      wwIcon: 'trash-2',
      command: () => emit('softDelete', file.id)
    }
  )
  return items
})

const folderMenuItems = computed<WwMenuItem[]>(() => {
  const folder = folderMenuTarget.value
  if (!folder) return []
  return [
    { label: '打开', wwIcon: 'folder-open', command: () => emit('openFolder', folder.id) },
    { label: '重命名', wwIcon: 'pencil', command: () => emit('renameFolder', folder.id) },
    { separator: true },
    {
      label: '删除分组',
      wwIcon: 'trash-2',
      command: () => emit('deleteFolder', folder.id)
    }
  ]
})

function openMenu(event: MouseEvent, file: DiagramFileMeta) {
  event.stopPropagation()
  menuTarget.value = file
  const anchor = event.currentTarget as HTMLElement
  void menuRef.value?.showBelowAnchorLeft(anchor, 4, 10)
}

function openFolderMenu(event: MouseEvent, folder: DiagramFolder) {
  event.stopPropagation()
  folderMenuTarget.value = folder
  const anchor = event.currentTarget as HTMLElement
  void folderMenuRef.value?.showBelowAnchorLeft(anchor, 4, 10)
}

function folderFileCount(folderId: string): number {
  return props.fileCountByFolderId?.(folderId) ?? 0
}

function folderSizeLabel(folderId: string): string {
  const count = folderFileCount(folderId)
  return count > 0 ? `${count} 个` : '—'
}

function onFolderRowClick(folder: DiagramFolder) {
  emit('openFolder', folder.id)
}

function onFolderRowKeydown(event: KeyboardEvent, folder: DiagramFolder) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('openFolder', folder.id)
  }
}

function locationLabel(file: DiagramFileMeta) {
  if (isRecycle.value) {
    const id = file.previousFolderId ?? DG_FILES
    return props.folderNameById(id) ?? id
  }
  return props.folderNameById(file.folderId) ?? file.folderId
}

function timeLabel(file: DiagramFileMeta) {
  const iso = isRecycle.value && file.deletedAt ? file.deletedAt : file.updatedAt
  return formatRelativeTime(iso, nowTs.value)
}

function onRowClick(file: DiagramFileMeta) {
  if (isRecycle.value) return
  emit('open', file.id)
}

function onRowKeydown(event: KeyboardEvent, file: DiagramFileMeta) {
  if (isRecycle.value) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('open', file.id)
  }
}

</script>

<template>
  <div class="dg-recent-table-scroll">
    <div
      class="dg-recent-table"
      :class="{
        'dg-recent-table--recycle': isRecycle,
        'dg-recent-table--no-loc': !showLocationColumn
      }"
    >
      <div class="dg-recent-table__head">
        <span class="dg-recent-table__cell dg-recent-table__cell--name">{{ nameColumnLabel }}</span>
        <span
          v-if="showLocationColumn"
          class="dg-recent-table__cell dg-recent-table__cell--loc"
        >
          {{ locationColumnLabel }}
        </span>
        <span class="dg-recent-table__cell dg-recent-table__cell--time">{{ timeColumnLabel }}</span>
        <span class="dg-recent-table__cell dg-recent-table__cell--size">包大小</span>
        <span class="dg-recent-table__cell dg-recent-table__cell--act" aria-hidden="true" />
      </div>

      <ul class="dg-recent-table__body">
        <li
          v-for="folder in folders"
          :key="`folder:${folder.id}`"
          class="dg-recent-table__row dg-recent-table__row--folder"
          tabindex="0"
          role="button"
          @click="onFolderRowClick(folder)"
          @keydown="onFolderRowKeydown($event, folder)"
        >
          <span class="dg-recent-table__cell dg-recent-table__cell--name">
            <span class="dg-recent-table__icon dg-recent-table__icon--folder">
              <WwIcon name="folder" size="sm" />
            </span>
            <span class="dg-recent-table__title">
              <span class="dg-recent-table__name">{{ folder.name }}</span>
            </span>
          </span>
          <span
            v-if="showLocationColumn"
            class="dg-recent-table__cell dg-recent-table__cell--loc"
          >
            分组
          </span>
          <span class="dg-recent-table__cell dg-recent-table__cell--time">
            {{ formatRelativeTime(folder.createdAt, nowTs) }}
          </span>
          <span class="dg-recent-table__cell dg-recent-table__cell--size">
            {{ folderSizeLabel(folder.id) }}
          </span>
          <button
            type="button"
            class="dg-recent-table__menu"
            aria-label="更多操作"
            @click="openFolderMenu($event, folder)"
          >
            <WwIcon name="ellipsis-vertical" size="sm" />
          </button>
        </li>

        <li
          v-for="file in files"
          :key="file.id"
          class="dg-recent-table__row"
          :class="{
            'is-pinned': file.pinned && !isRecycle,
            'dg-recent-table__row--recycle': isRecycle
          }"
          :tabindex="isRecycle ? -1 : 0"
          :role="isRecycle ? undefined : 'button'"
          @click="onRowClick(file)"
          @keydown="onRowKeydown($event, file)"
        >
          <span
            v-if="file.pinned && !isRecycle"
            class="dg-recent-table__flag"
            aria-label="已置顶"
          />
          <span class="dg-recent-table__cell dg-recent-table__cell--name">
            <span class="dg-recent-table__icon">
              <WwIcon :name="isRecycle ? 'box' : 'layers'" size="sm" />
            </span>
            <span class="dg-recent-table__title">
              <WwIcon
                v-if="file.pinned && !isRecycle"
                name="pin"
                size="xs"
                class="dg-recent-table__pin"
                aria-hidden="true"
              />
              <span class="dg-recent-table__name">{{ diagramTitleBase(file.title) }}</span>
            </span>
          </span>
          <span
            v-if="showLocationColumn"
            class="dg-recent-table__cell dg-recent-table__cell--loc"
          >
            {{ locationLabel(file) }}
          </span>
          <span class="dg-recent-table__cell dg-recent-table__cell--time">
            {{ timeLabel(file) }}
          </span>
          <span class="dg-recent-table__cell dg-recent-table__cell--size">
            {{ formatFileSize(file.sizeBytes) }}
          </span>

          <div v-if="isRecycle" class="dg-recent-table__act-group" @click.stop>
            <WwIconButton
              icon="rotate-ccw"
              compact
              ariaLabel="恢复"
              v-tooltip.bottom="'恢复'"
              @click="emit('restore', file.id)"
            />
            <WwIconButton
              icon="folder-open"
              compact
              ariaLabel="打开文件位置"
              v-tooltip.bottom="'打开文件位置'"
              @click="emit('reveal', file.id)"
            />
            <WwIconButton
              icon="trash-2"
              compact
              class="dg-recent-table__act--danger"
              ariaLabel="永久删除"
              v-tooltip.bottom="'永久删除'"
              @click="emit('purge', file.id)"
            />
          </div>
          <button
            v-else
            type="button"
            class="dg-recent-table__menu"
            aria-label="更多操作"
            @click="openMenu($event, file)"
          >
            <WwIcon name="ellipsis-vertical" size="sm" />
          </button>
        </li>
      </ul>

      <WwContextMenu ref="menuRef" :model="menuItems" />
      <WwContextMenu ref="folderMenuRef" :model="folderMenuItems" />
    </div>
  </div>
</template>

<style scoped>
.dg-recent-table__act--danger:hover:not(:disabled),
.dg-recent-table__act--danger:focus-visible:not(:disabled) {
  color: var(--p-red-500, #ef4444) !important;
}
</style>
