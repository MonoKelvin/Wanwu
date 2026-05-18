<script setup lang="ts">

import { computed, onMounted, ref } from 'vue'

import { storeToRefs } from 'pinia'

import SelectButton from 'primevue/selectbutton'

import { useSettingsStore } from '@shared/stores/settings'

import { useWanwuToast } from '@shared/composables/useWanwuToast'

import SettingsRow from '@features/settings/SettingsRow.vue'
import WwIcon from '@shared/components/WwIcon.vue'

import type { NavAlign, NavDisplay, RssFetchLimit } from '@shared/types/settings'

import { RSS_FETCH_LIMIT_OPTIONS } from '@shared/types/settings'



type SettingsSection = 'ui' | 'rss' | 'about' | 'data'



const settingsStore = useSettingsStore()

const { settings } = storeToRefs(settingsStore)

const toast = useWanwuToast()



const activeSection = ref<SettingsSection>('ui')

const paths = ref<{ userData: string; wanwu: string } | null>(null)



const navItems: Array<{ id: SettingsSection; label: string }> = [

  { id: 'ui', label: '界面' },

  { id: 'rss', label: 'RSS' },

  { id: 'about', label: '关于' },

  { id: 'data', label: '数据与安全' }

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



const githubUrl = 'https://github.com/MonoKelvin/Wanwu'



onMounted(async () => {

  paths.value = await window.wanwu.app.getPaths()

  if (!settingsStore.loaded) await settingsStore.load()

})



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



        <section v-show="activeSection === 'about'" class="ww-settings-section">

          <SettingsRow label="应用名称">

            <span class="text-sm font-medium text-ww-ink">万物</span>

          </SettingsRow>

          <SettingsRow label="版本">

            <span class="text-sm text-ww-ink-muted">v1.0.1</span>

          </SettingsRow>

          <SettingsRow label="简介" subtitle="本地收集与浏览事物" />

          <SettingsRow label="开源仓库">

            <a

              :href="githubUrl"

              target="_blank"

              rel="noopener noreferrer"

              class="ww-settings-link"

            >

              <WwIcon name="github" size="md" />

              <span class="max-w-[14rem] truncate">{{ githubUrl }}</span>

            </a>

          </SettingsRow>

        </section>



        <section v-show="activeSection === 'data'" class="ww-settings-section">

          <SettingsRow label="数据目录" subtitle="本地数据库与媒体文件存储位置">

            <p

              v-if="paths"

              class="m-0 max-w-full break-all text-right font-mono text-[0.6875rem] leading-relaxed text-ww-ink-muted"

            >

              {{ paths.wanwu }}

            </p>

          </SettingsRow>

          <SettingsRow label="数据库加密" subtitle="SQLCipher 加密待启用" />

        </section>

      </div>

    </div>

  </div>

</template>


