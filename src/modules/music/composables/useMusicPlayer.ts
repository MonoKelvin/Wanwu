import { Howl } from 'howler'
import { onUnmounted, ref, watch } from 'vue'
import type { MusicStreamResult } from '@modules/music/domain/types'
import { loadMusicVolumePrefs, saveMusicVolumePrefs } from '@modules/music/lib/musicVolumePrefs'

type HowlFormat = NonNullable<MusicStreamResult['format']>

function howlFormatList(format?: HowlFormat): string[] {
  if (format) return [format]
  return ['mp4', 'webm', 'mp3']
}

function tryCreateHowl(
  url: string,
  formats: string[],
  html5: boolean,
  volume: number
): Promise<Howl> {
  return new Promise((resolve, reject) => {
    const instance = new Howl({
      src: [url],
      format: formats,
      html5,
      volume,
      onload: () => resolve(instance),
      onloaderror: (_id: number, err: unknown) => {
        instance.unload()
        reject(new Error(typeof err === 'string' && err ? err : '音频加载失败'))
      }
    })
  })
}

export function useMusicPlayer() {
  let howl: Howl | null = null
  let progressTimer: ReturnType<typeof setInterval> | null = null
  const playing = ref(false)
  const progress = ref(0)
  const duration = ref(0)
  const savedVolume = loadMusicVolumePrefs()
  const volume = ref(savedVolume.volume)
  const muted = ref(savedVolume.muted)
  const volumeBeforeMute = ref(savedVolume.volume > 0 ? savedVolume.volume : 0.85)
  let endedHandler: (() => void) | null = null

  function effectiveVolume(): number {
    return muted.value ? 0 : volume.value
  }

  function applyVolumeToHowl(): void {
    howl?.volume(effectiveVolume())
  }

  function clearTimer() {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
  }

  function startTimer() {
    clearTimer()
    progressTimer = setInterval(() => {
      if (!howl) return
      progress.value = howl.seek() as number
      duration.value = howl.duration() || 0
    }, 250)
  }

  function bindHowlEvents(instance: Howl) {
    instance.on('play', () => {
      playing.value = true
      startTimer()
    })
    instance.on('pause', () => {
      playing.value = false
    })
    instance.on('stop', () => {
      playing.value = false
      clearTimer()
    })
    instance.on('end', () => {
      playing.value = false
      clearTimer()
      endedHandler?.()
    })
    instance.on('playerror', () => {
      playing.value = false
    })
  }

  function unload() {
    clearTimer()
    howl?.unload()
    howl = null
    playing.value = false
    progress.value = 0
    duration.value = 0
  }

  function resetProgress(): void {
    progress.value = 0
  }

  function ensurePlaying(instance: Howl): void {
    if (instance.playing()) return
    const soundId = instance.play()
    if (soundId === undefined && !instance.playing()) {
      requestAnimationFrame(() => {
        if (howl === instance && !instance.playing()) instance.play()
      })
    }
  }

  async function load(url: string, format?: HowlFormat, autoplay = false): Promise<void> {
    howl?.pause()
    clearTimer()
    playing.value = false
    progress.value = 0
    duration.value = 0
    const formats = howlFormatList(format)
    const attempts: Array<{ formats: string[]; html5: boolean }> = [
      { formats, html5: true },
      { formats, html5: false },
      { formats: ['mp4', 'webm', 'mp3'], html5: true }
    ]

    let lastError: Error | null = null
    for (const attempt of attempts) {
      try {
        const instance = await tryCreateHowl(
          url,
          attempt.formats,
          attempt.html5,
          effectiveVolume()
        )
        howl?.unload()
        howl = instance
        bindHowlEvents(instance)
        duration.value = instance.duration() ?? 0
        if (autoplay) ensurePlaying(instance)
        return
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('音频加载失败')
      }
    }

    throw lastError ?? new Error('音频加载失败')
  }

  async function loadAndPlay(url: string, format?: HowlFormat): Promise<void> {
    await load(url, format, true)
    if (!howl) return
    howl.seek(0)
    progress.value = 0
    ensurePlaying(howl)
  }

  function play(): Promise<void> {
    if (!howl) return Promise.resolve()
    if (!howl.playing()) howl.play()
    return Promise.resolve()
  }

  function pause(): void {
    howl?.pause()
  }

  function toggle(): void {
    if (!howl) return
    if (howl.playing()) howl.pause()
    else howl.play()
  }

  function stop(): void {
    howl?.stop()
    unload()
  }

  function seek(sec: number): void {
    howl?.seek(sec)
    progress.value = sec
  }

  function setVolume(v: number): void {
    const next = Math.max(0, Math.min(1, v))
    volume.value = next
    if (next > 0) volumeBeforeMute.value = next
    muted.value = next === 0
    applyVolumeToHowl()
  }

  function setVolumePercent(p: number): void {
    setVolume(p / 100)
  }

  function toggleMute(): void {
    if (muted.value) {
      muted.value = false
      volume.value = volumeBeforeMute.value > 0 ? volumeBeforeMute.value : 0.85
    } else {
      volumeBeforeMute.value = volume.value > 0 ? volume.value : 0.85
      muted.value = true
    }
    applyVolumeToHowl()
  }

  function onEnded(cb: () => void): void {
    endedHandler = cb
  }

  watch([volume, muted], () => {
    saveMusicVolumePrefs(volume.value, muted.value)
  })

  onUnmounted(() => {
    unload()
  })

  return {
    playing,
    progress,
    duration,
    volume,
    muted,
    load,
    loadAndPlay,
    play,
    pause,
    toggle,
    stop,
    seek,
    resetProgress,
    setVolume,
    setVolumePercent,
    toggleMute,
    onEnded
  }
}
