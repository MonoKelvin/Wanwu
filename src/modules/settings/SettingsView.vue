<script setup lang="ts">
import { onMounted, ref } from 'vue'

const paths = ref<{ userData: string; wanwu: string } | null>(null)

onMounted(async () => {
  paths.value = await window.wanwu.app.getPaths()
})
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <header class="border-b border-ww-border px-6 py-4">
      <h1 class="text-lg font-medium">设置</h1>
      <p class="text-xs text-ww-muted">应用偏好、关于与协议</p>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <section class="mb-8 max-w-xl">
        <h2 class="mb-3 text-sm font-medium">关于万物</h2>
        <p class="text-sm text-ww-muted">版本 v1.0.0</p>
        <p class="mt-2 text-sm leading-relaxed text-ww-muted">
          万物是一款用于收集与浏览事物的桌面应用。数据默认存储在本地。
        </p>
      </section>

      <section class="mb-8 max-w-xl">
        <h2 class="mb-3 text-sm font-medium">数据目录</h2>
        <p v-if="paths" class="break-all font-mono text-xs text-ww-muted">{{ paths.wanwu }}</p>
      </section>

      <section class="mb-8 max-w-xl">
        <h2 class="mb-3 text-sm font-medium">安全</h2>
        <p class="text-xs text-ww-muted">数据库加密（SQLCipher）将在后续版本启用。</p>
      </section>

      <section class="max-w-xl">
        <h2 class="mb-3 text-sm font-medium">开源</h2>
        <a
          href="https://github.com/MonoKelvin/Wanwu"
          class="text-sm underline"
          target="_blank"
          rel="noopener"
        >
          github.com/MonoKelvin/Wanwu
        </a>
      </section>
    </div>
  </div>
</template>
