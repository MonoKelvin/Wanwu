<script setup lang="ts">
import WwShortcutsDialog from '@shared/components/WwShortcutsDialog.vue'
import { DIAGRAM_SHORTCUT_SECTIONS } from '@modules/library/diagrams/lib/diagramShortcutSections'

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <WwShortcutsDialog v-model:open="open" :sections="DIAGRAM_SHORTCUT_SECTIONS" />
</template>
