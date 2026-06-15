import type { Ref } from 'vue'
import type { DiagramDocumentMutationCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { DiagramPropertyCommandDispatch } from '@modules/library/diagrams/app/property/diagramPropertyCommandDispatch'

export interface DiagramPropertyAssetActionsDeps {
  canvas: DiagramDocumentMutationCommands
  dispatch: DiagramPropertyCommandDispatch
  getSelectedNode: () => DiagramNodeProperties | null | undefined
  getFileId: () => string | null
  imageBusy: Ref<boolean>
  toast: {
    info(message: string): void
    error(message: string): void
  }
}

export function createDiagramPropertyAssetActions(deps: DiagramPropertyAssetActionsDeps) {
  const { canvas, dispatch, getSelectedNode, getFileId, imageBusy, toast } = deps

  async function pickNodeImage() {
    const fileId = getFileId()
    if (!fileId) {
      toast.info('请先保存文档后再插入图片')
      return
    }
    const nodeId = dispatch.activeNodeId()
    if (!nodeId) return
    imageBusy.value = true
    try {
      const result = await window.wanwu.diagrams.importNodeAsset({ fileId })
      if (!result.ok) {
        if (!result.canceled && result.error) toast.error(result.error)
        return
      }
      await canvas.modifyNodeAsync({
        nodeId,
        nodeProps: {
          imageAsset: { assetId: result.assetId, ext: result.ext, url: result.url }
        }
      })
    } finally {
      imageBusy.value = false
    }
  }

  function clearNodeImage() {
    const nodeId = dispatch.activeNodeId()
    if (!nodeId) return
    canvas.modifyNode({ nodeId, nodeProps: { imageAsset: null } })
  }

  function patchGroupStyle(patch: Record<string, unknown>) {
    const id = dispatch.activeNodeId()
    if (!id) return
    const node = getSelectedNode()
    canvas.modifyNode({
      nodeId: id,
      patch: {
        properties: {
          dgGroupStyle: {
            stroke: node?.stroke,
            strokeWidth: node?.strokeWidth,
            strokeDasharray: node?.strokeDasharray ?? '',
            fill: node?.fill,
            ...patch
          }
        }
      }
    })
  }

  function patchGroupAlwaysVisible(value: boolean) {
    const id = dispatch.activeNodeId()
    if (!id) return
    canvas.modifyNode({
      nodeId: id,
      patch: {
        properties: {
          dgGroupAlwaysVisible: value
        }
      }
    })
  }

  return {
    pickNodeImage,
    clearNodeImage,
    patchGroupStyle,
    patchGroupAlwaysVisible
  }
}
