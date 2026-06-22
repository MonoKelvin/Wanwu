<script setup lang="ts">
import { ref } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import WwShortcutsDialog from '@shared/components/WwShortcutsDialog.vue'
import { DIAGRAM_SHORTCUT_SECTIONS } from '@modules/library/diagrams/lib/diagramShortcutSections'

const dialogOpen = ref(false)
</script>

<template>
  <div class="dg-shortcuts-hint dg-float dg-float--bottom-right">
    <WwButton
      icon="circle-help"
      severity="secondary"
      text
      rounded
      aria-label="快捷键"
      v-tooltip.top="'快捷键'"
      class="dg-shortcuts-hint__btn ww-glass-blur"
      @click="dialogOpen = true"
    />
    <WwShortcutsDialog v-model:open="dialogOpen" :sections="DIAGRAM_SHORTCUT_SECTIONS" />
  </div>
</template>
