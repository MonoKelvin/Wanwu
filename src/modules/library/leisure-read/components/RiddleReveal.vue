<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import { readLeisureReadModuleSettings } from '@modules/library/leisure-read/domain/settings'
import WwIcon from '@shared/components/WwIcon.vue'

const props = defineProps<{
  question: string
  answer: string
}>()

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const thinkDelaySec = computed(
  () => readLeisureReadModuleSettings(settings.value).riddleThinkDelay
)

const revealed = ref(false)
const canReveal = ref(false)
const remainSec = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startThinkCountdown() {
  clearTimer()
  revealed.value = false
  canReveal.value = thinkDelaySec.value === 0
  remainSec.value = thinkDelaySec.value

  if (thinkDelaySec.value === 0) return

  timer = setInterval(() => {
    remainSec.value -= 1
    if (remainSec.value <= 0) {
      canReveal.value = true
      clearTimer()
    }
  }, 1000)
}

function reveal() {
  if (!canReveal.value) return
  revealed.value = true
}

function hide() {
  revealed.value = false
}

watch(
  () => props.question,
  () => startThinkCountdown(),
  { immediate: true }
)

watch(thinkDelaySec, () => startThinkCountdown())

onMounted(() => {
  if (!settingsStore.loaded) void settingsStore.load()
})

onBeforeUnmount(clearTimer)
</script>

<template>
  <div class="lr-riddle">
    <p class="lr-riddle__question">{{ question }}</p>
    <div class="lr-riddle__stage">
      <div class="lr-riddle__think" :class="{ 'is-hidden': revealed }">
        <button
          type="button"
          class="lr-riddle__reveal"
          :class="{ 'is-ready': canReveal }"
          :disabled="!canReveal"
          @click="reveal"
        >
          <WwIcon name="eye" size="xs" />
          <span v-if="canReveal">查看谜底</span>
          <span v-else>思考中 {{ remainSec }}s</span>
        </button>
        <div v-if="!canReveal && thinkDelaySec > 0" class="lr-riddle__progress">
          <span
            class="lr-riddle__progress-bar"
            :style="{ '--lr-think-total': `${thinkDelaySec}s` }"
          />
        </div>
      </div>
      <div class="lr-riddle__answer" :class="{ 'is-visible': revealed }">
        <div class="lr-riddle__answer-head">
          <span class="lr-riddle__answer-label">谜底</span>
          <button
            type="button"
            class="lr-riddle__hide"
            aria-label="隐藏谜底"
            @click="hide"
          >
            <WwIcon name="eye-off" size="xs" />
          </button>
        </div>
        <p class="lr-riddle__answer-text">{{ answer }}</p>
      </div>
    </div>
  </div>
</template>
