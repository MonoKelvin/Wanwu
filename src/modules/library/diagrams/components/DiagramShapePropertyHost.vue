<script setup lang="ts">
import { computed } from 'vue'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'
import { useShapeExtensionPropertyPatch } from '@modules/library/diagrams/composables/useShapeExtensionPropertyPatch'
import { hasShapeExtension } from '@modules/library/diagrams/domain/property-panel'

const { ctx } = useDiagramPropertySectionView()
const { canvasCommands } = useDiagramPropertyContext()
const registry = ensureDiagramShapeExtensions()

const node = computed(() => ctx.value.selectedNode)
const shapeExtension = computed(() => node.value?.shapeExtension ?? null)

const kindRegistration = computed(() => {
  const kind = shapeExtension.value?.kind
  return kind ? registry.getKind(kind) : undefined
})

const EditorComponent = computed(() => kindRegistration.value?.propertyEditor?.component)

const editorKey = computed(() => {
  const ext = shapeExtension.value
  const current = node.value
  if (!ext?.kind || !current) return null
  return `${current.id}:${ext.kind}`
})

const showEditor = computed(
  () => hasShapeExtension(ctx.value) && EditorComponent.value != null && editorKey.value != null
)

const { hasPendingPatch, onPatch } = useShapeExtensionPropertyPatch(node, canvasCommands)

function onEditorPatch(
  data: unknown,
  immediate?: boolean,
  meta?: { lfType?: string }
) {
  onPatch(data, immediate, meta)
}
</script>

<template>
  <component
    :is="EditorComponent"
    v-if="showEditor && node && shapeExtension && editorKey"
    :key="editorKey"
    :node-id="node.id"
    :shape-extension="shapeExtension"
    :has-pending-patch="hasPendingPatch"
    @patch="onEditorPatch"
  />
</template>
