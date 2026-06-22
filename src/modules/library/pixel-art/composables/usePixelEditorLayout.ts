import { ref, watch, type Ref } from 'vue'

const STORAGE_KEY = 'wanwu.pixel-art.editorLayout'

export interface PixelEditorLayoutState {
  sidePanelWidth: number
  sidePanelCollapsed: boolean
  toolStripCollapsed: boolean
}

const DEFAULT_LAYOUT: PixelEditorLayoutState = {
  sidePanelWidth: 280,
  sidePanelCollapsed: false,
  toolStripCollapsed: false
}

function loadLayout(): PixelEditorLayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_LAYOUT }
    return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}

export function usePixelEditorLayout() {
  const layout = ref<PixelEditorLayoutState>(loadLayout())

  watch(
    layout,
    (v) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
    },
    { deep: true }
  )

  function toggleSidePanel() {
    layout.value.sidePanelCollapsed = !layout.value.sidePanelCollapsed
  }

  function setSidePanelWidth(width: number) {
    layout.value.sidePanelWidth = Math.max(220, Math.min(420, width))
  }

  return { layout, toggleSidePanel, setSidePanelWidth }
}

export type { Ref }
