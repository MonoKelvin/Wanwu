<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const props = defineProps<{
  visible: boolean
  title: string
  initialName?: string
  confirmLabel?: string
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  save: [name: string]
}>()

const name = ref('')
const error = ref('')
const inputRef = ref<{ $el?: HTMLElement } | null>(null)

watch(
  () => props.visible,
  async (open) => {
    if (!open) return
    name.value = props.initialName ?? ''
    error.value = ''
    await nextTick()
    inputRef.value?.$el?.querySelector('input')?.focus()
  }
)

function close() {
  emit('update:visible', false)
}

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = '请填写分组名称'
    return
  }
  emit('save', trimmed)
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="title"
    modal
    append-to="body"
    class="ww-rss-dialog w-[min(20rem,90vw)]"
    @update:visible="emit('update:visible', $event)"
  >
    <label class="ww-form-label" for="rss-group-name">分组名称</label>
    <InputText
      id="rss-group-name"
      ref="inputRef"
      v-model="name"
      class="w-full"
      @keydown.enter="submit"
    />
    <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    <template #footer>
      <Button label="取消" severity="secondary" text @click="close" />
      <Button :label="confirmLabel ?? '确定'" @click="submit" />
    </template>
  </Dialog>
</template>
