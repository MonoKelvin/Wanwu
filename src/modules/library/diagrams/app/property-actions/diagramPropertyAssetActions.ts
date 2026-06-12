import type { Ref } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { DiagramPropertyCommandDispatch } from '@modules/library/diagrams/app/property-actions/diagramPropertyCommandDispatch'

export interface DiagramPropertyAssetActionsDeps {
  bus: IDiagramCommandBus
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
  const { bus, dispatch, getSelectedNode, getFileId, imageBusy, toast } = deps

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
      await bus.dispatch({
        type: 'canvas.updateNode',
        payload: {
          nodeId,
          nodeProps: {
            imageAsset: { assetId: result.assetId, ext: result.ext, url: result.url }
          }
        }
      })
    } finally {
      imageBusy.value = false
    }
  }

  function clearNodeImage() {
    const nodeId = dispatch.activeNodeId()
    if (!nodeId) return
    void bus.dispatch({
      type: 'canvas.updateNode',
      payload: { nodeId, nodeProps: { imageAsset: null } }
    })
  }

  function patchGroupStyle(patch: Record<string, unknown>) {
    const id = dispatch.activeNodeId()
    if (!id) return
    const node = getSelectedNode()
    void bus.dispatch({
      type: 'canvas.updateNode',
      payload: {
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
      }
    })
  }

  function patchGroupAlwaysVisible(value: boolean) {
    const id = dispatch.activeNodeId()
    if (!id) return
    void bus.dispatch({
      type: 'canvas.updateNode',
      payload: {
        nodeId: id,
        patch: {
          properties: {
            dgGroupAlwaysVisible: value
          }
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
