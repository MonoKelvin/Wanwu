/** 流程图编辑器顶层路由名（与 router 配置一致） */
export const LIBRARY_DIAGRAMS_EDITOR_ROUTE = 'library-diagrams-editor' as const

export function isDiagramEditorPath(path: string): boolean {
  return /^\/diagrams\/edit\/[^/?#]+/.test(path)
}

export function isDiagramEditorRoute(
  name: string | symbol | null | undefined,
  path: string
): boolean {
  return name === LIBRARY_DIAGRAMS_EDITOR_ROUTE || isDiagramEditorPath(path)
}
