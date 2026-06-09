<script setup lang="ts">
/**
 * 字体选择（PrimeVue Select + 系统字体筛选 + 最近使用）
 */
import { computed, useAttrs } from 'vue'
import Select from 'primevue/select'
import { useSettingsStore } from '@shared/stores/settings'
import { cssFontFamilyStack, fontCatalogLabel } from '@shared/lib/fontCatalog'
import type { WwSelectSize } from '@shared/components/WwSelect/types'
import { useFontSelectOptions } from './useFontSelectOptions'
import '@shared/components/WwSelect/ww-select.css'
import './ww-font-select.css'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    placeholder?: string
    size?: WwSelectSize
    disabled?: boolean
  }>(),
  {
    size: 'block',
    placeholder: '默认'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()
const settingsStore = useSettingsStore()
const { optionGroups } = useFontSelectOptions()

const rootClass = computed(() => [
  attrs.class,
  'ww-select-root',
  'ww-font-select-root',
  `ww-select--${props.size}`
])

const passthroughAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const selectValue = computed(() => {
  if (props.modelValue === null) return null
  return props.modelValue?.trim() ?? ''
})

const selectedLabel = computed(() => {
  if (props.modelValue === null) return props.placeholder
  if (!selectValue.value) return props.placeholder
  return fontCatalogLabel(selectValue.value)
})

const triggerFontStyle = computed(() => {
  if (!selectValue.value) return undefined
  return { fontFamily: cssFontFamilyStack(selectValue.value) }
})

function onUpdate(value: string | null | undefined) {
  const next = String(value ?? '')
  emit('update:modelValue', next)
  if (next) void settingsStore.appendRecentFont(next)
}
</script>

<template>
  <div :class="rootClass">
    <Select
      v-bind="passthroughAttrs"
      :model-value="selectValue"
      :options="optionGroups"
      option-label="label"
      option-value="value"
      option-group-label="label"
      option-group-children="items"
      :placeholder="placeholder"
      :disabled="disabled"
      append-to="body"
      scroll-height="16rem"
      :class="['ww-select', 'ww-font-select', `ww-select--${size}`]"
      panel-class="ww-select-overlay ww-font-select-overlay"
      @update:model-value="onUpdate"
    >
      <template #value>
        <span class="ww-font-select__value" :style="triggerFontStyle">{{ selectedLabel }}</span>
      </template>
      <template #option="slotProps">
        <span
          class="ww-font-select__option"
          :style="
            slotProps.option.value
              ? { fontFamily: cssFontFamilyStack(String(slotProps.option.value)) }
              : undefined
          "
        >
          {{ slotProps.option.label }}
        </span>
      </template>
    </Select>
  </div>
</template>

<style scoped>
.ww-font-select-root:has(.ww-select--block) {
  display: block;
  width: 100%;
  min-width: 0;
}
</style>
