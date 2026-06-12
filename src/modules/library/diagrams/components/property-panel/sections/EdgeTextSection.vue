<script setup lang="ts">
import { computed } from 'vue'
import InputText from 'primevue/inputtext'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'

const { ctx, actions } = useDiagramPropertySectionView()
const edge = computed(() => ctx.value.selectedEdge!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">文本</p>
    <SettingsRow label="标签" class="dg-settings-row--inline dg-settings-row--control">
      <InputText
        :model-value="edge.text"
        class="dg-prop-control"
        @update:model-value="actions.patchEdge({ text: String($event ?? '') })"
      />
    </SettingsRow>
  </section>
</template>
