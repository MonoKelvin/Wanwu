<script setup lang="ts">
defineOptions({ name: 'CloudAbodeView' })

import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CarShowroomView from './views/CarShowroomView.vue'
import { getVehicleCatalog, vehicleDisplayName } from './services/loadVehicleCatalog'

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
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <header class="ww-cloud-abode-nav">
      <nav class="ww-cloud-abode-nav__tabs" aria-label="车型">
        <button
          v-for="v in catalog.vehicles"
          :key="v.id"
          type="button"
          class="ww-cloud-abode-nav__tab"
          :class="{ 'ww-cloud-abode-nav__tab--active': v.slug === slug }"
          @click="openVehicle(v.slug)"
        >
          {{ vehicleDisplayName(v.slug) }}
        </button>
      </nav>
    </header>
    <CarShowroomView :key="slug" class="min-h-0 min-w-0 flex-1" :slug="slug" />
  </div>
</template>
