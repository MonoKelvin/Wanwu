<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  text: string
  active?: boolean
}>()

/** 双圈 0–9，便于滚出时多转一圈再落回同一数字 */
const DIGIT_CYCLE = '01234567890123456789'

type StaticPart = { kind: 'static'; char: string }
type DigitPart = {
  kind: 'digit'
  target: number
  delay: number
  /** 在 DIGIT_CYCLE 中的行索引，稳定态 = target */
  scrollIndex: number
}

type Part = StaticPart | DigitPart

const parts = ref<Part[]>([])
const isAnimating = ref(false)
const prefersReducedMotion = ref(false)

let pendingLeave = 0

function buildParts(text: string): Part[] {
  const out: Part[] = []
  let delay = 0
  for (const char of text) {
    if (char >= '0' && char <= '9') {
      const target = Number(char)
      out.push({ kind: 'digit', target, delay, scrollIndex: target })
      delay += 55
    } else {
      out.push({ kind: 'static', char })
    }
  }
  return out
}

function digitParts(): DigitPart[] {
  return parts.value.filter((p): p is DigitPart => p.kind === 'digit')
}

function settleAllDigits() {
  for (const p of digitParts()) {
    p.scrollIndex = p.target
  }
}

function parseText() {
  parts.value = buildParts(props.text)
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  parseText()
})

watch(
  () => props.text,
  () => {
    parseText()
  }
)

async function playRollIn() {
  if (prefersReducedMotion.value) {
    settleAllDigits()
    return
  }
  const digits = digitParts()
  if (!digits.length) return

  isAnimating.value = false
  for (const d of digits) {
    d.scrollIndex = 0
  }

  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

  isAnimating.value = true
  for (const d of digits) {
    d.scrollIndex = d.target
  }
}

async function playRollOut() {
  if (prefersReducedMotion.value) {
    settleAllDigits()
    return
  }
  const digits = digitParts()
  if (!digits.length) return

  pendingLeave = digits.length
  isAnimating.value = true
  for (const d of digits) {
    d.scrollIndex = d.target + 10
  }
}

function onStripTransitionEnd(e: TransitionEvent) {
  if (e.propertyName !== 'transform' || !isAnimating.value) return

  const digits = digitParts()
  if (!digits.length) return

  if (props.active) {
    const allSettled = digits.every((d) => d.scrollIndex === d.target)
    if (allSettled) {
      isAnimating.value = false
    }
    return
  }

  pendingLeave -= 1
  if (pendingLeave > 0) return

  isAnimating.value = false
  settleAllDigits()
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      void playRollIn()
      return
    }
    void playRollOut()
  }
)

</script>

<template>
  <span class="ww-rolling-text" :aria-label="text">
    <template v-for="(part, i) in parts" :key="i">
      <span v-if="part.kind === 'static'" class="ww-rolling-text__static">{{ part.char }}</span>
      <span v-else class="ww-rolling-text__slot" :style="{ '--ww-roll-delay': `${part.delay}ms` }">
        <span
          class="ww-rolling-text__strip"
          :class="{ 'is-animating': isAnimating }"
          :style="{ '--ww-roll-index': part.scrollIndex }"
          @transitionend="onStripTransitionEnd"
        >
          <span v-for="(d, di) in DIGIT_CYCLE" :key="`${i}-${di}`" class="ww-rolling-text__digit">
            {{ d }}
          </span>
        </span>
      </span>
    </template>
  </span>
</template>

<style scoped>
.ww-rolling-text {
  display: inline-flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.ww-rolling-text__static {
  display: inline-block;
}

.ww-rolling-text__slot {
  display: inline-block;
  height: 1em;
  overflow: hidden;
  vertical-align: baseline;
}

.ww-rolling-text__strip {
  display: flex;
  flex-direction: column;
  transform: translateY(calc(var(--ww-roll-index, 0) * -1em));
  will-change: transform;
}

.ww-rolling-text__strip.is-animating {
  transition: transform 0.68s cubic-bezier(0.22, 1.12, 0.36, 1);
  transition-delay: var(--ww-roll-delay, 0ms);
}

.ww-rolling-text__digit {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1em;
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .ww-rolling-text__strip.is-animating {
    transition: none !important;
  }
}
</style>
