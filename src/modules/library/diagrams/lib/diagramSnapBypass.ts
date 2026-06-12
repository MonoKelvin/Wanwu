/** Ctrl/⌘ 按住时跳过对齐与网格吸附（精确移动/缩放） */
let snapBypassActive = false

function syncSnapBypass(e: KeyboardEvent | PointerEvent | MouseEvent): void {
  snapBypassActive = Boolean(e.ctrlKey || e.metaKey)
}

export function isDiagramSnapBypassActive(): boolean {
  return snapBypassActive
}

export function isDiagramSnapBypassEvent(e?: MouseEvent | TouchEvent | KeyboardEvent): boolean {
  if (e && 'ctrlKey' in e) {
    return Boolean(e.ctrlKey || e.metaKey)
  }
  return snapBypassActive
}

export function bindDiagramSnapBypassListeners(): () => void {
  const onKeyDown = (e: KeyboardEvent) => syncSnapBypass(e)
  const onKeyUp = (e: KeyboardEvent) => syncSnapBypass(e)
  const onPointerMove = (e: PointerEvent) => syncSnapBypass(e)
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  window.addEventListener('pointermove', onPointerMove, true)
  return () => {
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
    window.removeEventListener('pointermove', onPointerMove, true)
    snapBypassActive = false
  }
}
