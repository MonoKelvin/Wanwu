import type { TransactionSnapshot } from '../domain/types'

export interface ISnapshotCodec {
  encode(snapshot: TransactionSnapshot): string
  decode(raw: string): TransactionSnapshot
}

export class JsonSnapshotCodec implements ISnapshotCodec {
  encode(snapshot: TransactionSnapshot): string {
    return JSON.stringify(snapshot, null, 2)
  }

  decode(raw: string): TransactionSnapshot {
    const parsed = JSON.parse(raw) as TransactionSnapshot
    if (parsed.format !== 'wanwu-transaction' || parsed.formatVersion !== 1) {
      throw new Error('TX_REHYDRATE_FAILED: invalid snapshot format')
    }
    return parsed
  }
}
