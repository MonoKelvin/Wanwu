<script setup lang="ts">
import type { SceneQuality } from '@renderer/types'
import WwIcon from '@shared/components/WwIcon.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
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

const qualityOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
] as const satisfies ReadonlyArray<{ value: SceneQuality; label: string }>
</script>

<template>
  <div class="ww-showroom-toolbar ww-showroom-interactive" role="toolbar" aria-label="展车工具">
    <WwSelect
      :model-value="prefs.quality"
      :options="qualityOptions"
      option-label="label"
      option-value="value"
      size="narrow"
      :overlay-opacity="0.72"
      fit-options
      title="切换后重新进入展车页生效"
      @update:model-value="prefs.setQuality($event as SceneQuality)"
    />

    <button
      v-if="pathTracingSupported"
      type="button"
      class="ww-showroom-path-chip"
      :class="{ 'ww-showroom-path-chip--active': pathTracingActive }"
      :disabled="pathTracingLoading"
      :title="
        pathTracingActive
          ? `路径追踪预览 · ${pathTracingSamples ?? 0} 采样`
          : '路径追踪预览（WebGL）'
      "
      @click="emit('pathTracingToggle')"
    >
      <WwIcon name="sparkles" size="sm" />
      <span v-if="pathTracingActive">{{ pathTracingSamples ?? 0 }}</span>
    </button>

    <button
      type="button"
      class="ww-glass-btn ww-glass-btn--icon"
      title="截图"
      @click="emit('screenshot')"
    >
      <WwIcon name="image" size="sm" />
    </button>

    <button
      type="button"
      class="ww-glass-btn ww-glass-btn--icon"
      :title="prefs.muted ? '取消静音' : '静音'"
      @click="prefs.toggleMute()"
    >
      <WwIcon :name="prefs.muted ? 'volume-x' : 'volume-2'" size="sm" />
    </button>
  </div>
</template>
