<script setup lang="ts">
defineOptions({ name: 'LibraryView' })

import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <!-- 与 SettingsView / RssView 一致：承接 AppShell flex 高度，避免 KeepAlive 切换后子路由区域坍缩 -->
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <!--
      父级在 AppShell 中被 KeepAlive 缓存；子路由（便笺/链接/图鉴）须带 key，
      否则切换大分类时内层视图不更新。
    -->
    <RouterView v-slot="{ Component }">
      <component
        :is="Component"
        :key="route.fullPath"
        class="min-h-0 flex-1"
      />
    </RouterView>
  </div>
</template>
