<script setup lang="ts">
import SelectButton from 'primevue/selectbutton'
import WwSelect from '@shared/components/WwSelect'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwSettingsGroup from '@shared/components/settings/WwSettingsGroup.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import type { WwSettingsField, WwSettingsGroupConfig } from '@shared/components/settings/types'

const props = defineProps<{
  /** 完整分区：含分组卡片 */
  groups?: readonly WwSettingsGroupConfig[]
  /** 仅字段列表，供外层已包 WwSettingsGroup 时使用 */
  fields?: readonly WwSettingsField[]
}>()

function segmentClass(field: WwSettingsField): string {
  if (field.type !== 'segment') return 'ww-settings-segment'
  return field.wide ? 'ww-settings-segment ww-settings-segment--wide' : 'ww-settings-segment'
}

async function onSegmentChange(field: WwSettingsField, value: unknown) {
  if (field.type !== 'segment') return
  if (!value || value === field.modelValue) return
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
</script>

<template>
  <template v-if="groups?.length">
    <WwSettingsGroup v-for="(group, index) in groups" :key="index" :label="group.label">
      <WwSettingsRow
        v-for="(field, fieldIndex) in group.fields"
        :key="`${index}-${fieldIndex}-${field.label}`"
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
          @update:model-value="onSelectChange(field, $event)"
        />
      </WwSettingsRow>
    </WwSettingsGroup>
  </template>

  <template v-else-if="fields?.length">
    <WwSettingsRow
      v-for="(field, fieldIndex) in fields"
      :key="`${fieldIndex}-${field.label}`"
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
        @update:model-value="onSelectChange(field, $event)"
      />
    </WwSettingsRow>
  </template>
</template>
