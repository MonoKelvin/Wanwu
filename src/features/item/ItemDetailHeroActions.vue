<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'

const menuOpen = defineModel<boolean>('menuOpen', { default: false })

defineProps<{
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

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu(e: Event) {
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))

function run(action: () => void) {
  menuOpen.value = false
  action()
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
    <div v-if="menuOpen" class="ww-hero-menu ww-glass-blur" role="menu" @click.stop>
      <button type="button" role="menuitem" class="ww-hero-menu__item" @click="run(() => emit('uploadImage'))">
        <WwIcon name="plus" size="sm" />
        上传图片
      </button>
      <button
        v-if="hasActiveImage"
        type="button"
        role="menuitem"
        class="ww-hero-menu__item"
        @click="run(() => emit('openLightbox'))"
      >
        <WwIcon name="maximize" size="sm" />
        查看大图
      </button>
      <button
        v-if="hasActiveImage"
        type="button"
        role="menuitem"
        class="ww-hero-menu__item"
        @click="run(() => emit('download'))"
      >
        <WwIcon name="download" size="sm" />
        另存为
      </button>
      <button
        v-if="hasActiveImage"
        type="button"
        role="menuitem"
        class="ww-hero-menu__item"
        @click="run(() => emit('revealInFolder'))"
      >
        <WwIcon name="folder-open" size="sm" />
        在文件夹中显示
      </button>
      <button
        v-if="hasSourceLink"
        type="button"
        role="menuitem"
        class="ww-hero-menu__item"
        @click="run(() => emit('openSource'))"
      >
        <WwIcon name="external-link" size="sm" />
        源链接
      </button>
    </div>
  </div>
</template>
