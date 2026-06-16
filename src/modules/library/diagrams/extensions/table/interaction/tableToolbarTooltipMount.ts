import {
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  watch,
  withDirectives,
  type App,
  type Directive
} from 'vue'
import Tooltip from 'primevue/tooltip'
import {
  hideTableToolbarTooltip,
  tableToolbarTooltipState
} from '@modules/library/diagrams/extensions/table/interaction/tableCanvasRuntime'
import '@modules/library/diagrams/extensions/table/table-canvas.css'

const ROOT_ID = 'dg-table-toolbar-tooltip-root'

const TableToolbarTooltipHost = defineComponent({
  name: 'TableToolbarTooltipHost',
  setup() {
    const anchorRef = ref<HTMLElement | null>(null)

    const anchorStyle = computed(() => ({
      left: `${tableToolbarTooltipState.left}px`,
      top: `${tableToolbarTooltipState.top}px`,
      width: `${tableToolbarTooltipState.width}px`,
      height: `${tableToolbarTooltipState.height}px`
    }))

    const tooltipText = computed(() =>
      tableToolbarTooltipState.visible && tableToolbarTooltipState.text
        ? tableToolbarTooltipState.text
        : ''
    )

    async function syncTooltipHover(visible: boolean) {
      await nextTick()
      const el = anchorRef.value
      if (!el) return
      el.dispatchEvent(new MouseEvent(visible ? 'mouseenter' : 'mouseleave', { bubbles: true }))
    }

    watch(
      () => [tableToolbarTooltipState.visible, tableToolbarTooltipState.text] as const,
      async ([visible], prev) => {
        const wasVisible = prev?.[0] ?? false
        if (!visible) {
          if (wasVisible) await syncTooltipHover(false)
          return
        }
        if (wasVisible) {
          await syncTooltipHover(false)
          await nextTick()
        }
        await syncTooltipHover(true)
      }
    )

    return () => {
      const node = h('div', {
        ref: anchorRef,
        class: 'dg-table-toolbar-tooltip-anchor',
        style: anchorStyle.value
      })
      const text = tooltipText.value
      if (!text) return node
      return withDirectives(node, [
        [Tooltip as Directive, text, '', { bottom: true, showDelay: 320 }]
      ])
    }
  }
})

let app: App | null = null

export function ensureTableToolbarTooltipHost(): void {
  if (app) return
  const root = document.createElement('div')
  root.id = ROOT_ID
  document.body.appendChild(root)
  app = createApp(TableToolbarTooltipHost)
  app.directive('tooltip', Tooltip)
  app.mount(root)
}

export function disposeTableToolbarTooltipHost(): void {
  hideTableToolbarTooltip()
  app?.unmount()
  document.getElementById(ROOT_ID)?.remove()
  app = null
}
