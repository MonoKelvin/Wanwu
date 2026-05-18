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
  <header class="ww-titlebar">
    <div class="ww-titlebar-drag" @dblclick="toggleMaximize">
      <span class="ww-titlebar-logo">万</span>
      <span class="ww-titlebar-title">万物</span>
    </div>

    <div class="ww-titlebar-controls">
      <button
        type="button"
        class="ww-win-btn"
        title="最小化"
        aria-label="最小化"
        @click="minimize"
      >
        <span class="ww-win-glyph ww-win-glyph--min" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="ww-win-btn"
        :title="isMaximized ? '还原' : '最大化'"
        :aria-label="isMaximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <span
          class="ww-win-glyph"
          :class="isMaximized ? 'ww-win-glyph--restore' : 'ww-win-glyph--max'"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        class="ww-win-btn ww-win-btn--close"
        title="关闭"
        aria-label="关闭"
        @click="closeWin"
      >
        <span class="ww-win-glyph ww-win-glyph--close" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
