<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, watch } from 'vue'
import { collectLibrarySettingsGroups } from '@app/modules/librarySettingsGroupRegistry'
import { WwSettingsGroup, WwSettingsSection } from '@shared/components/settings'
import type { Component } from 'vue'

const groups = computed(() => collectLibrarySettingsGroups())
const groupComponents = shallowRef<Record<string, Component>>({})

watch(
  groups,
  (items) => {
    const next: Record<string, Component> = {}
    for (const group of items) {
      next[group.id] = defineAsyncComponent(() => group.loadPanel())
    }
    groupComponents.value = next
  },
  { immediate: true }
)
</script>

<template>
  <WwSettingsSection>
    <WwSettingsGroup v-for="group in groups" :key="group.id" :label="group.label">
      <component :is="groupComponents[group.id]" />
    </WwSettingsGroup>
  </WwSettingsSection>
</template>
