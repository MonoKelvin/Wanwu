import { createRequire } from 'node:module'
import type { PlatformSessionStore } from '../sessionStore'

/** 注册酷狗设备并持久化 dfid / GUID / MID（文档：/register/dev，播放与搜索依赖） */
export async function ensureKugouDevice(session: PlatformSessionStore, proxy?: string): Promise<void> {
  const snap = session.snapshot()
  if (snap.dfid && snap.kugouGuid && snap.kugouMid) return

  const require = createRequire(import.meta.url)
  const { getGuid, calculateMid } = require('kugoumusicapi/util/util') as {
    getGuid: () => string
    calculateMid: (guid: string) => string
  }
  const { cryptoMd5 } = require('kugoumusicapi/util/crypto') as { cryptoMd5: (s: string) => string }
  const api = require('kugoumusicapi/main.js') as Record<
    string,
    (p: Record<string, unknown>) => Promise<{ body?: { data?: { dfid?: string } }; cookie?: string[] }>
  >

  const guid = snap.kugouGuid ?? cryptoMd5(getGuid())
  const mid = snap.kugouMid ?? calculateMid(guid)
  const payload: Record<string, unknown> = {
    cookie: {
      KUGOU_API_GUID: guid,
      KUGOU_API_MID: mid,
      KUGOU_API_DEV: 'WANWU00001',
      KUGOU_API_MAC: '02:00:00:00:00:00',
      userid: '0',
      token: ''
    }
  }
  if (proxy) payload.proxy = proxy

  const res = await api.register_dev(payload)
  let dfid = res.body?.data?.dfid ?? snap.dfid
  for (const row of res.cookie ?? []) {
    const eq = row.indexOf('=')
    if (eq > 0 && row.slice(0, eq) === 'dfid') dfid = row.slice(eq + 1)
  }
  if (!dfid) throw new Error('酷狗设备注册失败，无法获取 dfid')

  session.setKugouDevice({ kugouGuid: guid, kugouMid: mid, dfid })
}
