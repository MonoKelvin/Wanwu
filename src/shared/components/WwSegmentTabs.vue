<script setup lang="ts">
import SelectButton from 'primevue/selectbutton'

export interface WwSegmentTabOption {
  label: string
  value: string
}

const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    options: WwSegmentTabOption[]
    wide?: boolean
    ariaLabel?: string
  }>(),
  { ariaLabel: '切换分类' }
)
</script>

<template>
  <SelectButton
    v-model="model"
    :options="options"
    option-label="label"
    option-value="value"
    data-key="value"
    :allow-empty="false"
    :aria-label="ariaLabel"
    :class="['ww-segment-tabs', wide && 'ww-segment-tabs--wide']"
  />
</template>

<style>
.ww-segment-tabs.p-selectbutton {
  display: inline-flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0.1875rem;
  padding: 0.1875rem;
  border-radius: 0.4375rem;
  background: var(--ww-inset);
  border: 1px solid var(--ww-border-faint);
}

.ww-segment-tabs.p-selectbutton .p-togglebutton {
  flex: 1 1 0;
  min-width: 3.25rem;
  height: auto;
  justify-content: center;
  border: none !important;
  border-radius: 0.3125rem !important;
  padding: 0.3125rem 0.6875rem !important;
  font-size: 0.8125rem !important;
  line-height: 1.25 !important;
  font-weight: 500;
  color: var(--ww-ink-muted) !important;
  background: transparent !important;
  box-shadow: none !important;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-segment-tabs.p-selectbutton .p-togglebutton .p-togglebutton-content {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.ww-segment-tabs.p-selectbutton .p-togglebutton-label {
  white-space: nowrap;
}

.ww-segment-tabs.p-selectbutton .p-togglebutton:not(.p-togglebutton-checked):hover {
  color: var(--ww-ink) !important;
  background: var(--ww-list-hover-bg) !important;
}

.ww-segment-tabs.p-selectbutton .p-togglebutton.p-togglebutton-checked,
.ww-segment-tabs.p-selectbutton .p-togglebutton[data-p-checked='true'] {
  color: var(--ww-ink) !important;
  background: var(--ww-elevated) !important;
  box-shadow: 0 1px 3px rgb(18 18 22 / 0.08) !important;
}

.ww-segment-tabs--wide.p-selectbutton {
  width: 100%;
}

.ww-segment-tabs--wide.p-selectbutton .p-togglebutton {
  min-width: 0;
}

[data-theme='dark'] .ww-segment-tabs.p-selectbutton .p-togglebutton.p-togglebutton-checked,
[data-theme='dark'] .ww-segment-tabs.p-selectbutton .p-togglebutton[data-p-checked='true'] {
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.28) !important;
}
</style>
