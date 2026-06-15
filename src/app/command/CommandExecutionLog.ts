import type { CommandExecutionEntry } from './domain/types'

export interface CommandExecutionLogOptions {
  maxEntries?: number
}

export class CommandExecutionLog {
  private entries: CommandExecutionEntry[] = []
  private readonly maxEntries: number
  private readonly listeners = new Set<(entries: readonly CommandExecutionEntry[]) => void>()

  constructor(options?: CommandExecutionLogOptions) {
    this.maxEntries = options?.maxEntries ?? 200
  }

  append(entry: CommandExecutionEntry): void {
    this.entries.push(entry)
    if (this.maxEntries > 0 && this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }
    this.notify()
  }

  getAll(): readonly CommandExecutionEntry[] {
    return [...this.entries]
  }

  getRecent(limit: number): readonly CommandExecutionEntry[] {
    return this.entries.slice(-limit)
  }

  clear(): void {
    this.entries = []
    this.notify()
  }

  onChange(listener: (entries: readonly CommandExecutionEntry[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    const snapshot = this.getAll()
    for (const listener of this.listeners) listener(snapshot)
  }
}
