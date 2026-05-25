<script setup lang="ts">
import { useOverflowTooltip } from '@shared/composables/useOverflowTooltip'

const props = defineProps<{
  url: string
  /** 截断时在 tooltip 中展示完整地址 */
  showTooltip?: boolean
}>()

const emit = defineEmits<{
  open: [url: string]
}>()

const { el, checkOverflow, tooltip } = useOverflowTooltip(() => props.url)
</script>

<template>
  <button
    type="button"
    class="ww-link-open-url"
    :class="{ 'ww-link-open-url--truncate': showTooltip }"
    :aria-label="`打开链接：${url}`"
    @click.stop="emit('open', url)"
  >
    <span
      ref="el"
      class="ww-link-open-url__label"
      v-tooltip.bottom="showTooltip ? tooltip : undefined"
      @mouseenter="showTooltip && checkOverflow()"
    >
      <slot>{{ url }}</slot>
    </span>
  </button>
</template>

<style>
.ww-link-open-url {
  display: inline-block;
  max-width: 100%;
  width: fit-content;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.35;
  color: var(--ww-ink-muted);
  text-align: left;
  position: relative;
  vertical-align: bottom;
}

.ww-link-open-url__label {
  display: block;
  max-width: 100%;
}

.ww-link-open-url--truncate .ww-link-open-url__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-link-open-url::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-link-open-url:hover {
  color: var(--ww-ink);
}

.ww-link-open-url:hover::after {
  transform: scaleX(1);
}
</style>
