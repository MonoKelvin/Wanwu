<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'
import { useSettingsStore } from '@shared/stores/settings'
import { NOTES_MODULE_ID } from '@modules/library/notes/domain/moduleId'
import {
  NOTES_POPOUT_RESTORE_OPTIONS,
  readNotesModuleSettings,
  type NotesPopoutRestoreMode
} from '@modules/library/notes/domain/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const notesSettings = computed(() => readNotesModuleSettings(settings.value))

const fields = computed((): WwSettingsField[] => [
  {
    type: 'segment',
    label: '便笺独立窗口',
    subtitle: '上次退出时仍打开的便笺窗口，何时自动恢复显示',
    options: NOTES_POPOUT_RESTORE_OPTIONS,
    wide: true,
    modelValue: notesSettings.value.popoutRestore,
    onUpdate: async (value) => {
      const next = value as NotesPopoutRestoreMode
      if (!next || next === notesSettings.value.popoutRestore) return
      await settingsStore.patchModuleSettings(NOTES_MODULE_ID, { popoutRestore: next })
    }
  },
  {
    type: 'toggle',
    label: '便笺拼写检查',
    subtitle: '为便笺标题与正文启用浏览器拼写检查（默认关闭）',
    ariaLabel: '便笺拼写检查',
    modelValue: notesSettings.value.spellcheckEnabled,
    onUpdate: async (value) => {
      const enabled = Boolean(value)
      if (enabled === notesSettings.value.spellcheckEnabled) return
      await settingsStore.patchModuleSettings(NOTES_MODULE_ID, { spellcheckEnabled: enabled })
    }
  }
])
</script>

<template>
  <WwSettingsPanel :fields="fields" layout="bare" />
</template>
