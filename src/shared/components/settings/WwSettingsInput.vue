<script setup lang="ts">
/**
 * 设置行单行文本输入（与 WwSelect / segment 控件高度对齐）
 */
import { ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import type { WwSettingsInputSize } from './types'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
    ariaLabel?: string
    size?: WwSettingsInputSize
  }>(),
  {
    size: 'default'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 本地草稿，支持防抖提交时仍能即时显示输入 */
const draft = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    if (value !== draft.value) draft.value = value
  }
)

function onInput(value: string | undefined) {
  const next = value ?? ''
  draft.value = next
  emit('update:modelValue', next)
}
</script>

<template>
  <InputText
    :model-value="draft"
    class="ww-settings-input"
    :class="{ 'ww-settings-input--narrow': size === 'narrow' }"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @update:model-value="onInput"
  />
</template>

<style scoped>
.ww-settings-input {
  width: 100%;
  min-height: var(--ww-settings-control-height, 2rem);
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.25;
  border: 1px solid var(--ww-border-faint);
  border-radius: 0.4375rem;
  background: var(--ww-inset);
  box-shadow: none;
  transition:
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-input--narrow {
  max-width: 12rem;
}

.ww-settings-input:enabled:hover {
  border-color: var(--ww-border-subtle);
  background: var(--ww-list-hover-bg);
}

.ww-settings-input:enabled:focus {
  border-color: var(--ww-list-hover-ring);
  background: var(--ww-content);
  box-shadow: 0 0 0 1px var(--ww-list-hover-ring);
  outline: none;
}

.ww-settings-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
