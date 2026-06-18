<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import {
  JOKE_COLD_BUBBLES,
  JOKE_FLAT_BUBBLES,
  pickBubble,
  type JokeReactionKind
} from '@modules/library/leisure-read/domain/reactions'

interface BubbleItem {
  id: number
  kind: JokeReactionKind
  text: string
  offsetX: number
  driftX: number
  blurMax: number
  endY: number
  duration: number
}

const coldBubbles = ref<BubbleItem[]>([])
const flatBubbles = ref<BubbleItem[]>([])
let bubbleId = 0
const timers = new Set<ReturnType<typeof setTimeout>>()

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function spawnBubble(kind: JokeReactionKind) {
  const pool = kind === 'cold' ? JOKE_COLD_BUBBLES : JOKE_FLAT_BUBBLES
  const item: BubbleItem = {
    id: bubbleId++,
    kind,
    text: pickBubble(pool),
    offsetX: Math.round(rand(-28, 28)),
    driftX: Math.round(rand(-36, 36)),
    blurMax: rand(2.5, 7),
    endY: Math.round(rand(-88, -120)),
    duration: rand(2.6, 3.4)
  }
  const list = kind === 'cold' ? coldBubbles : flatBubbles
  list.value = [...list.value, item]
  const timer = setTimeout(() => {
    list.value = list.value.filter((b) => b.id !== item.id)
    timers.delete(timer)
  }, item.duration * 1000 + 120)
  timers.add(timer)
}

function bubbleStyle(item: BubbleItem) {
  return {
    '--lr-bubble-x': `${item.offsetX}px`,
    '--lr-bubble-drift': `${item.driftX}px`,
    '--lr-bubble-blur': `${item.blurMax}px`,
    '--lr-bubble-end-y': `${item.endY}px`,
    '--lr-bubble-dur': `${item.duration}s`
  }
}

onBeforeUnmount(() => {
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
})
</script>

<template>
  <div class="lr-joke-react">
    <div class="lr-joke-react__actions">
      <div class="lr-joke-react__slot">
        <div class="lr-joke-react__bubbles" aria-live="polite">
          <span
            v-for="item in coldBubbles"
            :key="item.id"
            class="lr-joke-react__bubble lr-joke-react__bubble--cold"
            :style="bubbleStyle(item)"
          >
            {{ item.text }}
          </span>
        </div>
        <button
          type="button"
          class="lr-joke-react__btn lr-joke-react__btn--cold"
          v-tooltip.bottom="'有被冷到'"
          aria-label="有被冷到"
          @click="spawnBubble('cold')"
        >
          <span aria-hidden="true">🥶</span>
        </button>
      </div>
      <div class="lr-joke-react__slot">
        <div class="lr-joke-react__bubbles" aria-live="polite">
          <span
            v-for="item in flatBubbles"
            :key="item.id"
            class="lr-joke-react__bubble lr-joke-react__bubble--flat"
            :style="bubbleStyle(item)"
          >
            {{ item.text }}
          </span>
        </div>
        <button
          type="button"
          class="lr-joke-react__btn lr-joke-react__btn--flat"
          v-tooltip.bottom="'毫无波澜'"
          aria-label="毫无波澜"
          @click="spawnBubble('flat')"
        >
          <span aria-hidden="true">😑</span>
        </button>
      </div>
    </div>
  </div>
</template>
