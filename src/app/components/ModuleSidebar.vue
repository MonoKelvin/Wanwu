<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import type { ModuleId } from '@shared/stores/app'

const router = useRouter()
const route = useRoute()
const { settings } = storeToRefs(useSettingsStore())

const modules: Array<{ id: ModuleId; label: string; icon: string; path: string }> = [
  { id: 'library', label: '全库', icon: 'pi pi-database', path: '/library' },
  { id: 'rss', label: 'RSS', icon: 'pi pi-globe', path: '/rss' },
  { id: 'custom', label: '自建', icon: 'pi pi-folder', path: '/custom' },
  { id: 'personal', label: '个人', icon: 'pi pi-user', path: '/personal' },
  { id: 'settings', label: '设置', icon: 'pi pi-cog', path: '/settings' }
]

const showLabel = computed(() => settings.value.navDisplay === 'both')
const useTooltip = computed(() => !showLabel.value)
const navAlignClass = computed(() =>
  settings.value.navAlign === 'center' ? 'ww-module-nav--center' : 'ww-module-nav--start'
)

function navigate(path: string) {
  router.push(path)
}

function isActive(id: ModuleId) {
  return route.meta.module === id
}
</script>

<template>
  <nav
    class="ww-module-nav h-full shrink-0 bg-ww-rail"
    :class="navAlignClass"
    aria-label="模块"
  >
    <div class="ww-module-nav__group">
      <button
        v-for="m in modules"
        :key="m.id"
        v-tooltip.right="useTooltip ? m.label : undefined"
        type="button"
        class="ww-module-btn"
        :class="{
          'is-active': isActive(m.id),
          'ww-module-btn--labeled': showLabel
        }"
        :aria-label="m.label"
        :aria-current="isActive(m.id) ? 'page' : undefined"
        @click="navigate(m.path)"
      >
        <i :class="m.icon" aria-hidden="true" />
        <span v-if="showLabel" class="ww-module-btn__label">{{ m.label }}</span>
      </button>
    </div>
  </nav>
</template>
