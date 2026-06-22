import {
  CallableUnit,
  type ITransactionUnit,
  type OperationResult,
  txOk,
  UnitRegistry,
  UnitCodecRegistry,
  TransactionManager,
  type TransactionContext,
  type TransactionManagerOptions
} from '@app/transaction'
import type { IPixelEditorPort } from '@modules/library/pixel-art/interfaces/IPixelEditorPort'

export const PIXEL_STROKE_UNIT = 'pixel.stroke'
export const PIXEL_LAYER_SNAPSHOT_UNIT = 'pixel.layerSnapshot'
export const PIXEL_LAYER_PROPERTY_UNIT = 'pixel.layerProperty'
export const PIXEL_LAYER_STRUCTURE_UNIT = 'pixel.layerStructure'

export interface StrokeUnitPayload {
  layerId: string
  before: Uint8ClampedArray
  after: Uint8ClampedArray
}

export function createPixelStrokeUnit(payload: StrokeUnitPayload): ITransactionUnit {
  return new CallableUnit(
    {
      label: '笔划',
      unitType: PIXEL_STROKE_UNIT,
      createdAt: new Date().toISOString()
    },
    (ctx) => applyLayerPixels(ctx, payload.layerId, payload.after),
    (ctx) => applyLayerPixels(ctx, payload.layerId, payload.before),
    { recordable: false }
  )
}

export function createPixelLayerSnapshotUnit(payload: StrokeUnitPayload): ITransactionUnit {
  return new CallableUnit(
    {
      label: '图层快照',
      unitType: PIXEL_LAYER_SNAPSHOT_UNIT,
      createdAt: new Date().toISOString()
    },
    (ctx) => applyLayerPixels(ctx, payload.layerId, payload.after),
    (ctx) => applyLayerPixels(ctx, payload.layerId, payload.before),
    { recordable: false }
  )
}

export function tryMergeStrokeUnits(prev: ITransactionUnit, next: ITransactionUnit): ITransactionUnit | null {
  if (prev.meta.unitType !== PIXEL_STROKE_UNIT || next.meta.unitType !== PIXEL_STROKE_UNIT) return null
  return prev
}

function applyLayerPixels(ctx: TransactionContext, layerId: string, pixels: Uint8ClampedArray): OperationResult {
  const port = ctx.services.port as IPixelEditorPort | undefined
  if (!port) return { ok: false, code: 'NO_PORT', message: '画布未就绪' }
  const doc = port.getDocument()
  const layer = doc.layerPixels[layerId]
  if (!layer) return { ok: false, code: 'NOT_FOUND', message: '图层不存在' }
  layer.set(pixels)
  port.loadDocument(doc)
  return txOk()
}

const PIXEL_TX_OPTIONS: TransactionManagerOptions = {
  maxSteps: 100,
  enableMerge: true
}

export function createPixelTransactionManager(
  fileId: string,
  port: IPixelEditorPort
): TransactionManager {
  const resourceId = `pixel:${fileId}`
  const ctx: TransactionContext = {
    resourceId,
    services: { port }
  }
  const unitRegistry = new UnitRegistry()
  const unitCodecRegistry = new UnitCodecRegistry()
  return new TransactionManager(ctx, unitRegistry, unitCodecRegistry, PIXEL_TX_OPTIONS)
}

export { tryMergeStrokeUnits as pixelStrokeTryMerge }
