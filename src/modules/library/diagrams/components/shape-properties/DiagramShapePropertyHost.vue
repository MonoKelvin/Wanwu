<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const props = defineProps<{
  node: DiagramNodeProperties
}>()

const bus = useDiagramCommandBus()
const registry = ensureDiagramShapeExtensions()

const shapeExtension = computed(() => props.node.shapeExtension ?? null)

const kindRegistration = computed(() => {
  const kind = shapeExtension.value?.kind
  return kind ? registry.getKind(kind) : undefined
})

const editorProvider = computed(() => kindRegistration.value?.propertyEditor)

const EditorComponent = computed(() => editorProvider.value?.component)

const editorKey = computed(() => {
  const ext = shapeExtension.value
  if (!ext?.kind) return null
  return `${props.node.id}:${ext.kind}`
})

/** 待 flush 的 debounced patch，切换节点前先落到原 nodeId */
const pendingPatch = ref<{
  nodeId: string
  kind: string
  data: unknown
  lfType?: string
} | null>(null)

function dispatchShapePatchNow(
  nodeId: string,
  kind: string,
  data: unknown,
  lfType?: string
) {
  const kindReg = registry.getKind(kind)
  if (!kindReg) return
  void bus.dispatch({
    type: 'canvas.updateNode',
    payload: {
      nodeId,
      patch: {
        properties: {
          dgShape: kindReg.codec.toEnvelope(data)
        },
        ...(lfType ? { lfType } : {})
      }
    }
  })
}

function flushPendingPatch() {
  const pending = pendingPatch.value
  if (!pending) return
  pendingPatch.value = null
  dispatchShapePatchNow(pending.nodeId, pending.kind, pending.data, pending.lfType)
}

const dispatchShapePatchDebounced = useDebounceFn(() => {
  flushPendingPatch()
}, 200)

function onPatch(
  data: unknown,
  immediate = false,
  meta?: { lfType?: string }
) {
  const kind = shapeExtension.value?.kind
  if (!kind) return
  if (immediate) {
    dispatchShapePatchDebounced.cancel()
    pendingPatch.value = null
    dispatchShapePatchNow(props.node.id, kind, data, meta?.lfType)
    return
  }
  pendingPatch.value = { nodeId: props.node.id, kind, data, lfType: meta?.lfType }
  void dispatchShapePatchDebounced()
}

watch(
  () => [props.node.id, shapeExtension.value?.kind] as const,
  ([nextId, nextKind], [prevId, prevKind]) => {
    if (!prevId || (nextId === prevId && nextKind === prevKind)) return
    dispatchShapePatchDebounced.cancel()
    if (pendingPatch.value?.nodeId === prevId) {
      flushPendingPatch()
    } else {
      pendingPatch.value = null
    }
  }
)

onBeforeUnmount(() => {
  dispatchShapePatchDebounced.cancel()
  flushPendingPatch()
})

const hasPendingPatch = computed(() => pendingPatch.value != null)

defineExpose({ flushPendingPatch })
</script>

<template>
  <component
    :is="EditorComponent"
    v-if="EditorComponent && shapeExtension && editorKey"
    :key="editorKey"
    :node-id="node.id"
    :shape-extension="shapeExtension"
    :has-pending-patch="hasPendingPatch"
    @patch="(data, immediate, meta) => onPatch(data, immediate, meta)"
  />
</template>
