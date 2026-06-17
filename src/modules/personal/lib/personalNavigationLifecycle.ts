/**
 * 个人页跨模块导航前刷新资料（与 notes 模块 navigation lifecycle 同模式）。
 * 实际持久化由 personalProfileSession 承担，不依赖页面组件挂载时机。
 */
import { flushPersonalProfileBeforeNavigation } from '@modules/personal/composables/personalProfileSession'

export { registerPersonalUiFlush } from '@modules/personal/composables/personalProfileSession'

/** router.push 之前由 navigation contributor 调用，需 await 完成 IPC 写入 */
export async function flushPersonalBeforeNavigation(): Promise<void> {
  await flushPersonalProfileBeforeNavigation()
}
