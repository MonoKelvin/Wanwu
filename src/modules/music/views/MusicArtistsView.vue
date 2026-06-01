<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import '@modules/music/styles/music-shared.css'

const router = useRouter()
const { buildBrowseId } = useMusicPlatform()
const artists = ref<Array<{ browseId: string; name: string; coverUrl?: string }>>([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    artists.value = await window.wanwu.music.getNeteaseArtistList(60)
  } finally {
    loading.value = false
  }
})

function openArtist(item: { id: string }) {
  const browseId = item.id.includes(':') ? item.id : buildBrowseId('artist', item.id)
  void router.push({ name: 'music-artist', params: { browseId } })
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="歌手" subtitle="热门歌手浏览" />
      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <MusicCoverRow
        v-else-if="artists.length"
        :items="
          artists.map((a) => ({
            id: a.browseId,
            title: a.name,
            coverUrl: a.coverUrl
          }))
        "
        @select="openArtist"
      />
      <p v-else class="ww-music-state-hint">暂无歌手数据</p>
    </div>
  </div>
</template>
