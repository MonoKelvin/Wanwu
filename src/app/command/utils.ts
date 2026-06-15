export function createId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function clonePayload(payload: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(payload))
  } catch {
    return { _error: 'UNSERIALIZABLE_PAYLOAD' }
  }
}
