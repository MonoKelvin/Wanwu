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
