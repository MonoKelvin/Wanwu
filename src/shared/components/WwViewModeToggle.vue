<script setup lang="ts">
import SelectButton from 'primevue/selectbutton'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

export type WwViewMode = 'card' | 'list'

const model = defineModel<WwViewMode>({ required: true })

const props = withDefaults(
  defineProps<{
    ariaLabel?: string
  }>(),
  { ariaLabel: '展示方式' }
)

const options: Array<{ label: string; value: WwViewMode; wwIcon: WwIconName }> = [
  { label: '卡片', value: 'card', wwIcon: 'layout-grid' },
  { label: '列表', value: 'list', wwIcon: 'list' }
]
</script>

<template>
  <SelectButton
    v-model="model"
    :options="options"
    option-label="label"
    option-value="value"
    data-key="value"
    :allow-empty="false"
    :aria-label="props.ariaLabel"
    class="ww-settings-segment ww-settings-segment--icon ww-view-mode-toggle"
  >
    <template #option="{ option }">
      <span class="ww-view-mode-toggle__option">
        <WwIcon
          :name="option.wwIcon"
          size="sm"
          v-tooltip.bottom="option.label"
          :aria-label="option.label"
        />
      </span>
    </template>
  </SelectButton>
</template>

<style>
.ww-page-toolbar .ww-view-mode-toggle.p-selectbutton {
  height: var(--ww-toolbar-h);
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem !important;
}
</style>
