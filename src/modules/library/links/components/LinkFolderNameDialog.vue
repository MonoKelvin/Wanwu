<script setup lang="ts">
import { ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'

const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  title?: string
  initialName?: string
}>()

const emit = defineEmits<{
  confirm: [name: string]
}>()

const name = ref('')

watch(
  () => visible.value,
  (open) => {
    if (open) name.value = props.initialName?.trim() ?? ''
  }
)

function submit() {
  const v = name.value.trim()
  if (!v) return
  emit('confirm', v)
  visible.value = false
}
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    :header="title ?? '新建目录'"
    width-class="w-[min(20rem,92vw)]"
    dim-mask
    @update:visible="visible = $event"
  >
    <label class="flex flex-col gap-1.5 text-sm">
      <span class="text-ww-ink-muted">目录名称</span>
      <InputText
        v-model="name"
        class="w-full"
        autofocus
        placeholder="输入名称"
        @keyup.enter="submit"
      />
    </label>
    <template #footer>
      <WwDialogFooterButton label="取消" variant="text" @click="visible = false" />
      <WwDialogFooterButton label="创建" :disabled="!name.trim()" @click="submit" />
    </template>
  </WwGlassDialog>
</template>
