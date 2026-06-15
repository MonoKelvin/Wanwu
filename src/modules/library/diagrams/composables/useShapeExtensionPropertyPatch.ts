import { computed, onBeforeUnmount, ref, watch, type ComputedRef } from 'vue'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import type { DiagramDocumentMutationCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'

export interface ShapeExtensionPropertyPatchApi {
  readonly hasPendingPatch: ComputedRef<boolean>
  onPatch(data: unknown, immediate?: boolean, meta?: { lfType?: string }): void
  flushPendingPatch(): void
}

/**
 * 结构化图形（UML 等）属性编辑的通用 patch 管线：
 * debounce → command bus → dgShape envelope，切换节点前 flush 到原 nodeId。
 */
export function useShapeExtensionPropertyPatch(
  node: ComputedRef<DiagramNodeProperties | null | undefined>,
  canvas: DiagramDocumentMutationCommands
): ShapeExtensionPropertyPatchApi {
  const canvasCommands = canvas
  const registry = ensureDiagramShapeExtensions()

  const shapeExtension = computed(() => node.value?.shapeExtension ?? null)

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
    canvasCommands.modifyNode({
      nodeId,
      patch: {
        properties: {
          dgShape: kindReg.codec.toEnvelope(data)
        },
        ...(lfType ? { lfType } : {})
      }
    })
  }

  function flushPendingPatch() {
    const pending = pendingPatch.value
    if (!pending) return
    pendingPatch.value = null
    dispatchShapePatchNow(pending.nodeId, pending.kind, pending.data, pending.lfType)
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function cancelDebounce() {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  function scheduleDebounce() {
    cancelDebounce()
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      flushPendingPatch()
    }, 200)
  }

  function onPatch(
    data: unknown,
    immediate = false,
    meta?: { lfType?: string }
  ) {
    const current = node.value
    const kind = shapeExtension.value?.kind
    if (!current || !kind) return
    if (immediate) {
      cancelDebounce()
      pendingPatch.value = null
      dispatchShapePatchNow(current.id, kind, data, meta?.lfType)
      return
    }
    pendingPatch.value = { nodeId: current.id, kind, data, lfType: meta?.lfType }
    scheduleDebounce()
  }

  watch(
    () => [node.value?.id, shapeExtension.value?.kind] as const,
    ([nextId, nextKind], [prevId, prevKind]) => {
      if (!prevId || (nextId === prevId && nextKind === prevKind)) return
      cancelDebounce()
      if (pendingPatch.value?.nodeId === prevId) {
        flushPendingPatch()
      } else {
        pendingPatch.value = null
      }
    }
  )

  onBeforeUnmount(() => {
    cancelDebounce()
    flushPendingPatch()
  })

  const hasPendingPatch = computed(() => pendingPatch.value != null)

  return { hasPendingPatch, onPatch, flushPendingPatch }
}
