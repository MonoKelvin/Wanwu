<script setup lang="ts">
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon: WwIconName
    iconSize?: 'xs' | 'sm' | 'md' | 'lg' | number
    /** 无障碍标签 */
    ariaLabel: string
    /** 紧凑尺寸（链接卡片/列表操作区） */
    compact?: boolean
  }>(),
  {
    iconSize: 'sm',
    compact: false
  }
)
</script>

<template>
  <button
    type="button"
    class="ww-icon-btn-plain"
    :class="{ 'ww-icon-btn-plain--compact': compact }"
    v-bind="$attrs"
    :aria-label="ariaLabel"
  >
    <WwIcon :name="icon" :size="iconSize" />
  </button>
</template>

<style>
.ww-icon-btn-plain {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  background: transparent !important;
  color: var(--ww-ink-muted);
  cursor: pointer;
  box-shadow: none !important;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-icon-btn-plain--compact {
  width: 1.75rem;
  height: 1.75rem;
}

.ww-icon-btn-plain:hover:not(:disabled),
.ww-icon-btn-plain:focus-visible:not(:disabled) {
  background: transparent !important;
  color: var(--ww-ink);
  box-shadow: none !important;
}

.ww-icon-btn-plain:focus-visible {
  outline: 2px solid var(--ww-accent-soft);
  outline-offset: 1px;
}

.ww-icon-btn-plain:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
