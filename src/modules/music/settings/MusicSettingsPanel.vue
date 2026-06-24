<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import { useSettingsStore } from '@shared/stores/settings'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwButton from '@shared/components/WwButton.vue'
import MusicPlatformLoginDialog from '@modules/music/components/MusicPlatformLoginDialog.vue'
import type { MusicConnectionTestResult, MusicKugouLoginStatus, MusicNeteaseLoginStatus, MusicProviderHealth } from '@modules/music/domain/types'
import { MUSIC_MODULE_ID } from '@modules/music/domain/moduleId'
import {
  readMusicModuleSettings,
  type MusicApiMode,
  type MusicModuleSettings,
  type MusicNeteaseQuality,
  type MusicPrimarySource
} from '@modules/music/domain/settings'
import './music-settings.css'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const musicSettings = computed(() => readMusicModuleSettings(settings.value))

async function patchMusic(patch: Partial<MusicModuleSettings>) {
  await settingsStore.patchModuleSettings(MUSIC_MODULE_ID, patch)
}

const apiModeOptions = [
  { label: '线上 API', value: 'remote' as const },
  { label: '本地 Verome', value: 'local' as const }
]

const primarySourceOptions = [
  { label: '酷狗', value: 'kugou' as const },
  { label: '网易云', value: 'netease' as const },
  { label: 'Verome', value: 'verome' as const }
]

const ossProjects = [
  {
    name: 'KuGouMusicApi',
    href: 'https://github.com/MakcRe/KuGouMusicApi',
    license: 'MIT',
    note: '默认主音源 · 酷狗音乐 Node.js API'
  },
  {
    name: 'NeteaseCloudMusicApi Enhanced',
    href: 'https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced',
    license: 'MIT',
    note: '网易云内嵌 API（api-enhanced）'
  },
  {
    name: 'NeteaseCloudMusicApi',
    href: 'https://github.com/Binaryify/NeteaseCloudMusicApi',
    license: 'MIT',
    note: '网易云 API 原版'
  }
] as const

const qualityOptions = [
  { label: '标准', value: 'standard' as const },
  { label: '较高', value: 'higher' as const },
  { label: '极高', value: 'exhigh' as const },
  { label: '无损', value: 'lossless' as const },
  { label: 'Hi-Res', value: 'hires' as const }
]

const loginOpen = ref(false)
const loginStatus = ref<MusicNeteaseLoginStatus | MusicKugouLoginStatus>({ loggedIn: false, loginType: 'none' })

const accountPlatformLabel = computed(() => {
  if (musicSettings.value.primarySource === 'kugou') return '酷狗'
  if (musicSettings.value.primarySource === 'netease') return '网易云'
  return ''
})

const showPlatformLogin = computed(
  () => musicSettings.value.primarySource === 'kugou' || musicSettings.value.primarySource === 'netease'
)

const showNeteaseNetwork = computed(() => musicSettings.value.primarySource === 'netease')

const showPlatformNetwork = computed(
  () => musicSettings.value.primarySource === 'kugou' || musicSettings.value.primarySource === 'netease'
)

const isVeromePrimary = computed(() => musicSettings.value.primarySource === 'verome')

const testing = ref(false)
const testResult = ref<MusicConnectionTestResult | null>(null)
const providerHealth = ref<MusicProviderHealth[]>([])

async function loadProviderHealth() {
  try {
    providerHealth.value = await window.wanwu.music.getProviderHealth()
  } catch {
    providerHealth.value = []
  }
}

async function runConnectionTest() {
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await window.wanwu.music.testConnection()
    await loadProviderHealth()
  } catch (e) {
    testResult.value = {
      ok: false,
      baseUrl: musicSettings.value.apiBaseUrl,
      error: e instanceof Error ? e.message : '测试失败'
    }
  } finally {
    testing.value = false
  }
}

async function onApiModeChange(v: MusicApiMode | null) {
  if (!v || v === musicSettings.value.apiMode) return
  await patchMusic({ apiMode: v })
}

async function onApiBaseUrlChange() {
  await patchMusic({ apiBaseUrl: musicSettings.value.apiBaseUrl })
}

async function onLocalPortChange(e: Event) {
  const value = Number((e.target as HTMLInputElement).value) || 8000
  if (value === musicSettings.value.apiLocalPort) return
  await patchMusic({ apiLocalPort: value })
}

async function onDiscoverCountryChange() {
  await patchMusic({ discoverCountry: musicSettings.value.discoverCountry })
}

async function onJamendoClientIdChange() {
  await patchMusic({ jamendoClientId: musicSettings.value.jamendoClientId })
}

async function onAudiusApiKeyChange() {
  await patchMusic({ audiusApiKey: musicSettings.value.audiusApiKey })
}

async function loadLoginStatus() {
  if (!showPlatformLogin.value) {
    loginStatus.value = { loggedIn: false, loginType: 'none' }
    return
  }
  try {
    loginStatus.value = await window.wanwu.music.getPlatformLoginStatus()
  } catch {
    loginStatus.value = { loggedIn: false, loginType: 'none' }
  }
}

async function onPrimarySourceChange(v: MusicPrimarySource | null) {
  if (!v || v === musicSettings.value.primarySource) return
  await patchMusic({ primarySource: v })
  void loadLoginStatus()
}

async function onQualityChange(v: typeof musicSettings.value.neteaseQuality | null) {
  if (!v || v === musicSettings.value.neteaseQuality) return
  await patchMusic({ neteaseQuality: v })
}

async function onNeteaseRealIpChange() {
  await patchMusic({ neteaseRealIp: musicSettings.value.neteaseRealIp })
}

async function onNeteaseProxyChange() {
  await patchMusic({ neteaseProxy: musicSettings.value.neteaseProxy })
}

onMounted(() => {
  void loadProviderHealth()
  void loadLoginStatus()
})
</script>

<template>
  <div class="ww-settings-section ww-music-settings">
    <div class="ww-settings-group">
      <h3 class="ww-settings-group__label">音乐主源</h3>

      <SettingsRow label="主音源" subtitle="默认酷狗；可切换网易云或 Verome 备用">
        <SelectButton
          class="ww-settings-segment ww-settings-segment--wide"
          :model-value="musicSettings.primarySource"
          :options="primarySourceOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onPrimarySourceChange"
        />
      </SettingsRow>

      <SettingsRow
        v-if="showPlatformLogin"
        label="账号"
        :subtitle="`${accountPlatformLabel} · 日推、收藏、云盘等需登录`"
      >
        <div class="ww-music-settings-account">
          <span
            class="ww-music-settings-account__chip"
            :class="{ 'is-online': loginStatus.loggedIn }"
          >
            <span class="ww-music-settings-account__dot" aria-hidden="true" />
            {{ loginStatus.loggedIn ? loginStatus.nickname ?? `UID ${loginStatus.userId}` : '未登录' }}
          </span>
          <WwButton label="登录 / 管理" variant="outlined" size="small" @click="loginOpen = true" />
        </div>
      </SettingsRow>

      <SettingsRow v-if="showPlatformNetwork" label="播放音质" subtitle="酷狗 / 网易云共用此选项">
        <SelectButton
          class="ww-settings-segment"
          :model-value="musicSettings.neteaseQuality"
          :options="qualityOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onQualityChange"
        />
      </SettingsRow>

      <SettingsRow
        v-if="showNeteaseNetwork"
        label="Real IP"
        subtitle="仅网易云 · 接口 301/403 时可填国内 IP"
      >
        <input
          :value="musicSettings.neteaseRealIp"
          type="text"
          class="ww-music-settings-field ww-music-settings-field--medium"
          @change="onNeteaseRealIpChange"
        />
      </SettingsRow>

      <SettingsRow
        v-if="showPlatformNetwork"
        label="HTTP 代理"
        subtitle="酷狗 / 网易云 · 如 http://127.0.0.1:7890"
      >
        <input
          :value="musicSettings.neteaseProxy"
          type="text"
          class="ww-music-settings-field ww-music-settings-field--wide"
          @change="onNeteaseProxyChange"
        />
      </SettingsRow>

      <SettingsRow label="连接测试" subtitle="检测当前主音源是否可用">
        <div class="ww-music-settings-stack">
          <WwButton
            label="测试连接"
            icon="refresh-cw"
            variant="outlined"
            size="small"
            :loading="testing"
            @click="runConnectionTest"
          />
          <p v-if="testResult?.localModeFallback" class="ww-music-settings-feedback is-warn">
            本地 Verome 未响应，已回退到远程 API：{{ testResult.baseUrl }}
          </p>
          <p v-if="testResult?.ok" class="ww-music-settings-feedback is-ok">
            连接成功 · {{ testResult.latencyMs }}ms · {{ testResult.trackCount }} 条样本数据 ·
            {{ testResult.baseUrl }}
          </p>
          <p v-else-if="testResult && !testResult.ok" class="ww-music-settings-feedback is-error">
            连接失败：{{ testResult.error }}
          </p>
        </div>
      </SettingsRow>

      <SettingsRow v-if="providerHealth.length" label="数据源状态" subtitle="已注册的音乐提供方">
        <ul class="ww-music-settings-tags">
          <li
            v-for="p in providerHealth"
            :key="p.id"
            class="ww-music-settings-tag"
            :class="{ 'is-on': p.enabled }"
          >
            {{ p.label }}{{ p.streamCapable ? ' · 可播' : '' }}
          </li>
        </ul>
      </SettingsRow>
    </div>

    <div v-if="isVeromePrimary" class="ww-settings-group">
      <h3 class="ww-settings-group__label">Verome 主源</h3>

      <SettingsRow label="API 地址" subtitle="默认 https://verome-api.deno.dev">
        <input
          :value="musicSettings.apiBaseUrl"
          type="url"
          class="ww-music-settings-field ww-music-settings-field--wide"
          @change="onApiBaseUrlChange"
        />
      </SettingsRow>

      <SettingsRow label="API 模式">
        <SelectButton
          class="ww-settings-segment ww-settings-segment--wide"
          :model-value="musicSettings.apiMode"
          :options="apiModeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onApiModeChange"
        />
      </SettingsRow>

      <SettingsRow v-if="musicSettings.apiMode === 'local'" label="本地端口" subtitle="本地 Verome 进程监听端口">
        <input
          :value="musicSettings.apiLocalPort"
          type="number"
          min="1"
          max="65535"
          class="ww-music-settings-field ww-music-settings-field--narrow"
          @change="onLocalPortChange"
        />
      </SettingsRow>
    </div>

    <div v-else class="ww-settings-group">
      <h3 class="ww-settings-group__label">备用 · Verome</h3>

      <SettingsRow label="API 地址" subtitle="主源为酷狗/网易云时作 fallback">
        <input
          :value="musicSettings.apiBaseUrl"
          type="url"
          class="ww-music-settings-field ww-music-settings-field--wide"
          @change="onApiBaseUrlChange"
        />
      </SettingsRow>

      <SettingsRow label="发现页地区" subtitle="Verome 趋势/榜单地区名">
        <input
          :value="musicSettings.discoverCountry"
          type="text"
          class="ww-music-settings-field ww-music-settings-field--medium"
          @change="onDiscoverCountryChange"
        />
      </SettingsRow>
    </div>

    <div class="ww-settings-group">
      <h3 class="ww-settings-group__label">其他数据源</h3>

      <SettingsRow label="Jamendo Client ID" subtitle="可选 · 留空不启用">
        <input
          :value="musicSettings.jamendoClientId"
          type="text"
          class="ww-music-settings-field ww-music-settings-field--wide"
          autocomplete="off"
          @change="onJamendoClientIdChange"
        />
      </SettingsRow>

      <SettingsRow label="Audius API Key" subtitle="可选 Bearer · 留空仍可用公开接口">
        <input
          :value="musicSettings.audiusApiKey"
          type="password"
          class="ww-music-settings-field ww-music-settings-field--wide"
          autocomplete="off"
          @change="onAudiusApiKeyChange"
        />
      </SettingsRow>
    </div>

    <div class="ww-settings-group ww-settings-group--muted">
      <h3 class="ww-settings-group__label">开源项目</h3>
      <ul class="ww-music-settings-oss">
        <li v-for="item in ossProjects" :key="item.href" class="ww-music-settings-oss__item">
          <a :href="item.href" target="_blank" rel="noopener noreferrer" class="ww-music-settings-oss__link">
            {{ item.name }}
          </a>
          <span class="ww-music-settings-oss__meta">{{ item.license }} · {{ item.note }}</span>
        </li>
      </ul>
    </div>

    <div class="ww-settings-group ww-settings-group--muted">
      <h3 class="ww-settings-group__label">免责声明</h3>
      <div class="ww-music-settings-disclaimer">
        <p>
          万物内嵌上述第三方 API，仅供个人学习与技术研究，不提供任何官方音乐服务。请遵守各开源项目及当地法律法规。
        </p>
        <p class="ww-music-settings-disclaimer__heading">KuGouMusicApi 项目声明：</p>
        <ul>
          <li>仅供学习使用，请勿用于商业或非法用途。</li>
          <li>使用过程中可能产生版权数据；请在 24 小时内清除相关缓存数据。</li>
          <li>因使用本项目产生的直接或间接损失由使用者自行承担。</li>
          <li>禁止在违反当地法律法规的情况下使用；请尊重版权，支持正版音乐。</li>
        </ul>
        <p class="ww-music-settings-disclaimer__heading">NeteaseCloudMusicApi Enhanced 说明：</p>
        <ul>
          <li>本项目为自由开源软件（MIT），不提供任何担保；请勿用于未授权的商业用途。</li>
          <li>接口通过伪造请求调用官方服务，仅供自建与二次开发研究。</li>
        </ul>
      </div>
    </div>

    <MusicPlatformLoginDialog
      v-model:visible="loginOpen"
      @success="() => { void loadLoginStatus() }"
      @update:visible="(v) => v && loadLoginStatus()"
    />
  </div>
</template>

