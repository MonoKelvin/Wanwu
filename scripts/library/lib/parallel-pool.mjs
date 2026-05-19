/**
 * 有限并发任务池
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<void>} worker
 */
export async function runPool(items, concurrency, worker) {
  const limit = Math.max(1, concurrency)
  let index = 0

  async function runNext() {
    while (index < items.length) {
      const i = index++
      await worker(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()))
}
