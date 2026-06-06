<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { DiagramFileMeta } from '@shared/types/diagrams'
import type { WwMenuItem } from '@shared/types/menu'
import { formatFileSize, formatRelativeTime } from '@modules/library/diagrams/lib/diagramHomeUtils'

const props = defineProps<{
  files: DiagramFileMeta[]
  folderNameById: (id: string) => string | undefined
}>()

const emit = defineEmits<{
  open: [fileId: string]
  copy: [fileId: string]
  togglePin: [file: DiagramFileMeta]
  reveal: [fileId: string]
  dismiss: [fileId: string]
  softDelete: [fileId: string]
}>()

const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuTarget = ref<DiagramFileMeta | null>(null)
const nowTs = ref(Date.now())
let minuteTicker: ReturnType<typeof setInterval> | null = null

const menuItems = computed<WwMenuItem[]>(() => {
  const file = menuTarget.value
  if (!file) return []
  return [
    { label: '打开', wwIcon: 'external-link', command: () => emit('open', file.id) },
    { label: '复制', wwIcon: 'copy', command: () => emit('copy', file.id) },
    {
      label: file.pinned ? '取消置顶' : '置顶',
      wwIcon: file.pinned ? 'pin-off' : 'pin',
      class: file.pinned ? 'dg-recent-menu-item--pinned' : undefined,
      command: () => emit('togglePin', file)
    },
    { separator: true },
    { label: '打开文件位置', wwIcon: 'folder-open', command: () => emit('reveal', file.id) },
    { label: '删除记录', wwIcon: 'x', command: () => emit('dismiss', file.id) },
    {
      label: '删除文件',
      wwIcon: 'trash-2',
      command: () => emit('softDelete', file.id)
    }
  ]
})

function openMenu(event: MouseEvent, file: DiagramFileMeta) {
  event.stopPropagation()
  menuTarget.value = file
  const anchor = event.currentTarget as HTMLElement
  void menuRef.value?.showBelowAnchorLeft(anchor, 4, 10)
}

function displayTitle(title: string) {
  return title.trim() || '未命名流程图'
}

onMounted(() => {
  minuteTicker = setInterval(() => {
    nowTs.value = Date.now()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (minuteTicker) clearInterval(minuteTicker)
})
</script>

<template>
  <div class="dg-recent-table-scroll">
  <div class="dg-recent-table">
    <div class="dg-recent-table__head">
      <span class="dg-recent-table__cell dg-recent-table__cell--name">名称</span>
      <span class="dg-recent-table__cell dg-recent-table__cell--loc">文件位置</span>
      <span class="dg-recent-table__cell dg-recent-table__cell--time">最近修改</span>
      <span class="dg-recent-table__cell dg-recent-table__cell--size">大小</span>
      <span class="dg-recent-table__cell dg-recent-table__cell--act" aria-hidden="true" />
    </div>

    <ul class="dg-recent-table__body">
      <li
        v-for="file in files"
        :key="file.id"
        class="dg-recent-table__row"
        :class="{ 'is-pinned': file.pinned }"
        @click="emit('open', file.id)"
      >
        <span v-if="file.pinned" class="dg-recent-table__flag" aria-label="已置顶" />
        <span class="dg-recent-table__cell dg-recent-table__cell--name">
          <span class="dg-recent-table__icon">
            <WwIcon name="layers" size="sm" />
          </span>
          <span class="dg-recent-table__title">{{ displayTitle(file.title) }}</span>
        </span>
        <span class="dg-recent-table__cell dg-recent-table__cell--loc">
          {{ folderNameById(file.folderId) ?? file.folderId }}
        </span>
        <span class="dg-recent-table__cell dg-recent-table__cell--time">
          {{ formatRelativeTime(file.updatedAt, nowTs) }}
        </span>
        <span class="dg-recent-table__cell dg-recent-table__cell--size">
          {{ formatFileSize(file.sizeBytes) }}
        </span>
        <button
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
  </div>
  </div>
</template>

<style scoped>
:deep(.dg-recent-menu-item--pinned) {
  background: color-mix(in oklab, #8b7bf6 14%, var(--ww-content));
}

:deep(.dg-recent-menu-item--pinned .ww-icon) {
  color: #6d5ee6 !important;
}

[data-theme='dark'] :deep(.dg-recent-menu-item--pinned) {
  background: color-mix(in oklab, #8b7bf6 18%, var(--ww-content));
}
</style>
