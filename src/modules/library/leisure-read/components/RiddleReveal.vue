<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  question: string
  answer: string
}>()

const revealed = ref(false)

watch(
  () => props.question,
  () => {
    revealed.value = false
  }
)

function reveal() {
  revealed.value = true
}
</script>

<template>
  <div class="lr-riddle">
    <p class="lr-riddle__question">{{ question }}</p>
    <button v-if="!revealed" type="button" class="lr-riddle__reveal" @click="reveal">
      点击揭晓答案
    </button>
    <p v-else class="lr-riddle__answer">答案：{{ answer }}</p>
  </div>
</template>

<style scoped>
.lr-riddle__question {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.75;
}

.lr-riddle__reveal {
  align-self: flex-start;
  margin-top: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px dashed var(--ww-border-subtle, rgba(128, 128, 128, 0.35));
  background: transparent;
  cursor: pointer;
  color: var(--ww-accent, #6366f1);
}

.lr-riddle__answer {
  margin: 0.75rem 0 0;
  color: var(--ww-text-secondary);
}
</style>
