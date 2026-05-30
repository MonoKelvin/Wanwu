<script setup lang="ts">
defineOptions({ name: 'CaRouteOutlet' })
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="ww-ca-route" mode="out-in">
      <div :key="route.path" class="ww-ca-route-page flex h-full min-h-0 flex-col">
        <span class="ww-ca-route-grid" aria-hidden="true" />
        <component :is="Component" class="ww-ca-route-page__view min-h-0 flex-1" />
      </div>
    </Transition>
  </RouterView>
</template>
