<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import type { ModuleId } from '@shared/stores/app'

const router = useRouter()
const route = useRoute()

const modules: Array<{ id: ModuleId; label: string; icon: string; path: string }> = [
  { id: 'library', label: '全库', icon: 'pi pi-database', path: '/library' },
  { id: 'rss', label: 'RSS', icon: 'pi pi-rss', path: '/rss' },
  { id: 'custom', label: '自建', icon: 'pi pi-folder', path: '/custom' },
  { id: 'personal', label: '个人', icon: 'pi pi-user', path: '/personal' },
  { id: 'settings', label: '设置', icon: 'pi pi-cog', path: '/settings' }
]

function navigate(path: string) {
  router.push(path)
}

function isActive(id: ModuleId) {
  return route.meta.module === id
}
</script>

<template>
  <nav
    class="flex w-[var(--ww-sidebar-width)] flex-col items-center gap-1 border-r border-ww-border bg-ww-bg py-4"
    aria-label="模块导航"
  >
    <div class="mb-6 text-xs font-medium tracking-widest text-ww-muted" style="writing-mode: vertical-rl">
      万物
    </div>
    <button
      v-for="m in modules"
      :key="m.id"
      type="button"
      class="flex w-full flex-col items-center gap-1 px-2 py-3 text-xs transition-colors duration-ww"
      :class="isActive(m.id) ? 'bg-ww-bg-subtle text-ww-text' : 'text-ww-muted hover:bg-ww-bg-subtle hover:text-ww-text'"
      :title="m.label"
      @click="navigate(m.path)"
    >
      <i :class="m.icon" class="text-lg" />
      <span>{{ m.label }}</span>
    </button>
  </nav>
</template>
