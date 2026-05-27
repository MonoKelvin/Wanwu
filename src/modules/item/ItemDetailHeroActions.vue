<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwMenuItem } from '@shared/types/menu'

const menuOpen = defineModel<boolean>('menuOpen', { default: false })

const props = defineProps<{
  visible: boolean
  hasActiveImage: boolean
  hasSourceLink: boolean
}>()

const emit = defineEmits<{
  openLightbox: []
  download: []
  revealInFolder: []
  openSource: []
  uploadImage: []
}>()

const menuRef = useTemplateRef<InstanceType<typeof WwContextMenu>>('menuRef')

const menuItems = computed((): WwMenuItem[] => {
  const items: WwMenuItem[] = [
    {
      label: '上传图片',
      wwIcon: 'plus',
      command: () => emit('uploadImage')
    }
  ]
  if (props.hasActiveImage) {
    items.push(
      { label: '查看大图', wwIcon: 'maximize', command: () => emit('openLightbox') },
      { label: '另存为', wwIcon: 'download', command: () => emit('download') },
      { label: '在文件夹中显示', wwIcon: 'folder-open', command: () => emit('revealInFolder') }
    )
  }
  if (props.hasSourceLink) {
    items.push({ label: '源链接', wwIcon: 'external-link', command: () => emit('openSource') })
  }
  return items
})

function toggleMenu(e: MouseEvent) {
  const anchor = e.currentTarget
  if (!(anchor instanceof HTMLElement)) return
  menuRef.value?.toggleAnchor(anchor)
}
</script>

<template>
  <div class="ww-product-detail__hero-actions" :class="{ 'is-visible': visible }" @click.stop>
    <button
      type="button"
      class="ww-glass-btn ww-glass-btn--icon ww-glass-blur ww-glass-blur--dark"
      aria-label="图片操作"
      aria-haspopup="true"
      :aria-expanded="menuOpen"
      @click="toggleMenu"
    >
      <WwIcon name="ellipsis-vertical" size="sm" />
    </button>
    <WwContextMenu ref="menuRef" v-model:open="menuOpen" :model="menuItems" />
  </div>
</template>
