<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import WwButton from '@shared/components/WwButton.vue'
import { useDiagramsStore } from '@modules/library/diagrams/services/diagramsStore'
import {
  DG_DRAFTS,
  DG_FILES,
  DG_HOME,
  DG_RECYCLE
} from '@modules/library/diagrams/domain/diagramFolderIds'
import type { DiagramFolder } from '@shared/types/diagrams'

const props = withDefaults(
  defineProps<{
    header?: string
    confirmLabel?: string
    emptyHint?: string
    folders?: DiagramFolder[]
  }>(),
  {
    header: '选择保存位置',
    confirmLabel: '确定',
    emptyHint: '没有可选分组'
  }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
const open = defineModel<boolean>('open', { default: false })
const selectedFolderId = defineModel<string>('folderId', { default: DG_FILES })
const store = useDiagramsStore()
const loading = ref(false)
let closingByAction = false

const folderOptions = computed(() => {
  if (props.folders) return props.folders
  return store.folders.filter(
    (f) => f.id !== DG_HOME && f.id !== DG_RECYCLE && f.id !== DG_DRAFTS && !f.deletedAt
  )
})

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
  if (id === DG_FILES) return `${name}（默认）`
  return name
}

function onConfirm() {
  closingByAction = true
  emit('confirm')
}

function onCancel() {
  closingByAction = true
  emit('cancel')
}

function onHide() {
  if (!closingByAction) emit('cancel')
  closingByAction = false
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    :header="header"
    modal
    append-to="body"
    class="ww-glass-dialog w-[min(22rem,92vw)]"
    @hide="onHide"
    :pt="{
      root: { class: 'ww-glass-dialog-root' },
      header: { class: 'ww-glass-dialog__header' },
      content: { class: 'ww-glass-dialog__content' }
    }"
  >
    <p v-if="loading" class="dg-hint">加载分组…</p>
    <p v-else-if="!folderOptions.length" class="dg-hint">{{ emptyHint }}</p>
    <ul v-else class="dg-folder-picker">
      <li v-for="folder in folderOptions" :key="folder.id">
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
      <WwButton label="取消" severity="secondary" text @click="onCancel" />
      <WwButton
        :label="confirmLabel"
        :disabled="!folderOptions.length"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>
