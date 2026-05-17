<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModuleSidebar from '@app/components/ModuleSidebar.vue'
import SubItemPanel from '@app/components/SubItemPanel.vue'
import { useAppStore, type ModuleId } from '@shared/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const isItemDetail = computed(() => route.name === 'item-detail')

watch(
  () => route.meta.module as ModuleId | undefined,
  (m) => {
    if (m) appStore.setModule(m)
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-ww-bg text-ww-text">
    <ModuleSidebar />
    <template v-if="!isItemDetail">
      <SubItemPanel class="shrink-0 border-r border-ww-border" />
      <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <RouterView v-slot="{ Component }">
          <Transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </template>
    <main v-else class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>
