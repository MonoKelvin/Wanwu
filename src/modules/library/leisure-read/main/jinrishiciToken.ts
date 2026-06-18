import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { FetchFn } from '@modules/library/leisure-read/providers/types'

const TOKEN_FILE = 'leisure-read-jinrishici.token'

let memoryToken: string | null = null

function tokenFilePath(): string {
  return path.join(app.getPath('userData'), TOKEN_FILE)
}

export function readJinrishiciToken(): string | null {
  if (memoryToken) return memoryToken
  try {
    const token = fs.readFileSync(tokenFilePath(), 'utf8').trim()
    if (token) memoryToken = token
    return memoryToken
  } catch {
    return null
  }
}

export function writeJinrishiciToken(token: string): void {
  memoryToken = token
  fs.writeFileSync(tokenFilePath(), token, 'utf8')
}

/** 向今日诗词 v2 申请 Token 并持久化（同一用户应复用） */
export async function issueJinrishiciToken(fetchFn: FetchFn, signal?: AbortSignal): Promise<string> {
  const res = await fetchFn('https://v2.jinrishici.com/token', { signal })
  if (!res.ok) throw new Error(`jinrishici_token_http_${res.status}`)
  const row = (await res.json()) as { status?: string; data?: string }
  if (row.status !== 'success' || !row.data?.trim()) throw new Error('jinrishici_token_invalid')
  writeJinrishiciToken(row.data.trim())
  return row.data.trim()
}

export async function resolveJinrishiciToken(
  fetchFn: FetchFn,
  signal?: AbortSignal,
  force = false
): Promise<string> {
  if (!force) {
    const cached = readJinrishiciToken()
    if (cached) return cached
  }
  return issueJinrishiciToken(fetchFn, signal)
}
