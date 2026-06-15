export interface CommandManagerOptions {
  maxLogEntries?: number
  recordPolicy?: 'all' | 'success-only' | 'failure-only'
}

export interface DispatchOptions {
  record?: boolean
  recordOnFailure?: boolean
}
