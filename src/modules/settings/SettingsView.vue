<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import SettingsRow from '@features/settings/SettingsRow.vue'
import DataMigrateDialog from '@features/settings/DataMigrateDialog.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { NavAlign, NavDisplay, RssFetchLimit } from '@shared/types/settings'
import { RSS_FETCH_LIMIT_OPTIONS } from '@shared/types/settings'

type SettingsSection = 'ui' | 'rss' | 'data' | 'about'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const toast = useWanwuToast()

const activeSection = ref<SettingsSection>('ui')
const paths = ref<{
  userData: string
  wanwu: string
  defaultWanwu: string
  isCustom: boolean
} | null>(null)
const migrateDialogVisible = ref(false)

const navItems: Array<{ id: SettingsSection; label: string }> = [
  { id: 'ui', label: '界面' },
  { id: 'rss', label: 'RSS' },
  { id: 'data', label: '数据与安全' },
  { id: 'about', label: '关于' }
]

const sectionTitle = computed(() => navItems.find((n) => n.id === activeSection.value)?.label ?? '设置')

const navAlignOptions = [
  { label: '居中', value: 'center' as NavAlign },
  { label: '靠上', value: 'start' as NavAlign }
]

const navDisplayOptions = [
  { label: '仅图标', value: 'icon' as NavDisplay },
  { label: '图标+文字', value: 'both' as NavDisplay }
]

const rssFetchOptions = RSS_FETCH_LIMIT_OPTIONS.map((n) => ({
  label: `${n} 条`,
  value: n as RssFetchLimit
}))

const appVersion = 'v1.0.2'
const githubUrl = 'https://github.com/MonoKelvin/Wanwu'
const cursorUrl = 'https://cursor.com'

const appIntro =
  '万物是一款桌面端「事物图鉴」应用：用分类与条目组织百科式内容，支持配图浏览、个人收藏与 RSS 阅读。数据保存在本机，适合本地查阅与整理兴趣专题。'

const developers = [
  { name: 'Cursor', href: cursorUrl, note: 'AI 辅助设计与开发' },
  { name: 'MonoKelvin', href: 'https://github.com/MonoKelvin', note: 'MonoStudio · 产品与工程' }
]

onMounted(async () => {
  paths.value = await window.wanwu.app.getPaths()
  if (!settingsStore.loaded) await settingsStore.load()
})

async function refreshPaths() {
  paths.value = await window.wanwu.app.getPaths()
}

async function onNavAlignChange(v: NavAlign) {
  if (v && v !== settings.value.navAlign) {
    await settingsStore.setNavAlign(v)
    toast.success('导航对齐已更新')
  }
}

async function onNavDisplayChange(v: NavDisplay) {
  if (v && v !== settings.value.navDisplay) {
    await settingsStore.setNavDisplay(v)
    toast.success('导航显示已更新')
  }
}

async function onRssFetchLimitChange(v: RssFetchLimit) {
  if (v && v !== settings.value.rssFetchLimit) {
    await settingsStore.setRssFetchLimit(v)
    toast.success('RSS 拉取条数已更新')
  }
}

async function openDataFolder() {
  await window.wanwu.app.openDataDirectory()
}

function openMigrateDialog() {
  migrateDialogVisible.value = true
}
</script>

<template>
  <div class="ww-settings-layout">
    <nav class="ww-settings-nav" aria-label="设置分类">
      <p class="ww-settings-nav__heading">设置</p>
      <button
        v-for="item in navItems"
        :key="item.id"
        type="button"
        class="ww-settings-nav__item"
        :class="{ 'is-active': activeSection === item.id }"
        @click="activeSection = item.id"
      >
        {{ item.label }}
      </button>
    </nav>

    <div class="ww-settings-panel">
      <header class="ww-settings-panel__header">
        <h1 class="ww-settings-panel__title">{{ sectionTitle }}</h1>
      </header>

      <div class="ww-settings-panel__body">
        <section v-show="activeSection === 'ui'" class="ww-settings-section">
          <SettingsRow label="导航图标对齐" subtitle="模块侧栏图标的垂直对齐方式">
            <SelectButton
              :model-value="settings.navAlign"
              :options="navAlignOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              @update:model-value="onNavAlignChange"
            />
          </SettingsRow>

          <SettingsRow label="导航显示模式" subtitle="仅图标，或图标加文字">
            <SelectButton
              :model-value="settings.navDisplay"
              :options="navDisplayOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              @update:model-value="onNavDisplayChange"
            />
          </SettingsRow>
        </section>

        <section v-show="activeSection === 'rss'" class="ww-settings-section">
          <SettingsRow label="每次获取条目" subtitle="刷新与加载更多时使用的条数">
            <SelectButton
              :model-value="settings.rssFetchLimit"
              :options="rssFetchOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              @update:model-value="onRssFetchLimitChange"
            />
          </SettingsRow>
        </section>

        <section v-show="activeSection === 'data'" class="ww-settings-section">
          <div class="ww-settings-row ww-settings-row--stacked">
            <div class="ww-settings-row__label">
              <span class="ww-settings-row__title">数据目录</span>
              <span class="ww-settings-row__subtitle">本地数据库与媒体文件存储位置</span>
            </div>
            <div class="ww-settings-row__control ww-settings-row__control--stack">
              <p v-if="paths" class="ww-settings-path">{{ paths.wanwu }}</p>
              <p v-if="paths?.isCustom" class="ww-settings-path-hint">已使用自定义路径（默认：{{ paths.defaultWanwu }}）</p>
              <div class="ww-settings-data-actions">
                <WwButton label="在文件夹中打开" icon="folder-open" severity="secondary" outlined size="small" @click="openDataFolder" />
                <WwButton label="迁移到其他目录…" icon="folder" size="small" @click="openMigrateDialog" />
              </div>
            </div>
          </div>

          <SettingsRow label="数据库加密" subtitle="SQLCipher 加密待启用" />
        </section>

        <section v-show="activeSection === 'about'" class="ww-settings-section ww-settings-section--about">
          <SettingsRow label="应用名称">
            <span class="text-sm font-medium text-ww-ink">万物</span>
          </SettingsRow>

          <SettingsRow label="版本">
            <span class="text-sm text-ww-ink-muted">{{ appVersion }}</span>
          </SettingsRow>

          <div class="ww-settings-about-block">
            <h2 class="ww-settings-about-block__title">软件简介</h2>
            <p class="ww-settings-about-block__text">{{ appIntro }}</p>
          </div>

          <div class="ww-settings-about-block">
            <h2 class="ww-settings-about-block__title">开发者</h2>
            <ul class="ww-settings-developers">
              <li v-for="dev in developers" :key="dev.name" class="ww-settings-developer">
                <a
                  :href="dev.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ww-settings-developer__link"
                >{{ dev.name }}</a>
                <span class="ww-settings-developer__note">{{ dev.note }}</span>
              </li>
            </ul>
          </div>

          <div class="ww-settings-row ww-settings-row--stacked">
            <div class="ww-settings-row__label">
              <span class="ww-settings-row__title">开源仓库</span>
            </div>
            <div class="ww-settings-row__control ww-settings-row__control--stack">
              <a
                :href="githubUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="ww-settings-link ww-settings-link--block"
              >
                <WwIcon name="github" size="md" />
                <span class="ww-settings-link__text">{{ githubUrl }}</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>

    <DataMigrateDialog
      v-if="paths"
      v-model:visible="migrateDialogVisible"
      :current-path="paths.wanwu"
      @done="refreshPaths"
    />
  </div>
</template>
