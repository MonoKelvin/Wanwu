<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import type { LinkBookmark } from '@shared/types/links'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  bookmark: LinkBookmark | null
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  save: [payload: { id?: string; title: string; url: string }]
}>()

const title = ref('')
const url = ref('')

watch(
  () => [props.visible, props.mode, props.bookmark] as const,
  ([open]) => {
    if (!open) return
    if (props.mode === 'edit' && props.bookmark) {
      title.value = props.bookmark.title
      url.value = props.bookmark.url
    } else {
      title.value = ''
      url.value = ''
    }
  }
)

function close() {
  emit('update:visible', false)
}

function submit() {
  const t = title.value.trim()
  const u = url.value.trim()
  if (!t || !u) return
  if (props.mode === 'edit' && props.bookmark) {
    emit('save', { id: props.bookmark.id, title: t, url: u })
  } else {
    emit('save', { title: t, url: u })
  }
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="mode === 'create' ? '新增链接' : '编辑链接'"
    class="ww-links-form-dialog w-[min(24rem,92vw)]"
    :draggable="false"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="text-ww-ink-muted">标题</span>
        <InputText v-model="title" class="w-full" autocomplete="off" @keyup.enter="submit" />
      </label>
      <label class="flex flex-col gap-1.5 text-sm">
        <span class="text-ww-ink-muted">链接地址</span>
        <InputText
          v-model="url"
          class="w-full"
          autocomplete="off"
          placeholder="https://"
          @keyup.enter="submit"
        />
      </label>
    </div>
    <template #footer>
      <WwDialogFooterButton label="取消" cancel @click="close" />
      <WwDialogFooterButton :label="mode === 'create' ? '添加' : '保存'" @click="submit" />
    </template>
  </Dialog>
</template>
