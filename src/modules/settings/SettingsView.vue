<script setup lang="ts">
defineOptions({ name: 'SettingsView' })

import { computed, onMounted, ref } from 'vue'
import { useSettingsStore } from '@shared/stores/settings'
import DataMigrateDialog from '@features/settings/DataMigrateDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import SettingsAppSection from '@features/settings/sections/SettingsAppSection.vue'
import SettingsRssSection from '@features/settings/sections/SettingsRssSection.vue'
import SettingsDataSection from '@features/settings/sections/SettingsDataSection.vue'
import SettingsAboutSection from '@features/settings/sections/SettingsAboutSection.vue'
import { SETTINGS_NAV_ITEMS } from '@features/settings/sections/settingsNav'
import type { SettingsSection } from '@features/settings/sections/types'

const settingsStore = useSettingsStore()

const activeSection = ref<SettingsSection>('app')
const paths = ref<{
  userData: string
  wanwu: string
  defaultWanwu: string
  isCustom: boolean
} | null>(null)
const migrateDialogVisible = ref(false)

const sectionTitle = computed(
  () => SETTINGS_NAV_ITEMS.find((n) => n.id === activeSection.value)?.label ?? '设置'
)

onMounted(async () => {
  paths.value = await window.wanwu.app.getPaths()
  if (!settingsStore.loaded) await settingsStore.load()
})

async function refreshPaths() {
  paths.value = await window.wanwu.app.getPaths()
}
</script>

<template>
  <!-- 外层承接 AppShell 的 flex-col；内层保持设置页左右分栏 -->
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
  <div class="ww-settings-layout">
    <div class="ww-settings-layout__ambient" aria-hidden="true">
      <span class="ww-settings-layout__ambient-glow ww-settings-layout__ambient-glow--warm" />
      <span class="ww-settings-layout__ambient-glow ww-settings-layout__ambient-glow--cool" />
    </div>
    <nav class="ww-settings-nav" aria-label="设置分类">
      <p class="ww-settings-nav__heading">设置</p>
      <button
        v-for="item in SETTINGS_NAV_ITEMS"
        :key="item.id"
        type="button"
        class="ww-settings-nav__item"
        :class="{ 'is-active': activeSection === item.id }"
        @click="activeSection = item.id"
      >
        <WwIcon :name="item.icon" size="sm" class="ww-settings-nav__icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="ww-settings-panel">
      <header class="ww-settings-panel__header">
        <h1 class="ww-settings-panel__title">{{ sectionTitle }}</h1>
      </header>

      <div class="ww-settings-panel__body">
        <SettingsAppSection v-show="activeSection === 'app'" />
        <SettingsRssSection v-show="activeSection === 'rss'" />
        <SettingsDataSection
          v-show="activeSection === 'data'"
          :paths="paths"
          @open-migrate="migrateDialogVisible = true"
        />
        <SettingsAboutSection v-show="activeSection === 'about'" :visible="activeSection === 'about'" />
      </div>
    </div>

    <DataMigrateDialog
      v-if="paths"
      v-model:visible="migrateDialogVisible"
      :current-path="paths.wanwu"
      @done="refreshPaths"
    />
  </div>
  </div>
</template>
