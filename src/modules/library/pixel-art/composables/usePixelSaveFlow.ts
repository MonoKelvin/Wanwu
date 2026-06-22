import type { Ref } from 'vue'
import type { Router } from 'vue-router'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import { PA_FILES } from '@modules/library/pixel-art/domain/folderIds'
import { pushShellRoute } from '@app/composables/shellNavigation'

export function usePixelSaveFlow(
  sessionRef: Ref<PixelEditorSession | null>,
  router: Router,
  onError?: (msg: string) => void
) {
  async function saveDocument(force = false): Promise<'ok' | 'needs_save_as' | 'failed'> {
    const session = sessionRef.value
    if (!session) return 'failed'
    const result = await session.save(force)
    if (result.message === 'needs_save_as') {
      await saveAsNew(PA_FILES)
      return 'ok'
    }
    if (result.reason === 'conflict') {
      const action = confirm('文件已被其他窗口修改。确定覆盖保存？取消则放弃本次保存。')
      if (action) return saveDocument(true)
      return 'failed'
    }
    if (!result.ok) {
      onError?.(result.message ?? '保存失败')
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

  return { saveDocument, saveAsNew }
}
