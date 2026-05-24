import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SceneQuality } from '@renderer/types'

const STORAGE_KEY = 'wanwu:cloud-abode:showroom-prefs'

interface StoredPrefs {
  muted?: boolean
  quality?: SceneQuality
  pathTracingPreview?: boolean
}

function readPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredPrefs) : {}
  } catch {
    return {}
  }
}

function writePrefs(prefs: StoredPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export const useShowroomPrefsStore = defineStore('showroomPrefs', () => {
  const stored = readPrefs()
  const muted = ref(stored.muted ?? true)
  const quality = ref<SceneQuality>(stored.quality ?? 'high')
  const pathTracingPreview = ref(stored.pathTracingPreview ?? false)

  function persist(): void {
    writePrefs({
      muted: muted.value,
      quality: quality.value,
      pathTracingPreview: pathTracingPreview.value
    })
  }

  function toggleMute(): void {
    muted.value = !muted.value
    persist()
  }

  function setQuality(value: SceneQuality): void {
    quality.value = value
    persist()
  }

  function setPathTracingPreview(value: boolean): void {
    pathTracingPreview.value = value
    persist()
  }

  return {
    muted,
    quality,
    pathTracingPreview,
    toggleMute,
    setQuality,
    setPathTracingPreview
  }
})
