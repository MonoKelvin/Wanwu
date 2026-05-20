<script setup lang="ts">
import { ref } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'
import SettingsRow from '@features/settings/SettingsRow.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useSettingsMaintenance } from '@features/settings/composables/useSettingsMaintenance'

defineProps<{
  paths: {
    userData: string
    wanwu: string
    defaultWanwu: string
    isCustom: boolean
  } | null
}>()

const emit = defineEmits<{
  openMigrate: []
}>()

const dbEncryptionEnabled = ref(false)
const { busy, onCreateBackup, onRestoreBackup, onClearCache, onResetSettings, onExportDiagnostics } =
  useSettingsMaintenance()

async function openDataFolder() {
  await window.wanwu.app.openDataDirectory()
}
</script>

<template>
  <div class="ww-settings-section">
    <div class="ww-settings-group ww-settings-group--stack">
      <div class="ww-settings-block ww-settings-block--data">
        <div class="ww-settings-block__head">
          <div>
            <p class="ww-settings-block__title">数据目录</p>
            <p class="ww-settings-block__subtitle">本地数据库与媒体文件存储位置</p>
          </div>
          <WwButton
            label="迁移目录…"
            icon="folder"
            size="small"
            @click="emit('openMigrate')"
          />
        </div>
        <button
          v-if="paths"
          type="button"
          class="ww-settings-path-row"
          :title="paths.wanwu"
          @click="openDataFolder"
        >
          <code class="ww-settings-path-row__path">{{ paths.wanwu }}</code>
          <WwIcon name="external-link" size="xs" class="ww-settings-path-row__icon" aria-hidden="true" />
        </button>
        <p v-if="paths?.isCustom" class="ww-settings-block__meta">
          已使用自定义路径 · 默认 {{ paths.defaultWanwu }}
        </p>
      </div>
    </div>
    <div class="ww-settings-group">
      <div class="ww-settings-block ww-settings-block--inline">
        <div class="ww-settings-block__text">
          <p class="ww-settings-block__title">备份与维护</p>
          <p class="ww-settings-block__subtitle">备份为 zip 包；恢复将覆盖当前数据目录并重启应用</p>
        </div>
        <div class="ww-settings-block__actions ww-settings-block__actions--end">
          <WwButton
            label="一键备份"
            icon="download"
            size="small"
            :loading="busy"
            @click="onCreateBackup"
          />
          <WwButton
            label="从备份恢复…"
            icon="rotate-ccw"
            severity="secondary"
            outlined
            size="small"
            :loading="busy"
            @click="onRestoreBackup"
          />
        </div>
      </div>
    </div>

    <div class="ww-settings-group">
      <SettingsRow label="清除缓存" subtitle="仅删除 cache 目录，不影响数据库与媒体">
        <WwButton
          label="清除"
          icon="trash-2"
          severity="secondary"
          outlined
          size="small"
          :loading="busy"
          @click="onClearCache"
        />
      </SettingsRow>
      <SettingsRow label="重置所有设置" subtitle="恢复默认选项，并清除全库列表显示偏好">
        <WwButton
          label="重置"
          icon="rotate-ccw"
          severity="secondary"
          outlined
          size="small"
          :loading="busy"
          @click="onResetSettings"
        />
      </SettingsRow>
      <SettingsRow label="导出诊断日志" subtitle="版本、路径、RSS 与数据库摘要，便于反馈问题">
        <WwButton
          label="导出"
          icon="save"
          severity="secondary"
          outlined
          size="small"
          :loading="busy"
          @click="onExportDiagnostics"
        />
      </SettingsRow>
    </div>

    <div class="ww-settings-group ww-settings-group--muted">
      <SettingsRow label="数据库加密" subtitle="SQLCipher 加密待启用">
        <ToggleSwitch
          v-model="dbEncryptionEnabled"
          class="ww-settings-switch"
          disabled
          aria-label="数据库加密"
        />
      </SettingsRow>
    </div>
  </div>
</template>
