import { computed, ref } from 'vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

/** MV 页激活时隐藏底栏并协调音乐播放 */
const mvPageActive = ref(false)
let musicWasPlayingBeforeMv: boolean | null = null

export function useMusicMvPlayback() {
  const player = useMusicPlayerStore()

  const minibarHidden = computed(() => mvPageActive.value)

  function enterMvPage() {
    if (mvPageActive.value) return
    musicWasPlayingBeforeMv = player.isPlaying
    mvPageActive.value = true
  }

  function leaveMvPage() {
    mvPageActive.value = false
    musicWasPlayingBeforeMv = null
  }

  /** 开始播放 MV：暂停背景音乐 */
  function onMvVideoPlay() {
    if (player.isPlaying) player.togglePlay()
  }

  /** 暂停 MV：若进入页面前音乐在播则恢复 */
  function onMvVideoPause() {
    if (musicWasPlayingBeforeMv === true && !player.isPlaying) {
      player.togglePlay()
    }
  }

  return {
    mvPageActive,
    minibarHidden,
    enterMvPage,
    leaveMvPage,
    onMvVideoPlay,
    onMvVideoPause
  }
}
