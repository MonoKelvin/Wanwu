import { onMounted, onUnmounted } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

export function useDiagramShortcuts(
  bus: IDiagramCommandBus,
  options?: {
    onSave?: () => void | Promise<void>
    onSaveAs?: () => void
    onPagePrev?: () => void | Promise<void>
    onPageNext?: () => void | Promise<void>
    isActive?: () => boolean
    isBlocked?: () => boolean
  }
) {
  const arrowDirections: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down'
  }

  function onKeyDown(e: KeyboardEvent) {
    if (options?.isActive && !options.isActive()) return
    if (options?.isBlocked?.()) return

    const mod = e.ctrlKey || e.metaKey
    if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      if (options?.onSaveAs) options.onSaveAs()
      else void bus.dispatch({ type: 'document.saveAs', payload: { folderId: 'dg-files' } })
      return
    }
    if (mod && e.key === 's') {
      e.preventDefault()
      if (options?.onSave) void options.onSave()
      else void bus.dispatch({ type: 'document.save' })
      return
    }
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.undo' })
      return
    }
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.redo' })
      return
    }
    if (mod && e.key === 'x') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.copy' })
      void bus.dispatch({ type: 'canvas.deleteSelection' })
      return
    }
    if (mod && e.key === 'c') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.copy' })
      return
    }
    if (mod && e.key === 'd') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.duplicate' })
      return
    }
    if (mod && e.key === 'v') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.paste' })
      return
    }
    if (mod && e.key === 'a') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.selectAll' })
      return
    }
    if (mod && e.key === '0') {
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.zoomToFit' })
      return
    }
    if (mod && e.key === '1') {
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.zoomReset' })
      return
    }
    if (mod && e.key === 'PageUp') {
      e.preventDefault()
      if (options?.onPagePrev) void options.onPagePrev()
      else void bus.dispatch({ type: 'page.prev' })
      return
    }
    if (mod && e.key === 'PageDown') {
      e.preventDefault()
      if (options?.onPageNext) void options.onPageNext()
      else void bus.dispatch({ type: 'page.next' })
      return
    }
    const nudgeDirection = arrowDirections[e.key]
    if (!mod && nudgeDirection) {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({
        type: 'canvas.nudgeSelection',
        payload: { direction: nudgeDirection, large: e.shiftKey }
      })
      return
    }
    if (e.key === 'Escape') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.clearSelection' })
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.deleteSelection' })
      return
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
