/** 丢弃过期异步响应，避免快速切换路由/Tab 时错写状态 */
export function useAsyncTask() {
  let generation = 0

  return {
    next() {
      generation += 1
      return generation
    },
    isCurrent(token: number) {
      return token === generation
    },
    cancel() {
      generation += 1
    }
  }
}
