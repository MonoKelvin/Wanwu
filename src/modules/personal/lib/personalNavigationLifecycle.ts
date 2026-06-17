/**
 * 个人页跨模块导航前刷新资料草稿（与 notes 模块的 navigation lifecycle 同模式）。
 */

let flushHook: (() => Promise<void>) | null = null

export function registerPersonalNavigationFlush(hook: () => Promise<void>): () => void {
  flushHook = hook
  return () => {
    if (flushHook === hook) flushHook = null
  }
}

/** router.push 之前由 navigation contributor 调用，需 await 完成 IPC 写入 */
export async function flushPersonalBeforeNavigation(): Promise<void> {
  await flushHook?.()
}
