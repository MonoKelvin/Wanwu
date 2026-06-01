/** 初始化 @neteasecloudmusicapienhanced 运行环境（匿名 token、xeapi 公钥等） */
let bootstrapPromise: Promise<void> | null = null

export function ensureNeteaseApiReady(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const generateConfig = require('@neteasecloudmusicapienhanced/api/generateConfig') as () => Promise<void>
        await generateConfig()
      } catch (e) {
        console.warn('[music/netease] API bootstrap failed:', e instanceof Error ? e.message : e)
      }
    })()
  }
  return bootstrapPromise
}
