<script setup lang="ts">
defineOptions({ name: 'CloudAbodeView' })

import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CarShowroomView from './vehicles/views/CarShowroomView.vue'
import { getVehicleCatalog, vehicleDisplayName } from './vehicles/services/loadVehicleCatalog'

const route = useRoute()
const router = useRouter()
const catalog = getVehicleCatalog()

const slug = computed(() => {
  const param = route.params.slug as string | undefined
  if (param) return param
  return catalog.vehicles[0]?.slug ?? 'xiaomi-su7'
})

watch(
  () => route.params.slug,
  (param) => {
    if (!param && catalog.vehicles[0]) {
      void router.replace({ name: 'cloud-abode', params: { slug: catalog.vehicles[0].slug } })
    }
  },
  { immediate: true }
)

function openVehicle(nextSlug: string) {
  if (nextSlug === slug.value) return
  void router.push({ name: 'cloud-abode', params: { slug: nextSlug } })
}
</script>

<template>
  <div class="flex h-full min-h-0 overflow-hidden">
    <aside
      class="flex w-44 shrink-0 flex-col gap-1 border-r border-ww-border bg-ww-rail/80 p-2"
      aria-label="车型列表"
    >
      <p class="px-2 py-1 text-xs font-medium text-ww-muted">虚拟汽车</p>
      <button
        v-for="v in catalog.vehicles"
        :key="v.id"
        type="button"
        class="rounded-lg px-3 py-2 text-left text-sm transition-colors"
        :class="
          v.slug === slug
            ? 'bg-ww-accent/15 text-ww-accent'
            : 'text-color hover:bg-ww-canvas/60'
        "
        @click="openVehicle(v.slug)"
      >
        {{ vehicleDisplayName(v.slug) }}
      </button>
    </aside>
    <CarShowroomView :key="slug" class="min-h-0 min-w-0 flex-1" :slug="slug" />
  </div>
</template>
