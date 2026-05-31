import { nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useItemDetailNavigation } from '@app/composables/useItemDetailNavigation'
import { useNotesStore } from '@shared/stores/notes'
import type { QuickAccessHit, QuickAccessOpenTarget } from '@shared/types/quickAccess'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

export function hitToOpenTarget(hit: QuickAccessHit): QuickAccessOpenTarget {
  return {
    kind: hit.kind,
    id: hit.id,
    itemSource: hit.itemSource,
    itemId: hit.itemId,
    noteId: hit.noteId,
    linkUrl: hit.linkUrl,
    feedId: hit.feedId
  }
}

export function useQuickAccessTargets() {
  const router = useRouter()
  const { openItemDetail } = useItemDetailNavigation()
  const notesStore = useNotesStore()

  function libraryHandbookPath(): string {
    return router.resolve({ name: 'library-illustrated-handbook' }).fullPath
  }

  /** 打开图鉴条目前，先进入全库图鉴列表（返回路径固定为图鉴首页） */
  async function openLibraryItem(source: string, id: string): Promise<void> {
    const handbookPath = libraryHandbookPath()
    const route = router.currentRoute.value

    if (!isItemDetailRoute(route.name)) {
      if (route.name !== 'library-illustrated-handbook') {
        await router.push({ name: 'library-illustrated-handbook' })
        await nextTick()
      }
    }

    await openItemDetail({ source, id }, handbookPath)
  }

  async function openTarget(target: QuickAccessOpenTarget): Promise<void> {
    switch (target.kind) {
      case 'library':
      case 'favorite': {
        const id = target.itemId ?? target.id
        const source = target.itemSource ?? 'library'
        if (!id) return
        if (source === 'library') {
          await openLibraryItem(source, id)
          break
        }
        if (source === 'rss') {
          await router.push({ name: 'rss' })
          await nextTick()
          await openItemDetail({ source, id })
          break
        }
        await openLibraryItem('library', id)
        break
      }
      case 'note': {
        const noteId = target.noteId ?? target.id
        if (!noteId) return
        if (!notesStore.notes.length) await notesStore.loadAll()
        await router.push({ name: 'library-notes' })
        await nextTick()
        notesStore.setSelected(noteId)
        break
      }
      case 'link': {
        if (target.linkUrl) await window.wanwu.shell.openExternal(target.linkUrl)
        break
      }
      case 'rss': {
        if (target.feedId) {
          await router.push({ name: 'rss', params: { feedId: target.feedId } })
        } else {
          await router.push({ name: 'rss' })
        }
        break
      }
    }
  }

  return { openTarget, hitToOpenTarget }
}
