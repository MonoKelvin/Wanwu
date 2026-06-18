<script setup lang="ts">
import { defineAsyncComponent, watch, ref } from 'vue'
import { useQuickAccessHost } from '@modules/quick-access/app/composables/useQuickAccessHost'

const CommandPalette = defineAsyncComponent(
  () => import('@modules/quick-access/app/CommandPalette.vue')
)

const { paletteOpen, quickAccessReady } = useQuickAccessHost()
const paletteMounted = ref(false)

watch(paletteOpen, (open) => {
  if (open) paletteMounted.value = true
})
</script>

<template>
  <CommandPalette v-if="quickAccessReady && paletteMounted" v-model:open="paletteOpen" />
</template>
