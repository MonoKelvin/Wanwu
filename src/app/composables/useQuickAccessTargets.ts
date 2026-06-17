import { dispatchQuickAccessTarget } from '@app/modules/quickAccessRegistry'
import type { QuickAccessHit, QuickAccessOpenTarget } from '@shared/types/quickAccess'
import { nextTick } from 'vue'
import { useRouter } from 'vue-router'

export function hitToOpenTarget(hit: QuickAccessHit): QuickAccessOpenTarget {
  return {
    kind: hit.kind,
    id: hit.id,
    itemSource: hit.itemSource,
    itemId: hit.itemId,
    noteId: hit.noteId,
    diagramFileId: hit.diagramFileId,
    linkUrl: hit.linkUrl,
    feedId: hit.feedId,
    musicVideoId: hit.musicVideoId,
    musicArtist: hit.musicArtist,
    musicCoverUrl: hit.musicCoverUrl,
    musicProvider: hit.musicProvider,
    musicTrackKey: hit.musicTrackKey,
    musicPayloadJson: hit.musicPayloadJson
  }
}

export function useQuickAccessTargets() {
  const router = useRouter()

  async function openTarget(target: QuickAccessOpenTarget): Promise<void> {
    await dispatchQuickAccessTarget(target, {
      pushRoute: async (location) => {
        await router.push(location)
      },
      afterRouteReady: () => nextTick()
    })
  }

  return { openTarget, hitToOpenTarget }
}
