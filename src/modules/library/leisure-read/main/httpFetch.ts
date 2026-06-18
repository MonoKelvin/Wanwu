export const LEISURE_READ_FETCH_TIMEOUT_MS = 8000
export const LEISURE_READ_SLOW_FETCH_TIMEOUT_MS = 25000

export async function leisureReadHttpFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? LEISURE_READ_FETCH_TIMEOUT_MS
  const { timeoutMs: _omit, ...fetchInit } = init ?? {}
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const signal = fetchInit.signal
    ? AbortSignal.any([fetchInit.signal, controller.signal])
    : controller.signal

  try {
    return await fetch(url, { ...fetchInit, signal })
  } finally {
    clearTimeout(timeout)
  }
}
