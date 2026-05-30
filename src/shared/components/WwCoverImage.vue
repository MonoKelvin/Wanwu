<script setup lang="ts">
import { ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    iconSize?: 'sm' | 'md' | 'lg'
    placeholderText?: string
  }>(),
  {
    iconSize: 'md',
    placeholderText: '暂无配图'
  }
)

const loadFailed = ref(false)

watch(
  () => props.src,
  () => {
    loadFailed.value = false
  }
)

function onError() {
  loadFailed.value = true
}
</script>

<template>
  <img
    v-if="src && !loadFailed"
    :src="src"
    :alt="alt ?? ''"
    class="ww-cover-image__img"
    loading="lazy"
    v-bind="$attrs"
    @error="onError"
  />
  <span v-else class="ww-cover-image__placeholder" v-bind="$attrs" aria-hidden="true">
    <WwIcon name="image" :size="iconSize" />
    <span v-if="placeholderText" class="ww-cover-image__placeholder-text">{{ placeholderText }}</span>
  </span>
</template>

<style>
.ww-cover-image__img,
.ww-cover-image__placeholder {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ww-cover-image__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  background: var(--ww-inset);
  color: var(--ww-ink-faint);
  font-size: 0.6875rem;
}

.ww-cover-image__placeholder-text {
  opacity: 0.85;
}
</style>
