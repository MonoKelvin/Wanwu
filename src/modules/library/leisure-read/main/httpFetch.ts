export const LEISURE_READ_FETCH_TIMEOUT_MS = 8000

export async function leisureReadHttpFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LEISURE_READ_FETCH_TIMEOUT_MS)
  const signal = init?.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal

  try {
    return await fetch(url, { ...init, signal })
  } finally {
    clearTimeout(timeout)
  }
}
