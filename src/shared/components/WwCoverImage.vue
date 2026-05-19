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
