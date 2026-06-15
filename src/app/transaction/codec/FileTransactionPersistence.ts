import type { TransactionSnapshot } from '../domain/types'

export interface ITransactionPersistence {
  save(resourceId: string, snapshot: TransactionSnapshot): Promise<void>
  load(resourceId: string): Promise<TransactionSnapshot | null>
  remove(resourceId: string): Promise<void>
}

export class FileTransactionPersistence implements ITransactionPersistence {
  constructor(
    private readonly readFile: (path: string) => Promise<string | null>,
    private readonly writeFile: (path: string, content: string) => Promise<void>,
    private readonly deleteFile: (path: string) => Promise<void>,
    private readonly pathFor: (resourceId: string) => string
  ) {}

  async save(resourceId: string, snapshot: TransactionSnapshot): Promise<void> {
    const path = this.pathFor(resourceId)
    await this.writeFile(path, JSON.stringify(snapshot, null, 2))
  }

  async load(resourceId: string): Promise<TransactionSnapshot | null> {
    const path = this.pathFor(resourceId)
    const raw = await this.readFile(path)
    if (!raw) return null
    return JSON.parse(raw) as TransactionSnapshot
  }

  async remove(resourceId: string): Promise<void> {
    await this.deleteFile(this.pathFor(resourceId))
  }
}
