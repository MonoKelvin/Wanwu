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
      class="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white"
    >
      <p class="mb-2 text-sm text-white/70">加载展车资源</p>
      <p class="text-3xl font-semibold tabular-nums">{{ Math.round(progress * 100) }}%</p>
      <div class="mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/20">
        <div
          class="h-full bg-orange-400 transition-all duration-200"
          :style="{ width: `${Math.min(100, Math.round(progress * 100))}%` }"
        />
      </div>
    </div>
  </Transition>
</template>
