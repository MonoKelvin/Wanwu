<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import { useSettingsStore } from '@shared/stores/settings'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { NOTES_POPOUT_RESTORE_OPTIONS } from '@modules/library/notes/domain/noteSettings'
import type { NotesPopoutRestoreMode } from '@shared/types/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

async function onNotesPopoutRestoreChange(v: NotesPopoutRestoreMode) {
  if (!v || v === settings.value.notesPopoutRestore) return
  await settingsStore.setNotesPopoutRestore(v)
}

async function onNotesSpellcheckEnabledChange(enabled: boolean) {
  if (enabled === settings.value.notesSpellcheckEnabled) return
  await settingsStore.setNotesSpellcheckEnabled(enabled)
}
</script>

<template>
  <div class="ww-settings-section">
    <div class="ww-settings-group">
      <SettingsRow
        label="便笺独立窗口"
        subtitle="上次退出时仍打开的便笺窗口，何时自动恢复显示"
      >
        <SelectButton
          class="ww-settings-segment ww-settings-segment--wide"
          :model-value="settings.notesPopoutRestore"
          :options="NOTES_POPOUT_RESTORE_OPTIONS"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onNotesPopoutRestoreChange"
        />
      </SettingsRow>
      <SettingsRow
        label="便笺拼写检查"
        subtitle="为便笺标题与正文启用浏览器拼写检查（默认关闭）"
      >
        <WwToggleSwitch
          :model-value="settings.notesSpellcheckEnabled"
          aria-label="便笺拼写检查"
          @update:model-value="onNotesSpellcheckEnabledChange"
        />
      </SettingsRow>
    </div>
  </div>
</template>
