<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import type { LinkBookmark } from '@shared/types/links'

const props = defineProps<{
  visible: boolean
  bookmark: LinkBookmark | null
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  save: [payload: { id: string; title: string; url: string }]
}>()

const title = ref('')
const url = ref('')

watch(
  () => props.visible,
  (open) => {
    if (!open || !props.bookmark) return
    title.value = props.bookmark.title
    url.value = props.bookmark.url
  }
)

function close() {
  emit('update:visible', false)
}

function submit() {
  if (!props.bookmark) return
  const t = title.value.trim()
  const u = url.value.trim()
  if (!t || !u) return
  emit('save', { id: props.bookmark.id, title: t, url: u })
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="编辑链接"
    class="ww-links-edit-dialog w-[min(24rem,92vw)]"
    :draggable="false"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="text-ww-ink-muted">标题</span>
        <InputText v-model="title" class="w-full" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="text-ww-ink-muted">链接地址</span>
        <InputText v-model="url" class="w-full" autocomplete="off" />
      </label>
    </div>
    <template #footer>
      <WwDialogFooterButton label="取消" cancel @click="close" />
      <WwDialogFooterButton label="保存" @click="submit" />
    </template>
  </Dialog>
</template>
