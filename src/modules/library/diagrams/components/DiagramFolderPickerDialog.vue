<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import WwButton from '@shared/components/WwButton.vue'
import { useDiagramsStore } from '@shared/stores/diagrams'
import { DG_DRAFTS, DG_FILES, DG_HOME, DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'

const emit = defineEmits<{
  confirm: []
}>()
const open = defineModel<boolean>('open', { default: false })
const selectedFolderId = defineModel<string>('folderId', { default: DG_FILES })
const store = useDiagramsStore()
const loading = ref(false)

const folders = computed(() =>
  store.folders.filter(
    (f) => f.id !== DG_HOME && f.id !== DG_RECYCLE && !f.deletedAt
  )
)

watch(open, (visible) => {
  if (visible && !store.loaded) {
    loading.value = true
    void store.loadFolders().finally(() => {
      loading.value = false
    })
  }
})

onMounted(() => {
  if (!store.loaded) void store.loadFolders()
})

function folderLabel(id: string, name: string) {
  if (id === DG_DRAFTS) return `${name}（草稿）`
  if (id === DG_FILES) return `${name}（默认）`
  return name
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    header="选择保存位置"
    modal
    append-to="body"
    class="ww-glass-dialog w-[min(22rem,92vw)]"
    :pt="{
      root: { class: 'ww-glass-dialog-root' },
      header: { class: 'ww-glass-dialog__header' },
      content: { class: 'ww-glass-dialog__content' }
    }"
  >
    <p v-if="loading" class="dg-hint">加载分组…</p>
    <ul v-else class="dg-folder-picker">
      <li v-for="folder in folders" :key="folder.id">
        <button
          type="button"
          class="dg-folder-picker__item"
          :class="{ 'dg-folder-picker__item--active': selectedFolderId === folder.id }"
          @click="selectedFolderId = folder.id"
        >
          {{ folderLabel(folder.id, folder.name) }}
        </button>
      </li>
    </ul>
    <template #footer>
      <WwButton label="取消" severity="secondary" text @click="open = false" />
      <WwButton label="确定" @click="emit('confirm'); open = false" />
    </template>
  </Dialog>
</template>
