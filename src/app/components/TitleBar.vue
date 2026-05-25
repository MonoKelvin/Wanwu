<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const isMaximized = ref(false)

let unsubscribe: (() => void) | undefined

onMounted(async () => {
  isMaximized.value = await window.wanwu.window.isMaximized()
  unsubscribe = window.wanwu.window.onMaximizedChange((maximized) => {
    isMaximized.value = maximized
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

async function minimize() {
  await window.wanwu.window.minimize()
}

async function toggleMaximize() {
  isMaximized.value = await window.wanwu.window.toggleMaximize()
}

async function closeWin() {
  await window.wanwu.window.close()
}
</script>

<template>
  <header class="ww-titlebar" aria-label="窗口">
    <div class="ww-titlebar-drag" @dblclick="toggleMaximize" />

    <div class="ww-titlebar-controls">
      <button type="button" class="ww-win-btn" title="最小化" aria-label="最小化" @click="minimize">
        <svg class="ww-win-icon" viewBox="0 0 12 12" aria-hidden="true">
          <rect x="1" y="5.25" width="10" height="1" rx="0.5" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        class="ww-win-btn"
        :title="isMaximized ? '还原' : '最大化'"
        :aria-label="isMaximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <svg v-if="!isMaximized" class="ww-win-icon" viewBox="0 0 12 12" aria-hidden="true">
          <rect
            x="1.5"
            y="1.5"
            width="9"
            height="9"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            rx="0.25"
          />
        </svg>
        <svg v-else class="ww-win-icon" viewBox="0 0 12 12" aria-hidden="true">
          <rect
            x="3.5"
            y="1.5"
            width="7"
            height="7"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            rx="0.25"
          />
          <rect
            x="1.5"
            y="3.5"
            width="7"
            height="7"
            fill="var(--ww-canvas)"
            stroke="currentColor"
            stroke-width="1"
            rx="0.25"
          />
        </svg>
      </button>
      <button
        type="button"
        class="ww-win-btn ww-win-btn--close"
        title="关闭"
        aria-label="关闭"
        @click="closeWin"
      >
        <svg class="ww-win-icon" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 2.5l7 7M9.5 2.5l-7 7"
            stroke="currentColor"
            stroke-width="1"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </header>
</template>
<style>
.ww-titlebar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  height: var(--ww-titlebar-height);
  align-items: stretch;
  pointer-events: none;
  user-select: none;
  background: transparent;
}

.ww-titlebar-drag {
  min-width: 0;
  flex: 1;
  -webkit-app-region: drag;
  app-region: drag;
  pointer-events: auto;
}

.ww-titlebar-controls {
  display: flex;
  flex-shrink: 0;
  align-items: stretch;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  pointer-events: auto;
}

.ww-win-btn {
  display: inline-flex;
  width: 2.5rem;
  height: var(--ww-titlebar-height);
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-win-btn:hover:not(.ww-win-btn--close) {
  background: var(--ww-list-hover-bg);
  color: var(--ww-ink);
}

.ww-win-btn--close {
  background: transparent;
}

.ww-win-btn--close:hover {
  background: #c42b1c;
  color: #fff;
}

.ww-win-icon {
  display: block;
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}
</style>
