type ReleaseFn = () => void

export class AsyncMutex {
  private tail: Promise<void> = Promise.resolve()

  run<T>(fn: () => Promise<T>): Promise<T> {
    let release!: ReleaseFn
    const next = new Promise<void>((resolve) => {
      release = resolve
    })
    const run = this.tail.then(() => fn())
    this.tail = run.then(
      () => {
        release()
      },
      () => {
        release()
      }
    )
    return run
  }
}
