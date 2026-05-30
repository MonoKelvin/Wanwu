import { Howl } from 'howler'
import { onUnmounted, watch, type Ref } from 'vue'

/** M5：展厅 BGM（howler，对标 gamemcu bgm2） */
export function useShowroomBgm(url: string, muted: Ref<boolean>) {
  let howl: Howl | null = null

  function ensure(): Howl {
    if (!howl) {
      howl = new Howl({
        src: [url],
        loop: true,
        volume: 0.42,
        html5: true
      })
    }
    return howl
  }

  function play(): void {
    const sound = ensure()
    sound.mute(muted.value)
    if (!sound.playing()) sound.play()
  }

  function stop(): void {
    howl?.stop()
  }

  watch(muted, (m) => {
    howl?.mute(m)
  })

  onUnmounted(() => {
    howl?.unload()
    howl = null
  })

  return { play, stop }
}
