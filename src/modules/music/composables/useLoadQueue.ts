const DEFAULT_GAP_MS = 72

/** 发现页等场景：多个 lazy section 同时进视口时错峰请求，减轻主线程与网络突发 */
export function useLoadQueue(gapMs = DEFAULT_GAP_MS) {
  let tail = Promise.resolve()

  function enqueue(task: () => Promise<void>) {
    tail = tail.then(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            void task().finally(() => {
              window.setTimeout(resolve, gapMs)
            })
          })
        })
    )
  }

  return { enqueue }
}
