<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import { useFormFieldHighlight } from '@shared/composables/useFormFieldHighlight'

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
const inputRef = ref<{ $el?: HTMLElement } | null>(null)
const fields = useFormFieldHighlight()

watch(
  () => props.visible,
  async (open) => {
    if (!open) return
    name.value = props.initialName ?? ''
    fields.clearAll()
    await nextTick()
    inputRef.value?.$el?.querySelector('input')?.focus()
  }
)

function close() {
  emit('update:visible', false)
}

async function submit() {
  const ok = await fields.validate(
    [{ key: 'name', valid: () => Boolean(name.value.trim()) }],
    {
      focusFirst: () => inputRef.value?.$el?.querySelector('input')?.focus()
    }
  )
  if (!ok) return
  emit('save', name.value.trim())
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
    <div :key="`name-${fields.shakeKey('name')}`" :class="fields.fieldWrapClass('name')">
      <label class="ww-form-label" for="rss-group-name">
        分组名称 <span class="text-ww-warn">*</span>
      </label>
      <InputText
        id="rss-group-name"
        ref="inputRef"
        v-model="name"
        class="w-full"
        @update:model-value="fields.clearField('name')"
        @keydown.enter="submit"
      />
    </div>
    <template #footer>
      <WwDialogFooterButton label="取消" cancel @click="close" />
      <WwDialogFooterButton :label="confirmLabel ?? '确定'" @click="submit" />
    </template>
  </Dialog>
</template>
