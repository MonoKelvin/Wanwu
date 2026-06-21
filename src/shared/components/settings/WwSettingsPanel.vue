<script setup lang="ts">
import SelectButton from 'primevue/selectbutton'
import WwSelect from '@shared/components/WwSelect'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwSettingsInput from '@shared/components/settings/WwSettingsInput.vue'
import WwSettingsGroup from '@shared/components/settings/WwSettingsGroup.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import type { WwSettingsField, WwSettingsGroupConfig } from '@shared/components/settings/types'

const textDebounceTimers = new Map<WwSettingsField, ReturnType<typeof setTimeout>>()

const props = withDefaults(
  defineProps<{
    /** 完整分区：含分组卡片 */
    groups?: readonly WwSettingsGroupConfig[]
    /** 仅字段列表 */
    fields?: readonly WwSettingsField[]
    /**
     * section：独立设置分区（默认，含 ww-settings-section + group）
     * bare：仅字段行，供「应用」页内已包 WwSettingsGroup 时使用
     */
    layout?: 'section' | 'bare'
  }>(),
  { layout: 'section' }
)

function fieldRowKey(field: WwSettingsField, fieldIndex: number): string {
  return `${fieldIndex}-${field.label}`
}

function segmentClass(field: WwSettingsField): string {
  if (field.type !== 'segment') return 'ww-settings-segment'
  return field.wide ? 'ww-settings-segment ww-settings-segment--wide' : 'ww-settings-segment'
}

async function onSegmentChange(field: WwSettingsField, value: unknown) {
  if (field.type !== 'segment') return
  if (value == null || value === '' || value === field.modelValue) return
  await field.onUpdate(value as never)
}

async function onToggleChange(field: WwSettingsField, value: boolean) {
  if (field.type !== 'toggle') return
  if (value === field.modelValue) return
  await field.onUpdate(value)
}

async function onSelectChange(field: WwSettingsField, value: unknown) {
  if (field.type !== 'select') return
  if (value === null || value === undefined || value === field.modelValue) return
  await field.onUpdate(value as never)
}

function onTextChange(field: WwSettingsField, value: string) {
  if (field.type !== 'text') return
  const prev = textDebounceTimers.get(field)
  if (prev) clearTimeout(prev)
  const debounceMs = field.debounceMs ?? 0
  if (debounceMs <= 0) {
    void field.onUpdate(value)
    return
  }
  textDebounceTimers.set(
    field,
    setTimeout(() => {
      textDebounceTimers.delete(field)
      if (value === field.modelValue) return
      void field.onUpdate(value)
    }, debounceMs)
  )
}
</script>

<template>
  <div
    v-if="groups?.length || fields?.length"
    :class="props.layout === 'bare' || !fields?.length ? undefined : 'ww-settings-section'"
  >
    <template v-if="groups?.length">
      <WwSettingsGroup v-for="(group, index) in groups" :key="index" :label="group.label">
        <WwSettingsRow
          v-for="(field, fieldIndex) in group.fields"
          :key="`${index}-${fieldRowKey(field, fieldIndex)}`"
          :label="field.label"
          :subtitle="field.subtitle"
        >
          <SelectButton
            v-if="field.type === 'segment'"
            :class="segmentClass(field)"
            :model-value="field.modelValue"
            :options="[...field.options]"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            @update:model-value="onSegmentChange(field, $event)"
          />
          <WwToggleSwitch
            v-else-if="field.type === 'toggle'"
            :model-value="field.modelValue"
            :aria-label="field.ariaLabel ?? field.label"
            @update:model-value="onToggleChange(field, $event)"
          />
          <WwSelect
            v-else-if="field.type === 'select'"
            :model-value="field.modelValue"
            :options="[...field.options]"
            :size="field.size"
            :disabled="field.disabled"
            @update:model-value="onSelectChange(field, $event)"
          />
          <WwSettingsInput
            v-else-if="field.type === 'text'"
            :model-value="field.modelValue"
            :placeholder="field.placeholder"
            :disabled="field.disabled"
            :aria-label="field.ariaLabel ?? field.label"
            :size="field.size"
            @update:model-value="onTextChange(field, $event)"
          />
        </WwSettingsRow>
      </WwSettingsGroup>
    </template>

    <template v-else-if="props.layout === 'bare'">
      <WwSettingsRow
        v-for="(field, fieldIndex) in fields"
        :key="fieldRowKey(field, fieldIndex)"
        :label="field.label"
        :subtitle="field.subtitle"
      >
        <SelectButton
          v-if="field.type === 'segment'"
          :class="segmentClass(field)"
          :model-value="field.modelValue"
          :options="[...field.options]"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onSegmentChange(field, $event)"
        />
        <WwToggleSwitch
          v-else-if="field.type === 'toggle'"
          :model-value="field.modelValue"
          :aria-label="field.ariaLabel ?? field.label"
          @update:model-value="onToggleChange(field, $event)"
        />
        <WwSelect
          v-else-if="field.type === 'select'"
          :model-value="field.modelValue"
          :options="[...field.options]"
          :size="field.size"
          :disabled="field.disabled"
          @update:model-value="onSelectChange(field, $event)"
        />
        <WwSettingsInput
          v-else-if="field.type === 'text'"
          :model-value="field.modelValue"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          :aria-label="field.ariaLabel ?? field.label"
          :size="field.size"
          @update:model-value="onTextChange(field, $event)"
        />
      </WwSettingsRow>
    </template>

    <WwSettingsGroup v-else>
      <WwSettingsRow
        v-for="(field, fieldIndex) in fields"
        :key="fieldRowKey(field, fieldIndex)"
        :label="field.label"
        :subtitle="field.subtitle"
      >
        <SelectButton
          v-if="field.type === 'segment'"
          :class="segmentClass(field)"
          :model-value="field.modelValue"
          :options="[...field.options]"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onSegmentChange(field, $event)"
        />
        <WwToggleSwitch
          v-else-if="field.type === 'toggle'"
          :model-value="field.modelValue"
          :aria-label="field.ariaLabel ?? field.label"
          @update:model-value="onToggleChange(field, $event)"
        />
        <WwSelect
          v-else-if="field.type === 'select'"
          :model-value="field.modelValue"
          :options="[...field.options]"
          :size="field.size"
          :disabled="field.disabled"
          @update:model-value="onSelectChange(field, $event)"
        />
        <WwSettingsInput
          v-else-if="field.type === 'text'"
          :model-value="field.modelValue"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          :aria-label="field.ariaLabel ?? field.label"
          :size="field.size"
          @update:model-value="onTextChange(field, $event)"
        />
      </WwSettingsRow>
    </WwSettingsGroup>
  </div>
</template>
