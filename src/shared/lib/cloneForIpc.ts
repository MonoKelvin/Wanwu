/**
 * Electron IPC 使用 Structured Clone，Vue Proxy / 部分运行时对象无法通过。
 * 对可 JSON 化的业务数据，用 round-trip 保证可安全跨进程传递。
 */
export function cloneForIpc<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
