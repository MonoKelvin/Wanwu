/** 重置设置时需清除的 localStorage 键（由各模块/壳层 contributor 注册） */
const keys = new Set<string>()

export function registerLocalStorageKeys(keysToAdd: readonly string[]): void {
  for (const key of keysToAdd) {
    if (key) keys.add(key)
  }
}

export function collectLocalStorageKeys(): readonly string[] {
  return [...keys]
}
