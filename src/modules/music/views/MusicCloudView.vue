<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicCloudList from '@modules/music/components/MusicCloudList.vue'
import MusicFeatureHero from '@modules/music/components/MusicFeatureHero.vue'
import MusicLoginBanner from '@modules/music/components/MusicLoginBanner.vue'
import MusicPlatformLoginDialog from '@modules/music/components/MusicPlatformLoginDialog.vue'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

const player = useMusicPlayerStore()
const account = useMusicAccount()
const { platformLabel } = useMusicPlatform()
const tracks = ref<NormalizedTrack[]>([])
const loading = ref(true)
const loginOpen = ref(false)

const heroSubtitle = computed(() => {
  if (loading.value) return '加载中…'
  if (!account.profile.value.loggedIn) return `登录${platformLabel.value}后同步云盘`
  if (!tracks.value.length) return '云盘暂无歌曲'
  return `${tracks.value.length} 首 · ${platformLabel.value}`
})

async function loadCloud() {
  loading.value = true
  try {
    if (account.profile.value.loggedIn) {
      tracks.value = await window.wanwu.music.getPlatformUserCloud(80)
    } else {
      tracks.value = []
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await account.refresh()
  await loadCloud()
})

function onLoginSuccess() {
  void account.refresh().then(() => loadCloud())
}

function play(track: NormalizedTrack) {
  void player.playTrack(track, tracks.value)
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading
        title="云盘"
        :subtitle="platformLabel ? `${platformLabel} 音乐云盘` : '平台音乐云盘'"
      />

      <MusicFeatureHero title="我的云盘" :subtitle="heroSubtitle" :tracks="tracks" />

      <MusicLoginBanner
        v-if="account.hasPlatformAccount && !account.profile.loggedIn && !loading"
        :platform-label="platformLabel"
        title="登录后查看云盘"
        description="云盘歌曲需登录平台账号后同步。"
        @login="loginOpen = true"
      />

      <MusicCloudList
        :tracks="tracks"
        :loading="loading && account.profile.loggedIn"
        empty-text="云盘为空或当前平台暂不支持。"
        @play="play"
      />
    </div>
    <MusicPlatformLoginDialog v-model:visible="loginOpen" @success="onLoginSuccess" />
  </div>
</template>
