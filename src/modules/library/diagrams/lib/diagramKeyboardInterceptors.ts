export type DiagramKeyboardInterceptor = (event: KeyboardEvent) => boolean

const interceptors = new Set<DiagramKeyboardInterceptor>()

/** 扩展注册画布键盘拦截（返回 true 表示已消费，全局快捷键应跳过） */
export function registerDiagramKeyboardInterceptor(
  interceptor: DiagramKeyboardInterceptor
): () => void {
  interceptors.add(interceptor)
  return () => interceptors.delete(interceptor)
}

export function consumeDiagramKeyboardEvent(event: KeyboardEvent): boolean {
  for (const interceptor of interceptors) {
    if (interceptor(event)) return true
  }
  return false
}
