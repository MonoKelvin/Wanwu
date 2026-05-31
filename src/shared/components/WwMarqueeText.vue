<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    tag?: 'span' | 'p' | 'div'
  }>(),
  { tag: 'span' }
)

const rootRef = ref<HTMLElement | null>(null)
const scroll = ref(false)

async function measure() {
  await nextTick()
  const root = rootRef.value
  if (!root) return
  const track = root.querySelector('.ww-marquee-text__track') as HTMLElement | null
  const inner = root.querySelector('.ww-marquee-text__inner') as HTMLElement | null
  if (!track || !inner) return
  scroll.value = inner.scrollWidth > track.clientWidth + 2
}

watch(() => props.text, () => void measure())
onMounted(() => void measure())
</script>

<template>
  <component :is="tag" ref="rootRef" class="ww-marquee-text" :class="{ 'is-scroll': scroll }">
    <span class="ww-marquee-text__track">
      <span class="ww-marquee-text__inner">{{ text }}</span>
      <span v-if="scroll" class="ww-marquee-text__inner ww-marquee-text__gap" aria-hidden="true">{{
        text
      }}</span>
    </span>
  </component>
</template>

<style scoped>
.ww-marquee-text {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.ww-marquee-text__track {
  display: inline-flex;
  max-width: 100%;
  white-space: nowrap;
}

.ww-marquee-text__inner {
  display: inline-block;
  white-space: nowrap;
}

.ww-marquee-text.is-scroll .ww-marquee-text__track {
  animation: ww-marquee-scroll 14s linear infinite;
}

.ww-marquee-text.is-scroll:hover .ww-marquee-text__track {
  animation-play-state: paused;
}

.ww-marquee-text__gap {
  padding-left: 2.5rem;
}

@keyframes ww-marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-50% - 1.25rem));
  }
}
</style>
