<script setup lang="ts">
defineOptions({ name: 'LibraryView' })

import { computed } from 'vue'
import { initDiagramCatalogCommandBus } from '@shared/stores/diagrams'
import { RouterView, useRoute } from 'vue-router'
import { isLibraryMajorId } from '@modules/library/core/config/majors'

const route = useRoute()

// 须在子路由 setup 之前完成（DiagramHomeView 等会同步 inject）
initDiagramCatalogCommandBus()

/** 链接/图鉴大分类切换须 remount 内层 RouterView（便笺已提升为 /notes 顶层路由） */
const libraryChildOutletKey = computed(() => {
  const major = route.meta.major
  if (typeof major === 'string' && isLibraryMajorId(major)) return major
  return String(route.name ?? route.path)
})
</script>

<template>
  <!-- 与 SettingsView / RssView 一致：承接 AppShell flex 高度，避免 KeepAlive 切换后子路由区域坍缩 -->
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <RouterView v-slot="{ Component }">
      <component
        :is="Component"
        v-if="Component"
        :key="libraryChildOutletKey"
        class="min-h-0 flex-1"
      />
    </RouterView>
  </div>
</template>
