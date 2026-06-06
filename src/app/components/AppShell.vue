<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import ModuleSidebar from '@app/components/ModuleSidebar.vue'
import SubItemPanel from '@app/components/SubItemPanel.vue'
import { useRouteModule } from '@app/composables/useRouteModule'
import { useShellModule } from '@app/composables/useShellModule'
import { moduleViewComponent } from '@app/shell/moduleShell'
import { isDiagramEditorRoute } from '@modules/library/diagrams/domain/diagramRoutes'
import DiagramEditorView from '@modules/library/diagrams/views/DiagramEditorView.vue'
import { LIBRARY_NOTES_ROUTE } from '@modules/library/notes/domain/noteRoutes'
import { mvPageActive } from '@modules/music/lib/musicMvOverlayState'
import { useAppStore } from '@shared/stores/app'
import { useSettingsStore } from '@shared/stores/settings'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

const NotesView = defineAsyncComponent(
  () => import('@modules/library/notes/views/NotesView.vue')
)
const ItemDetailView = defineAsyncComponent(
  () => import('@modules/item/ItemDetailView.vue')
)
const MusicMiniBar = defineAsyncComponent(
  () => import('@modules/music/player/MusicMiniBar.vue')
)

const route = useRoute()
const routeModule = useRouteModule()
const shellModule = useShellModule()
const appStore = useAppStore()
const isItemDetail = computed(() => isItemDetailRoute(route.name))
const isNotesRoute = computed(() => route.name === LIBRARY_NOTES_ROUTE)
const showDiagramEditor = computed(() => isDiagramEditorRoute(route.name, route.path))
const diagramEditorKey = computed(
  () => `diagrams-editor:${String(route.params.fileId)}:${String(route.query.template ?? '')}`
)
const itemDetailShell = computed(() => moduleViewComponent(shellModule.value))

const activeShellKey = computed(() => {
  if (isItemDetail.value) return `item:${shellModule.value}`
  if (isDiagramEditorRoute(route.name, route.path)) {
    return diagramEditorKey.value
  }
  if (route.meta.module === 'library') {
    return `library#${appStore.shellOutletRevision}`
  }
  return `${route.fullPath}#${appStore.shellOutletRevision}`
})

const settingsStore = useSettingsStore()
const isFullscreen = computed(() => !!route.meta.fullscreen)
const minibarHidden = computed(() => mvPageActive.value)
const showMusicBar = computed(
  () => routeModule.value === 'music' && !isFullscreen.value && !minibarHidden.value
)

const showSubPanel = computed(() => {
  if (isItemDetail.value || isFullscreen.value || route.meta.hideSubPanel) return false
  const mod = routeModule.value
  return mod === 'library' || mod === 'rss'
})

watch(
  routeModule,
  (m) => {
    if (!m) return
    appStore.setModule(m)
    if (settingsStore.loaded) void settingsStore.patchLastActiveModule(m)
  },
  { immediate: true }
)

watch(showDiagramEditor, (active, wasActive) => {
  if (wasActive && !active) {
    appStore.bumpShellOutlet()
  }
})
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-ww-canvas text-color">
    <ModuleSidebar v-show="!isFullscreen" />
    <SubItemPanel v-if="showSubPanel" class="shrink-0" />
    <main
      :key="showDiagramEditor ? 'diagram-editor-shell' : `shell-${activeShellKey}`"
      class="relative flex min-w-0 flex-1 flex-col overflow-hidden"
      :class="routeModule === 'cloud-abode' ? 'bg-transparent' : 'bg-ww-content'"
    >
      <!-- 便笺含 Tiptap：必须在 RouterView 外渲染，否则切模块时 outlet 卡死 -->
      <NotesView v-if="isNotesRoute" class="h-full min-h-0 flex flex-1 flex-col" />
      <!-- 编辑器不走 RouterView，避免 vue-router 5 卸载时 vnode 为 null 触发 component 读取错误 -->
      <DiagramEditorView
        v-else-if="showDiagramEditor"
        :key="diagramEditorKey"
        class="h-full min-h-0 flex flex-1 flex-col"
      />
      <template v-else-if="isItemDetail">
        <component
          :is="itemDetailShell"
          :key="activeShellKey"
          class="h-full min-h-0 flex flex-1 flex-col"
        />
        <Transition name="ww-item-detail">
          <ItemDetailView class="ww-item-detail-layer" />
        </Transition>
      </template>
      <RouterView v-else :key="activeShellKey" class="h-full min-h-0 flex flex-1 flex-col" />
      <Transition name="ww-music-minibar">
        <MusicMiniBar v-if="showMusicBar" />
      </Transition>
    </main>
  </div>
</template>

<style>
.ww-item-detail-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ww-content);
}

.ww-item-detail-enter-active {
  transition:
    opacity var(--ww-duration-slow) var(--ww-ease-out-slow),
    transform var(--ww-duration-slow) var(--ww-ease-out-slow);
}

.ww-item-detail-leave-active {
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-item-detail-enter-from,
.ww-item-detail-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.ww-music-minibar-enter-active,
.ww-music-minibar-leave-active {
  transition:
    transform 0.44s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-music-minibar-enter-from,
.ww-music-minibar-leave-to {
  opacity: 0;
  transform: translateY(calc(100% + var(--ww-music-minibar-inset, 1.125rem) + 0.75rem));
}

.ww-music-minibar-enter-to,
.ww-music-minibar-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
