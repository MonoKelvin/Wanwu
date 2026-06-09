<script setup lang="ts">
import WwIcon from '@shared/components/WwIcon.vue'

const props = defineProps<{
  title: string
  expanded: boolean
  count?: number
  icon?: string
  variant?: 'default' | 'recent' | 'recommend'
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <section
    class="dg-shape-section"
    :class="{
      'dg-shape-section--recent': variant === 'recent',
      'dg-shape-section--recommend': variant === 'recommend'
    }"
  >
    <button
      type="button"
      class="dg-shape-section__head"
      :aria-expanded="expanded"
      @click="emit('toggle')"
    >
      <WwIcon
        name="chevron-right"
        size="sm"
        class="dg-shape-section__chevron"
        :class="{ 'dg-shape-section__chevron--open': expanded }"
        aria-hidden="true"
      />
      <WwIcon
        v-if="icon"
        :name="icon"
        size="sm"
        class="dg-shape-section__icon"
        aria-hidden="true"
      />
      <span class="dg-shape-section__title">{{ title }}</span>
      <span v-if="count != null" class="dg-shape-section__count">{{ count }}</span>
    </button>
    <div v-show="expanded" class="dg-shape-section__body">
      <slot />
    </div>
  </section>
</template>
