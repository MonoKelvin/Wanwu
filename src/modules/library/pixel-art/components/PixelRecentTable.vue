<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMinuteClock } from '@shared/composables/useMinuteClock'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { PixelFileMeta } from '@modules/library/pixel-art/domain/types'
import type { WwMenuItem } from '@shared/types/menu'
import {
  formatPixelDimensions,
  formatRelativeTime,
  pixelTitleBase
} from '@modules/library/pixel-art/lib/pixelHomeUtils'

export type PixelFileTableVariant = 'recent' | 'folder' | 'recycle'

const props = withDefaults(
  defineProps<{
    files: PixelFileMeta[]
    variant?: PixelFileTableVariant
  }>(),
  { variant: 'recent' }
)

const emit = defineEmits<{
  open: [fileId: string]
  reveal: [fileId: string]
  softDelete: [fileId: string]
  rename: [file: PixelFileMeta]
  restore: [fileId: string]
  purge: [fileId: string]
}>()

const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuTarget = ref<PixelFileMeta | null>(null)
const nowTs = useMinuteClock()

const isRecycle = computed(() => props.variant === 'recycle')
const timeColumnLabel = computed(() => {
  if (isRecycle.value) return '删除时间'
  if (props.variant === 'folder') return '更新时间'
  return '最近修改'
})

const menuItems = computed<WwMenuItem[]>(() => {
  const file = menuTarget.value
  if (!file) return []
  return [
    { label: '打开', wwIcon: 'external-link', command: () => emit('open', file.id) },
    { label: '重命名', wwIcon: 'pencil', command: () => emit('rename', file) },
    { label: '打开文件位置', wwIcon: 'folder-open', command: () => emit('reveal', file.id) },
    { separator: true },
    { label: '移入回收站', wwIcon: 'trash-2', command: () => emit('softDelete', file.id) }
  ]
})

function openMenu(event: MouseEvent, file: PixelFileMeta) {
  event.stopPropagation()
  menuTarget.value = file
  const anchor = event.currentTarget as HTMLElement
  void menuRef.value?.showBelowAnchorLeft(anchor, 4, 10)
}

function timeLabel(file: PixelFileMeta) {
  const iso = isRecycle.value && file.deletedAt ? file.deletedAt : file.updatedAt
  return formatRelativeTime(iso, nowTs.value)
}

function onRowClick(file: PixelFileMeta) {
  if (isRecycle.value) return
  emit('open', file.id)
}
</script>

<template>
  <div class="pa-recent-table-scroll">
    <div
      class="pa-recent-table"
      :class="{
        'pa-recent-table--recycle': isRecycle,
        'pa-recent-table--no-loc': true
      }"
    >
      <div class="pa-recent-table__head">
        <span class="pa-recent-table__cell pa-recent-table__cell--name">文件名</span>
        <span class="pa-recent-table__cell pa-recent-table__cell--time">{{ timeColumnLabel }}</span>
        <span class="pa-recent-table__cell pa-recent-table__cell--size">尺寸</span>
        <span class="pa-recent-table__cell pa-recent-table__cell--act" aria-hidden="true" />
      </div>

      <ul class="pa-recent-table__body">
        <li
          v-for="file in files"
          :key="file.id"
          class="pa-recent-table__row"
          :class="{ 'pa-recent-table__row--recycle': isRecycle }"
          :tabindex="isRecycle ? -1 : 0"
          :role="isRecycle ? undefined : 'button'"
          @click="onRowClick(file)"
          @keydown.enter.prevent="onRowClick(file)"
          @keydown.space.prevent="onRowClick(file)"
        >
          <span class="pa-recent-table__cell pa-recent-table__cell--name">
            <span class="pa-recent-table__icon">
              <WwIcon :name="isRecycle ? 'box' : 'grid-3x3'" size="sm" />
            </span>
            <span class="pa-recent-table__title">
              <span class="pa-recent-table__name">{{ pixelTitleBase(file.title) }}</span>
            </span>
          </span>
          <span class="pa-recent-table__cell pa-recent-table__cell--time">
            {{ timeLabel(file) }}
          </span>
          <span class="pa-recent-table__cell pa-recent-table__cell--size">
            {{ formatPixelDimensions(file) }}
          </span>

          <div v-if="isRecycle" class="pa-recent-table__act-group" @click.stop>
            <WwIconButton
              icon="rotate-ccw"
              compact
              aria-label="恢复"
              v-tooltip.bottom="'恢复'"
              @click="emit('restore', file.id)"
            />
            <WwIconButton
              icon="folder-open"
              compact
              aria-label="打开文件位置"
              v-tooltip.bottom="'打开文件位置'"
              @click="emit('reveal', file.id)"
            />
            <WwIconButton
              icon="trash-2"
              compact
              class="pa-recent-table__act--danger"
              aria-label="永久删除"
              v-tooltip.bottom="'永久删除'"
              @click="emit('purge', file.id)"
            />
          </div>
          <button
            v-else
            type="button"
            class="pa-recent-table__menu"
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
.pa-recent-table__act--danger:hover:not(:disabled),
.pa-recent-table__act--danger:focus-visible:not(:disabled) {
  color: var(--p-red-500, #ef4444) !important;
}
</style>
