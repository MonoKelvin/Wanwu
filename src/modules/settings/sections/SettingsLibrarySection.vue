<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import { useSettingsStore } from '@shared/stores/settings'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { NOTES_POPOUT_RESTORE_OPTIONS, type NotesPopoutRestoreMode } from '@shared/types/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

async function onNotesPopoutRestoreChange(v: NotesPopoutRestoreMode) {
  if (!v || v === settings.value.notesPopoutRestore) return
  await settingsStore.setNotesPopoutRestore(v)
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
    </div>
  </div>
</template>
