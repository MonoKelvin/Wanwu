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
    onSaveAs?: () => void
    isActive?: () => boolean
  }
) {
  function onKeyDown(e: KeyboardEvent) {
    if (options?.isActive && !options.isActive()) return

    const mod = e.ctrlKey || e.metaKey
    if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      if (options?.onSaveAs) options.onSaveAs()
      else void bus.dispatch({ type: 'document.saveAs', payload: { folderId: 'dg-files' } })
      return
    }
    if (mod && e.key === 's') {
      e.preventDefault()
      void bus.dispatch({ type: 'document.save' })
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
      void bus.dispatch({ type: 'page.prev' })
      return
    }
    if (mod && e.key === 'PageDown') {
      e.preventDefault()
      void bus.dispatch({ type: 'page.next' })
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
