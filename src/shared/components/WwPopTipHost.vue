<script setup lang="ts">
import { usePopTipMessage } from '@shared/composables/usePopTip'

defineOptions({ name: 'WwPopTipHost' })

const message = usePopTipMessage()
</script>

<template>
  <Teleport to="body">
    <Transition name="ww-pop-tip">
      <p v-if="message" class="ww-pop-tip" role="status" aria-live="polite">
        {{ message }}
      </p>
    </Transition>
  </Teleport>
</template>
<style>
/* 顶部居中胶囊轻提示（WwPopTipHost） */

.ww-pop-tip {
  position: fixed;
  top: calc(var(--ww-titlebar-height, 2rem) + 3.25rem);
  left: 50%;
  z-index: 120;
  margin: 0;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  white-space: nowrap;
  color: var(--ww-ink);
  border: 1px solid var(--ww-glass-border);
  border-radius: 999px;
  background: var(--ww-glass-bg-soft);
  box-shadow: var(--ww-shadow-soft);
  transform: translateX(-50%);
  pointer-events: none;
}

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .ww-pop-tip {
    backdrop-filter: blur(16px) saturate(1.35);
    -webkit-backdrop-filter: blur(16px) saturate(1.35);
  }
}

.ww-pop-tip-enter-active,
.ww-pop-tip-leave-active {
  transition:
    opacity var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-pop-tip-enter-from,
.ww-pop-tip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
