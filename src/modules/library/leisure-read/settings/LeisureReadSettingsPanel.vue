<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import WwIcon from '@shared/components/WwIcon.vue'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'
import { useSettingsStore } from '@shared/stores/settings'
import type { LeisureReadJokeLang, LeisureReadArticleMode, LeisureReadRiddleThinkDelay } from '@shared/types/settings'
import {
  resolveLeisureReadApiGroups,
  type LeisureReadApiGroup
} from '@modules/library/leisure-read/domain/apiCatalog'
import {
  LEISURE_READ_ARTICLE_MODE_OPTIONS,
  LEISURE_READ_RIDDLE_LANG_OPTIONS,
  LEISURE_READ_RIDDLE_THINK_OPTIONS,
  readLeisureReadModuleSettings
} from '@modules/library/leisure-read/domain/settings'
import './leisure-read-settings.css'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const moduleSettings = computed(() => readLeisureReadModuleSettings(settings.value))

const fields = computed((): WwSettingsField[] => [
  {
    type: 'segment',
    label: '脑筋急转弯语言',
    subtitle: '默认中文；英文使用 JokeAPI 问答格式',
    options: LEISURE_READ_RIDDLE_LANG_OPTIONS,
    modelValue: settings.value.leisureReadJokeLang,
    onUpdate: async (value) => {
      const next = value as LeisureReadJokeLang
      if (!next || next === settings.value.leisureReadJokeLang) return
      await settingsStore.setLeisureReadJokeLang(next)
    }
  },
  {
    type: 'segment',
    label: '急转弯思考时长',
    subtitle: '揭晓谜底前需等待的时长，默认 5 秒',
    options: LEISURE_READ_RIDDLE_THINK_OPTIONS.map((o) => ({
      label: o.label,
      value: String(o.value)
    })),
    modelValue: String(settings.value.leisureReadRiddleThinkDelay),
    onUpdate: async (value) => {
      const delay = Number(value)
      const next: LeisureReadRiddleThinkDelay =
        delay === 0 || delay === 5 || delay === 10 || delay === 30 ? delay : 5
      if (next === settings.value.leisureReadRiddleThinkDelay) return
      await settingsStore.setLeisureReadRiddleThinkDelay(next)
    }
  },
  {
    type: 'segment',
    label: '每日一文',
    subtitle: '默认随机；可切换为今日一文',
    options: LEISURE_READ_ARTICLE_MODE_OPTIONS,
    modelValue: settings.value.leisureReadArticleMode,
    onUpdate: async (value) => {
      const next = value as LeisureReadArticleMode
      if (!next || next === settings.value.leisureReadArticleMode) return
      await settingsStore.setLeisureReadArticleMode(next)
    }
  }
])

const apiGroups = computed(() => resolveLeisureReadApiGroups(moduleSettings.value))

const expandedGroups = ref<Record<string, boolean>>({})

function groupKey(group: LeisureReadApiGroup) {
  return `${group.tab}-${group.label}`
}

function isGroupExpanded(group: LeisureReadApiGroup) {
  return expandedGroups.value[groupKey(group)] ?? false
}

function toggleGroup(group: LeisureReadApiGroup) {
  const key = groupKey(group)
  expandedGroups.value[key] = !isGroupExpanded(group)
}
</script>

<template>
  <WwSettingsPanel :fields="fields" />

  <div class="lr-settings-apis">
    <h3 class="lr-settings-apis__heading">内容接口</h3>
    <p class="lr-settings-apis__intro">
      闲读通过以下第三方公开接口获取内容。请求失败时会按顺序自动尝试同分类的备用接口。
    </p>

    <section
      v-for="group in apiGroups"
      :key="groupKey(group)"
      class="lr-settings-apis__section"
    >
      <button
        type="button"
        class="lr-settings-apis__section-toggle"
        :aria-expanded="isGroupExpanded(group)"
        @click="toggleGroup(group)"
      >
        <WwIcon
          name="chevron-right"
          size="sm"
          class="lr-settings-apis__chevron"
          :class="{ 'is-open': isGroupExpanded(group) }"
          aria-hidden="true"
        />
        <span class="lr-settings-apis__section-title">{{ group.label }}</span>
        <span class="lr-settings-apis__section-count">{{ group.sources.length }}</span>
      </button>
      <ul v-show="isGroupExpanded(group)" class="lr-settings-apis__rows">
        <li v-for="(source, index) in group.sources" :key="source.id">
          <div class="lr-settings-apis__row">
            <span class="lr-settings-apis__name-col">
              <span
                class="lr-settings-apis__tag"
                :class="index === 0 ? 'is-primary' : 'is-fallback'"
              >
                {{ index === 0 ? '首选' : `备用 ${index}` }}
              </span>
              <span class="lr-settings-apis__name">{{ source.name }}</span>
            </span>
            <span class="lr-settings-apis__meta">{{ source.host }} · {{ source.description }}</span>
          </div>
        </li>
      </ul>
    </section>

    <p class="lr-settings-apis__footnote">
      以上内容来自第三方服务，仅供个人阅读与娱乐。请遵守各接口提供方的使用条款，并尊重原作者版权。
    </p>
  </div>
</template>
