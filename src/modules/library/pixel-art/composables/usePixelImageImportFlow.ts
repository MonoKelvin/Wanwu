import { ref } from 'vue'
import type { Router } from 'vue-router'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import { PA_FILES } from '@modules/library/pixel-art/domain/meta'
import { LIBRARY_PIXEL_ART_EDITOR_ROUTE } from '@modules/library/pixel-art/domain/meta'
import { usePixelCatalogCommands } from '@modules/library/pixel-art/composables/usePixelCatalogCommands'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import type { PixelImportSource } from '@modules/library/pixel-art/components/PixelImportImageDialog.vue'

export function usePixelImageImportFlow(options?: { router?: Router }) {
  const toast = useWanwuToast()
  const catalog = usePixelCatalogCommands()
  const store = usePixelArtStore()

  const importDialogOpen = ref(false)
  const importSource = ref<PixelImportSource | null>(null)
  const importBusy = ref(false)

  async function startImportLocalImage() {
    if (importBusy.value) return
    const pick = await window.wanwu.shell.pickImageFile()
    if (!pick.ok || pick.canceled) return
    if (!pick.path) {
      toast.error('未选择图片')
      return
    }
    importSource.value = { kind: 'path', path: pick.path }
    importDialogOpen.value = true
  }

  function startImportOnlineImage() {
    importSource.value = null
    importDialogOpen.value = true
  }

  async function onImportDialogConfirm(payload: { title: string; content: PixelDocument }) {
    importDialogOpen.value = false
    importSource.value = null
    importBusy.value = true
    try {
      const result = await catalog.file.create(
        PA_FILES,
        payload.title,
        payload.content.meta.width,
        payload.content.meta.height,
        payload.content
      )
      if (!result.ok) {
        toast.error(result.message ?? '导入保存失败')
        return
      }
      const record = result.data as { meta?: { id: string } } | undefined
      const fileId = record?.meta?.id
      if (!fileId) {
        toast.error('导入保存失败')
        return
      }
      toast.success('已导入并保存')
      await store.loadRecent(24)
      if (options?.router) {
        await pushShellRoute(options.router, {
          name: LIBRARY_PIXEL_ART_EDITOR_ROUTE,
          params: { fileId }
        })
      }
    } finally {
      importBusy.value = false
    }
  }

  return {
    importDialogOpen,
    importSource,
    importBusy,
    startImportLocalImage,
    startImportOnlineImage,
    onImportDialogConfirm
  }
}
