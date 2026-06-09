<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import {
  diagramTemplateArtMarkup,
  type DiagramTemplateArtVariant
} from '@modules/library/diagrams/lib/diagramTemplateArt'

const props = defineProps<{
  name: string
  variant: DiagramTemplateArtVariant
}>()

defineEmits<{ click: [] }>()

const artMarkup = computed(() => diagramTemplateArtMarkup(props.variant))
</script>

<template>
  <button type="button" class="dg-type-card" @click="$emit('click')">
    <span class="dg-type-card__art" aria-hidden="true">
      <span class="dg-type-card__svg" :class="{ 'dg-type-card__svg--blank': variant === 'blank' }" v-html="artMarkup" />
    </span>

    <span v-if="variant === 'blank'" class="dg-type-card__plus" aria-hidden="true">
      <WwIcon name="plus" size="md" />
    </span>

    <span class="dg-type-card__name">{{ name }}</span>
  </button>
</template>
