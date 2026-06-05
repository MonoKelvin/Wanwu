import { onMounted, onUnmounted } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'

export function useDiagramShortcuts(bus: IDiagramCommandBus) {
  function onKeyDown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey
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
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      void bus.dispatch({ type: 'canvas.deleteSelection' })
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
