import {
  CallableUnit,
  type ITransactionUnit,
  type OperationResult,
  type UnitMeta,
  txOk,
  UnitRegistry,
  UnitCodecRegistry,
  TransactionManager,
  type TransactionContext,
  type TransactionManagerOptions
} from '@app/transaction'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import type { IPixelEditorPort } from '@modules/library/pixel-art/services/IPixelEditorPort'
import { restoreDocumentSnapshot } from '@modules/library/pixel-art/lib/pixelUndoSnapshot'

export const PIXEL_STROKE_UNIT = 'pixel.stroke'
export const PIXEL_LAYER_SNAPSHOT_UNIT = 'pixel.layerSnapshot'
export const PIXEL_DOCUMENT_SNAPSHOT_UNIT = 'pixel.documentSnapshot'
export const PIXEL_LAYER_PROPERTY_UNIT = 'pixel.layerProperty'
export const PIXEL_LAYER_STRUCTURE_UNIT = 'pixel.layerStructure'

export interface StrokeUnitPayload {
  layerId: string
  before: Uint8ClampedArray
  after: Uint8ClampedArray
}

export interface DocumentSnapshotPayload {
  before: PixelDocument
  after: PixelDocument
}

class PixelStrokeUnit implements ITransactionUnit {
  constructor(
    readonly meta: UnitMeta,
    private readonly payload: StrokeUnitPayload
  ) {}

  apply(ctx: TransactionContext): OperationResult {
    return applyLayerPixels(ctx, this.payload.layerId, this.payload.after)
  }

  revert(ctx: TransactionContext): OperationResult {
    return applyLayerPixels(ctx, this.payload.layerId, this.payload.before)
  }

  tryMerge(previous: ITransactionUnit): ITransactionUnit | null {
    if (previous.meta.unitType !== PIXEL_STROKE_UNIT) return null
    const prev = previous as PixelStrokeUnit
    if (prev.payload.layerId !== this.payload.layerId) return null
    return new PixelStrokeUnit(prev.meta, {
      layerId: this.payload.layerId,
      before: prev.payload.before,
      after: this.payload.after
    })
  }

  toRecord(): never {
    const err = new Error('PixelStrokeUnit cannot be serialized') as Error & { code: string }
    err.code = 'TX_NOT_SERIALIZABLE'
    throw err
  }
}

export function createPixelStrokeUnit(payload: StrokeUnitPayload, label = '笔划'): ITransactionUnit {
  return new PixelStrokeUnit(
    {
      label,
      unitType: PIXEL_STROKE_UNIT,
      createdAt: new Date().toISOString()
    },
    payload
  )
}

export function createPixelLayerSnapshotUnit(
  payload: StrokeUnitPayload,
  label: string
): ITransactionUnit {
  return new PixelStrokeUnit(
    {
      label,
      unitType: PIXEL_LAYER_SNAPSHOT_UNIT,
      createdAt: new Date().toISOString()
    },
    payload
  )
}

function createPixelDocumentSnapshotUnit(
  payload: DocumentSnapshotPayload,
  label: string
): ITransactionUnit {
  return new CallableUnit(
    {
      label,
      unitType: PIXEL_DOCUMENT_SNAPSHOT_UNIT,
      createdAt: new Date().toISOString()
    },
    (ctx) => applyDocumentSnapshot(ctx, payload.after),
    (ctx) => applyDocumentSnapshot(ctx, payload.before)
  )
}

function applyLayerPixels(ctx: TransactionContext, layerId: string, pixels: Uint8ClampedArray): OperationResult {
  const port = ctx.services.port as IPixelEditorPort | undefined
  if (!port) return { ok: false, code: 'NO_PORT', message: '画布未就绪' }
  port.replaceLayerPixels(layerId, pixels)
  port.notifyDocumentChanged()
  return txOk()
}

function applyDocumentSnapshot(ctx: TransactionContext, snapshot: PixelDocument): OperationResult {
  const port = ctx.services.port as IPixelEditorPort | undefined
  if (!port) return { ok: false, code: 'NO_PORT', message: '画布未就绪' }
  restoreDocumentSnapshot(port, snapshot)
  return txOk()
}

const PIXEL_TX_OPTIONS: TransactionManagerOptions = {
  maxSteps: 100,
  enableMerge: true
}

export function createPixelTransactionManager(
  resourceKey: string,
  port: IPixelEditorPort
): TransactionManager {
  const resourceId = `pixel:${resourceKey}`
  const ctx: TransactionContext = {
    resourceId,
    services: { port }
  }
  const unitRegistry = new UnitRegistry()
  const unitCodecRegistry = new UnitCodecRegistry()
  return new TransactionManager(ctx, unitRegistry, unitCodecRegistry, PIXEL_TX_OPTIONS)
}

export async function recordPixelStroke(
  tx: TransactionManager,
  layerId: string,
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  label = '笔划'
): Promise<void> {
  const unit = createPixelStrokeUnit({ layerId, before, after }, label)
  await tx.record(unit)
}

export async function recordPixelDocumentSnapshot(
  tx: TransactionManager,
  label: string,
  before: PixelDocument,
  after: PixelDocument
): Promise<void> {
  const unit = createPixelDocumentSnapshotUnit({ before, after }, label)
  await tx.record(unit)
}

export async function recordDocumentMutation(
  tx: TransactionManager | null | undefined,
  label: string,
  before: PixelDocument,
  after: PixelDocument
): Promise<void> {
  if (!tx) return
  await recordPixelDocumentSnapshot(tx, label, before, after)
}
