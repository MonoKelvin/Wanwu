<script setup lang="ts">
defineOptions({ name: 'CaFxParticles' })

const props = withDefaults(
  defineProps<{
    /** 粒子数量 */
    count?: number
    /** subtle | rich */
    density?: 'subtle' | 'rich'
  }>(),
  { count: 16, density: 'subtle' }
)

function dotStyle(i: number) {
  const n = i + 1
  const left = (n * 37 + 11) % 94 + 3
  const top = (n * 53 + 7) % 92 + 4
  const delay = -((n * 0.65) % 14)
  const duration = 9 + (n % 7)
  const size = props.density === 'rich' ? 2 + (n % 4) : 1.5 + (n % 2.5)
  const opacity = 0.25 + (n % 5) * 0.08
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    opacity,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  } as const
}

const indices = () => Array.from({ length: props.count }, (_, i) => i)
</script>

<template>
  <div class="ww-ca-fx-particles" :class="`ww-ca-fx-particles--${density}`" aria-hidden="true">
    <span
      v-for="i in indices()"
      :key="i"
      class="ww-ca-fx-particles__dot"
      :style="dotStyle(i)"
    />
  </div>
</template>
