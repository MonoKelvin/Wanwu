<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'
import { useSettingsStore } from '@shared/stores/settings'
import { NOTES_POPOUT_RESTORE_OPTIONS } from '@modules/library/notes/domain/noteSettings'
import type { NotesPopoutRestoreMode } from '@shared/types/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const fields = computed((): WwSettingsField[] => [
  {
    type: 'segment',
    label: '便笺独立窗口',
    subtitle: '上次退出时仍打开的便笺窗口，何时自动恢复显示',
    options: NOTES_POPOUT_RESTORE_OPTIONS,
    wide: true,
    modelValue: settings.value.notesPopoutRestore,
    onUpdate: async (value) => {
      const next = value as NotesPopoutRestoreMode
      if (!next || next === settings.value.notesPopoutRestore) return
      await settingsStore.setNotesPopoutRestore(next)
    }
  },
  {
    type: 'toggle',
    label: '便笺拼写检查',
    subtitle: '为便笺标题与正文启用浏览器拼写检查（默认关闭）',
    ariaLabel: '便笺拼写检查',
    modelValue: settings.value.notesSpellcheckEnabled,
    onUpdate: async (value) => {
      const enabled = Boolean(value)
      if (enabled === settings.value.notesSpellcheckEnabled) return
      await settingsStore.setNotesSpellcheckEnabled(enabled)
    }
  }
])
</script>

<template>
  <WwSettingsPanel :fields="fields" />
</template>
