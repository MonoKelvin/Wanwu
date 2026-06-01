<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicFeatureHero from '@modules/music/components/MusicFeatureHero.vue'
import MusicLoginBanner from '@modules/music/components/MusicLoginBanner.vue'
import MusicPlatformLoginDialog from '@modules/music/components/MusicPlatformLoginDialog.vue'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicDailyView' })

const player = useMusicPlayerStore()
const { profile, refresh: refreshAccount } = useMusicAccount()
const { platformLabel, isPlatformPrimary } = useMusicPlatform()
const tracks = ref<NormalizedTrack[]>([])
const loading = ref(true)
const loginOpen = ref(false)

const subtitle = computed(() =>
  isPlatformPrimary.value
    ? `${platformLabel.value} 每日推荐 · 登录后同步`
    : 'Verome 主源暂不支持平台日推'
)

const heroSubtitle = computed(() => {
  if (loading.value) return '加载中…'
  if (!tracks.value.length) return isPlatformPrimary.value ? '登录后获取今日推荐' : subtitle.value
  return `${tracks.value.length} 首 · ${platformLabel.value || '平台'}`
})

async function loadDaily() {
  loading.value = true
  try {
    tracks.value = await window.wanwu.music.getDailyRecommend()
  } finally {
    loading.value = false
  }
}

onMounted(() => void loadDaily())

function onLoginSuccess() {
  void refreshAccount().then(() => loadDaily())
}

function play(track: NormalizedTrack) {
  void player.playTrack(track, tracks.value)
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="每日推荐" :subtitle="subtitle" />

      <MusicFeatureHero
        title="今日推荐"
        :subtitle="heroSubtitle"
        :tracks="tracks"
      />

      <MusicLoginBanner
        v-if="isPlatformPrimary && !profile.loggedIn && !loading"
        :platform-label="platformLabel"
        title="登录后查看完整日推"
        @login="loginOpen = true"
      />

      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <MusicChartList v-else-if="tracks.length" :tracks="tracks" panel show-provider @play="play" />
      <p v-else-if="!isPlatformPrimary" class="ww-music-state-hint">
        当前主源为 Verome，请在设置中切换酷狗或网易云以使用日推。
      </p>
      <p v-else-if="profile.loggedIn" class="ww-music-state-hint">暂无日推内容。</p>
    </div>
    <MusicPlatformLoginDialog v-model:visible="loginOpen" @success="onLoginSuccess" />
  </div>
</template>
