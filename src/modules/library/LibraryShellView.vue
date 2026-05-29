<script setup lang="ts">
defineOptions({ name: 'LibraryView' })

import { RouterView } from 'vue-router'
</script>

<template>
  <!-- 与 SettingsView / RssView 一致：承接 AppShell flex 高度，避免 KeepAlive 切换后子路由区域坍缩 -->
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <RouterView class="min-h-0 flex-1" />
  </div>
</template>
