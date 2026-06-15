import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import { onMounted, onUnmounted } from 'vue'
import {
  createDiagramCanvasCommands,
  type DiagramCanvasCommands
} from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import {
  createDiagramDataCommandApi,
  type DiagramDataCommandApi
} from '@modules/library/diagrams/composables/useDiagramDataCommand'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

export function useDiagramShortcuts(options?: {
  bus?: IDiagramCommandBus
  canvas?: DiagramCanvasCommands
  data?: DiagramDataCommandApi
  onSave?: () => void | Promise<void>
  onSaveAs?: () => void
  onPagePrev?: () => void | Promise<void>
  onPageNext?: () => void | Promise<void>
  onCopy?: () => void
  onPaste?: () => void
  isActive?: () => boolean
  isBlocked?: () => boolean
  canGroup?: () => boolean
  canUngroup?: () => boolean
}) {
  const bus = options?.bus ?? useDiagramCommandBus()
  const { fireEmpty, fireTyped } = options?.data ?? createDiagramDataCommandApi(bus)
  const canvas = options?.canvas ?? createDiagramCanvasCommands(bus)

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
      else fireTyped(DiagramCmd.File.SaveAs, { folderId: 'dg-files' })
      return
    }
    if (mod && e.key === 's') {
      e.preventDefault()
      if (options?.onSave) void options.onSave()
      else fireEmpty(DiagramCmd.File.Save)
      return
    }
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      canvas.undo()
      return
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      canvas.redo()
      return
    }
    if (mod && e.key === 'x') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (options?.onCopy) options.onCopy()
      else canvas.copy()
      canvas.deleteSelection()
      return
    }
    if (mod && e.key === 'c') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (options?.onCopy) {
        options.onCopy()
        return
      }
      canvas.copy()
      return
    }
    if (mod && e.key === 'v') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (options?.onPaste) {
        options.onPaste()
        return
      }
      canvas.paste()
      return
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'g') {
      if (isEditableTarget(e.target)) return
      if (!options?.canUngroup?.()) return
      e.preventDefault()
      canvas.ungroup()
      return
    }
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'g') {
      if (isEditableTarget(e.target)) return
      if (!options?.canGroup?.()) return
      e.preventDefault()
      canvas.group()
      return
    }
    if (mod && e.key === 'a') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      canvas.selectAll()
      return
    }
    if (mod && e.key === '0') {
      e.preventDefault()
      canvas.zoomToFit()
      return
    }
    if (mod && e.key === '1') {
      e.preventDefault()
      canvas.zoomReset()
      return
    }
    if (mod && e.key === 'PageUp') {
      e.preventDefault()
      if (options?.onPagePrev) void options.onPagePrev()
      else void canvas.pagePrev()
      return
    }
    if (mod && e.key === 'PageDown') {
      e.preventDefault()
      if (options?.onPageNext) void options.onPageNext()
      else void canvas.pageNext()
      return
    }
    const nudgeDirection = arrowDirections[e.key]
    if (mod && !e.shiftKey && nudgeDirection) {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      canvas.nudgeSelection(nudgeDirection, { fine: true })
      return
    }
    if (!mod && nudgeDirection) {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      canvas.nudgeSelection(nudgeDirection, { large: e.shiftKey })
      return
    }
    if (e.key === 'Escape') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      canvas.formatPainterCancel()
      canvas.clearSelection()
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      canvas.deleteSelection()
      return
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown, true))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown, true))
}
