<script setup lang="ts">
defineOptions({ name: 'PixelEditorToolbar' })

import WwButton from '@shared/components/WwButton.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  canUndo: boolean
  canRedo: boolean
  dirty?: boolean
}>()

const emit = defineEmits<{
  save: []
  export: []
  undo: []
  redo: []
}>()

const router = useRouter()

function goBack() {
  if (props.dirty && !confirm('有未保存的更改，确定离开？')) return
  router.push({ name: 'library-pixel-art-home' })
}
</script>

<template>
  <header class="pixel-editor-toolbar">
    <div class="left">
      <WwIconButton icon="arrow-left" ariaLabel="返回" @click="goBack" />
      <span class="title">{{ props.title }}.wpp</span>
    </div>
    <div class="actions">
      <WwIconButton icon="undo" ariaLabel="撤销" :disabled="!canUndo" @click="emit('undo')" />
      <WwIconButton icon="redo" ariaLabel="重做" :disabled="!canRedo" @click="emit('redo')" />
      <WwButton size="sm" @click="emit('save')">保存</WwButton>
      <WwButton size="sm" variant="ghost" @click="emit('export')">导出…</WwButton>
    </div>
  </header>
</template>

<style scoped>
.pixel-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 8px;
  border-bottom: 1px solid var(--ww-border);
  background: var(--ww-surface);
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 14px;
  font-weight: 500;
}

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
