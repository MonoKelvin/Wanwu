import { PixelCmd } from '@modules/library/pixel-art/app/command/domain/ids'
import { onMounted, onUnmounted } from 'vue'
import type { IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'

const TOOL_KEYS: Record<string, ToolId> = {
  b: 'pencil',
  e: 'eraser',
  g: 'fill',
  l: 'line',
  u: 'rect',
  o: 'ellipse',
  i: 'eyedropper',
  m: 'marquee',
  h: 'hand',
  z: 'zoom'
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

export function usePixelShortcuts(options: {
  bus: IPixelCommandBus
  isActive?: () => boolean
  getCanvasWrap?: () => HTMLElement | null
  onSpacePan?: (active: boolean) => void
}) {
  let spaceHeld = false

  function dispatch(type: string, payload?: Record<string, unknown>) {
    void options.bus.dispatch({ type, payload })
  }

  function onKeyDown(e: KeyboardEvent) {
    if (options.isActive && !options.isActive()) return
    const mod = e.ctrlKey || e.metaKey

    if (e.key === ' ' && !isEditableTarget(e.target)) {
      if (!spaceHeld) {
        spaceHeld = true
        options.onSpacePan?.(true)
        e.preventDefault()
      }
      return
    }

    if (mod && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      dispatch(PixelCmd.File.SaveAs)
      return
    }
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault()
      dispatch(PixelCmd.File.Save)
      return
    }
    if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault()
      dispatch('Pixel.File.New')
      return
    }
    if (mod && e.key.toLowerCase() === 'o') {
      e.preventDefault()
      dispatch('Pixel.File.OpenRecent')
      return
    }
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      dispatch(PixelCmd.Document.Undo)
      return
    }
    if (mod && (e.key.toLowerCase() === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      dispatch(PixelCmd.Document.Redo)
      return
    }
    if (mod && e.key === '0') {
      e.preventDefault()
      dispatch(PixelCmd.Document.SetZoom, { zoom: 1 })
      return
    }
    if (mod && e.key === '1') {
      e.preventDefault()
      const wrap = options.getCanvasWrap?.()
      if (wrap) {
        dispatch(PixelCmd.Document.SetZoom, { action: 'fit', width: wrap.clientWidth, height: wrap.clientHeight })
      }
      return
    }
    if (mod && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      dispatch(PixelCmd.Document.SetZoom, { action: 'in' })
      return
    }
    if (mod && e.key === '-') {
      e.preventDefault()
      dispatch(PixelCmd.Document.SetZoom, { action: 'out' })
      return
    }

    if (!mod && !isEditableTarget(e.target)) {
      const tool = TOOL_KEYS[e.key.toLowerCase()]
      if (tool) {
        e.preventDefault()
        dispatch('Pixel.Tool.Select', { tool })
        return
      }
      if (e.key === '[') {
        e.preventDefault()
        dispatch('Pixel.Tool.BrushSize', { delta: -1 })
        return
      }
      if (e.key === ']') {
        e.preventDefault()
        dispatch('Pixel.Tool.BrushSize', { delta: 1 })
        return
      }
      if (e.key.toLowerCase() === 'x') {
        e.preventDefault()
        dispatch('Pixel.Tool.SwapColors')
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === ' ' && spaceHeld) {
      spaceHeld = false
      options.onSpacePan?.(false)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
  })
}
