import { onMounted, onUnmounted, ref } from 'vue'
import { useQuickAccessTargets } from '@modules/quick-access/app/composables/useQuickAccessTargets'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import type { ClipboardAssistPayload } from '@shared/types/quickAccess'

export function useQuickAccessHost() {
  const paletteOpen = ref(false)
  const toast = useWanwuToast()
  const { openTarget } = useQuickAccessTargets()
  const api = window.wanwu?.quickAccess

  function togglePalette() {
    paletteOpen.value = !paletteOpen.value
  }

  function onClipboardMatches(payload: ClipboardAssistPayload) {
    const first = payload.hits[0]
    if (!first) return
    const more =
      payload.hits.length > 1 ? ` 等 ${payload.hits.length} 条` : ''
    toast.info(`万物里可能有：${first.title}${more}`, '剪贴板联想', {
      life: 8000,
      action: {
        label: '查看',
        onClick: () =>
          openTarget({
            kind: first.kind,
            id: first.id,
            itemSource: first.itemSource,
            itemId: first.itemId,
            noteId: first.noteId,
            linkUrl: first.linkUrl,
            feedId: first.feedId
          })
      }
    })
  }

  let stopPalette: (() => void) | undefined
  let stopOpenTarget: (() => void) | undefined
  let stopClipboard: (() => void) | undefined

  onMounted(() => {
    if (!api) return
    stopPalette = api.onTogglePalette(togglePalette)
    stopOpenTarget = api.onOpenTarget((target) => {
      void openTarget(target)
    })
    stopClipboard = api.onClipboardMatches(onClipboardMatches)
  })

  onUnmounted(() => {
    stopPalette?.()
    stopOpenTarget?.()
    stopClipboard?.()
  })

  return { paletteOpen, quickAccessReady: Boolean(api) }
}
