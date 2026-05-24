<script setup lang="ts">
defineProps<{
  progress: number
  visible: boolean
}>()
</script>

<template>
  <Transition name="ww-fade">
    <div
      v-if="visible"
      class="ww-showroom-preloader pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"
    >
      <p class="mb-2 text-sm" style="color: var(--ww-on-media-fg-muted)">加载展车资源</p>
      <p class="text-3xl font-semibold tabular-nums">{{ Math.round(progress * 100) }}%</p>
      <div class="ww-showroom-preloader__bar mt-4 w-48 overflow-hidden rounded-full">
        <div
          class="ww-showroom-preloader__bar-fill"
          :style="{ width: `${Math.min(100, Math.round(progress * 100))}%` }"
        />
      </div>
    </div>
  </Transition>
</template>
