<script setup lang="ts">
import { useOverflowTooltip } from '@shared/composables/useOverflowTooltip'

const props = withDefaults(
  defineProps<{
    text: string
    /** 渲染标签，默认 span */
    as?: string
  }>(),
  { as: 'span' }
)

const { el, checkOverflow, tooltip } = useOverflowTooltip(() => props.text)
</script>

<template>
  <component
    :is="as"
    ref="el"
    class="ww-truncated-text"
    v-tooltip.bottom="tooltip"
    @mouseenter="checkOverflow"
  >
    {{ text }}
  </component>
</template>

<style>
.ww-truncated-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-tooltip.ww-tooltip-text-wrap {
  max-width: 80vw;
  width: fit-content;
}

.p-tooltip.ww-tooltip-text-wrap .p-tooltip-text {
  display: block;
  box-sizing: border-box;
  max-width: 80vw;
  width: max-content;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
  line-height: 1.45;
}
</style>
