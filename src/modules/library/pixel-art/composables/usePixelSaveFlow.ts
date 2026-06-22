import type { Ref } from 'vue'
import { ref } from 'vue'
import type { Router } from 'vue-router'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import { PA_FILES } from '@modules/library/pixel-art/domain/meta'
import { pushShellRoute } from '@app/composables/shellNavigation'

type SaveOutcome = 'ok' | 'needs_save_as' | 'failed'

export function usePixelSaveFlow(
  sessionRef: Ref<PixelEditorSession | null>,
  router: Router,
  options?: {
    onError?: (msg: string) => void
    onReload?: () => void | Promise<void>
  }
) {
  const conflictOpen = ref(false)
  let conflictResolve: ((outcome: SaveOutcome) => void) | null = null

  function finishConflict(outcome: SaveOutcome) {
    conflictOpen.value = false
    conflictResolve?.(outcome)
    conflictResolve = null
  }

  async function saveDocument(force = false): Promise<SaveOutcome> {
    const session = sessionRef.value
    if (!session) return 'failed'
    const result = await session.save(force)
    if (result.message === 'needs_save_as') {
      await saveAsNew(PA_FILES)
      return 'ok'
    }
    if (result.reason === 'conflict') {
      return new Promise((resolve) => {
        conflictResolve = resolve
        conflictOpen.value = true
      })
    }
    if (!result.ok) {
      options?.onError?.(result.message ?? '保存失败')
      return 'failed'
    }
    return 'ok'
  }

  async function saveAsNew(folderId: string) {
    const session = sessionRef.value
    if (!session?.content) return
    const title = session.content.meta.title
    await session.saveAs(folderId, title)
    if (session.fileId) {
      await pushShellRoute(router, {
        name: 'pixel-art-editor',
        params: { fileId: session.fileId }
      })
    }
  }

  async function promptSaveAs() {
    await saveAsNew(PA_FILES)
  }

  function onConflictDismiss() {
    if (!conflictResolve) return
    finishConflict('failed')
  }

  async function onConflictReload() {
    if (!conflictResolve) return
    try {
      await options?.onReload?.()
      finishConflict('ok')
    } catch (err) {
      options?.onError?.(err instanceof Error ? err.message : '重新加载失败')
      finishConflict('failed')
    }
  }

  async function onConflictOverwrite() {
    if (!conflictResolve) return
    const outcome = await saveDocument(true)
    finishConflict(outcome)
  }

  function onConflictSaveAs() {
    if (!conflictResolve) return
    finishConflict('failed')
    void promptSaveAs()
  }

  return {
    saveDocument,
    saveAsNew,
    promptSaveAs,
    conflictOpen,
    onConflictDismiss,
    onConflictReload,
    onConflictOverwrite,
    onConflictSaveAs
  }
}
