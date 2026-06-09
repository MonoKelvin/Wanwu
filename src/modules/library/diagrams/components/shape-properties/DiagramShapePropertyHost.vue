<script setup lang="ts">
import { computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const props = defineProps<{
  node: DiagramNodeProperties
}>()

const bus = useDiagramCommandBus()
const registry = ensureDiagramShapeExtensions()

const shapeExtension = computed(() => props.node.shapeExtension)

const kindRegistration = computed(() => {
  const kind = shapeExtension.value?.kind
  return kind ? registry.getKind(kind) : undefined
})

const editorProvider = computed(() => kindRegistration.value?.propertyEditor)

const EditorComponent = computed(() => editorProvider.value?.component)

const dispatchShapePatch = useDebounceFn((nodeId: string, kind: string, data: unknown) => {
  const kindReg = registry.getKind(kind)
  if (!kindReg) return
  void bus.dispatch({
    type: 'canvas.updateNode',
    payload: {
      nodeId,
      patch: {
        properties: {
          dgShape: kindReg.codec.toEnvelope(data)
        }
      }
    }
  })
}, 200)

function onPatch(data: unknown) {
  const kind = shapeExtension.value?.kind
  if (!kind) return
  void dispatchShapePatch(props.node.id, kind, data)
}
</script>

<template>
  <component
    :is="EditorComponent"
    v-if="EditorComponent && shapeExtension"
    :node-id="node.id"
    :shape-extension="shapeExtension"
    @patch="onPatch"
  />
</template>
