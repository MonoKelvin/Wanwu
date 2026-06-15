/** 全局保存互斥：自动保存、手动保存、离开前 flush 串行执行 writeFile */
let saveChain: Promise<unknown> = Promise.resolve()

export function withDiagramSaveMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = saveChain.then(() => fn())
  saveChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}
