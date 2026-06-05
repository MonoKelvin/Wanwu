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
    class="ww-view-mode-toggle"
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
.ww-view-mode-toggle.p-selectbutton {
  --ww-view-mode-toggle-h: var(--ww-toolbar-h, 2.125rem);

  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
  height: var(--ww-view-mode-toggle-h);
  padding: 0.25rem;
  border-radius: 0.4375rem;
  background: var(--ww-inset);
  border: 1px solid var(--ww-border-faint);
}

.ww-view-mode-toggle.p-selectbutton .p-togglebutton {
  flex: 0 0 auto;
  min-width: 2rem;
  width: 2rem;
  height: calc(var(--ww-view-mode-toggle-h) - 0.5rem);
  margin: 0;
  padding: 0 !important;
  border: none !important;
  border-radius: 0.3125rem !important;
  color: var(--ww-ink-muted) !important;
  background: transparent !important;
  box-shadow: none !important;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-view-mode-toggle.p-selectbutton .p-togglebutton .p-togglebutton-content {
  padding: 0.25rem !important;
  background: transparent !important;
  box-shadow: none !important;
  transition: inherit;
}

.ww-view-mode-toggle.p-selectbutton .p-togglebutton-label {
  display: none;
}

.ww-view-mode-toggle.p-selectbutton .p-togglebutton:not(.p-togglebutton-checked):not([data-p-checked='true']):hover {
  color: var(--ww-ink) !important;
  background: var(--ww-list-hover-bg) !important;
}

.ww-view-mode-toggle.p-selectbutton .p-togglebutton.p-togglebutton-checked,
.ww-view-mode-toggle.p-selectbutton .p-togglebutton[data-p-checked='true'] {
  color: var(--ww-ink) !important;
  background: var(--ww-elevated) !important;
  box-shadow: 0 1px 3px rgb(18 18 22 / 0.08) !important;
}

.ww-view-mode-toggle.p-selectbutton .p-togglebutton.p-togglebutton-checked .p-togglebutton-content,
.ww-view-mode-toggle.p-selectbutton .p-togglebutton[data-p-checked='true'] .p-togglebutton-content {
  background: transparent !important;
  box-shadow: none !important;
}

[data-theme='dark'] .ww-view-mode-toggle.p-selectbutton .p-togglebutton.p-togglebutton-checked,
[data-theme='dark'] .ww-view-mode-toggle.p-selectbutton .p-togglebutton[data-p-checked='true'] {
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.28) !important;
}

.ww-view-mode-toggle__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  color: currentColor;
}

.ww-view-mode-toggle__option .ww-icon {
  color: currentColor;
}
</style>
