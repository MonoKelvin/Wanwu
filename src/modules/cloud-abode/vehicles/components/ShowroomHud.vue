<script setup lang="ts">
import { Camera, Sparkles, Volume2, VolumeX } from '@lucide/vue'
import type { SceneQuality } from '@renderer/types'
import { useShowroomPrefsStore } from '../stores/showroomPrefs'

defineProps<{
  pathTracingSupported?: boolean
  pathTracingActive?: boolean
  pathTracingSamples?: number
  pathTracingLoading?: boolean
}>()

const emit = defineEmits<{
  screenshot: []
  pathTracingToggle: []
}>()

const prefs = useShowroomPrefsStore()

const qualityOptions: { value: SceneQuality; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
]
</script>

<template>
  <div class="pointer-events-auto flex items-center gap-2">
    <select
      :value="prefs.quality"
      class="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-[11px] text-white/80 outline-none"
      title="切换后重新进入展车页生效"
      @change="prefs.setQuality(($event.target as HTMLSelectElement).value as SceneQuality)"
    >
      <option
        v-for="opt in qualityOptions"
        :key="opt.value"
        :value="opt.value"
      >
        画质 {{ opt.label }}
      </option>
    </select>
    <button
      v-if="pathTracingSupported"
      type="button"
      class="flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition"
      :class="
        pathTracingActive
          ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
          : 'border-white/15 bg-black/50 text-white/80 hover:bg-white/10'
      "
      :disabled="pathTracingLoading"
      :title="
        pathTracingActive
          ? `路径追踪预览 · ${pathTracingSamples ?? 0} 采样`
          : '路径追踪预览（WebGL）'
      "
      @click="emit('pathTracingToggle')"
    >
      <Sparkles class="h-3.5 w-3.5 shrink-0" />
      <span v-if="pathTracingActive">{{ pathTracingSamples ?? 0 }}</span>
    </button>
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 transition hover:bg-white/10"
      title="截图"
      @click="emit('screenshot')"
    >
      <Camera class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 transition hover:bg-white/10"
      :title="prefs.muted ? '取消静音' : '静音'"
      @click="prefs.toggleMute()"
    >
      <VolumeX v-if="prefs.muted" class="h-4 w-4" />
      <Volume2 v-else class="h-4 w-4" />
    </button>
  </div>
</template>
