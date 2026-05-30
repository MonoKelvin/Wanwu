import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { NoteItem } from '@shared/types/notes'
import { canonicalNoteBodyContent } from '@modules/library/notes/lib/noteContentText'

export type NoteSaveUiState = 'idle' | 'saving' | 'timeout' | 'error'

interface UseNotesDraftOptions {
  selected: Ref<NoteItem | null>
  draftTitle: Ref<string>
  draftContent: Ref<string>
  /** 落盘前从 Tiptap 同步最新 HTML，避免草稿与编辑器短暂不一致 */
  beforePersist?: () => void
  persist: (
    noteId: string,
    title: string,
    content: string,
    options?: { touchUpdatedAt?: boolean }
  ) => Promise<void>
  onPersistError?: () => void
}

const DEFAULT_TITLE = '未命名便笺'
const SAVE_DEBOUNCE_MS = 400
const SAVE_TIMEOUT_MS = 10_000

export function useNotesDraft(options: UseNotesDraftOptions) {
  const saveUiState = ref<NoteSaveUiState>('idle')

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  /** 串行保存队列：异步不阻塞编辑，但保证落盘顺序 */
  let saveChain: Promise<void> = Promise.resolve()
  let saveGeneration = 0
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null
  let baselineTitle = ''
  let baselineContent = ''
  let activeNoteId: string | null = null
  let hydrating = false
  /** 每次用户编辑草稿递增，用于判断落盘期间是否又有新操作 */
  let draftRevision = 0
  /** flushDraft 期间传给 persist 的选项（如切换便笺时静默保存） */
  let flushPersistOptions: { touchUpdatedAt?: boolean } | undefined

  const saveUiLabel = computed(() => {
    if (saveUiState.value === 'saving') return '保存中'
    if (saveUiState.value === 'timeout') return '保存超时'
    if (saveUiState.value === 'error') return '保存失败'
    return ''
  })

  const saveUiVisible = computed(() => saveUiState.value !== 'idle')
  const saveUiCancellable = computed(() => saveUiState.value === 'timeout')

  function normalizedTitle(title: string) {
    return title.trim() || DEFAULT_TITLE
  }

  function readDraftSnapshot() {
    return {
      title: normalizedTitle(options.draftTitle.value),
      content: canonicalNoteBodyContent(options.draftContent.value)
    }
  }

  function syncBaselineFromDraft() {
    const snap = readDraftSnapshot()
    baselineTitle = snap.title
    baselineContent = snap.content
  }

  function clearSaveTimeoutTimer() {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }

  function loadDraftFromNote(note: NoteItem) {
    hydrating = true
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    options.draftTitle.value = note.title ?? ''
    options.draftContent.value = canonicalNoteBodyContent(note.content ?? '')
    syncBaselineFromDraft()
    draftRevision = 0
  }

  function finishHydrate() {
    void nextTick(() => {
      void nextTick(() => {
        hydrating = false
      })
    })
  }

  function isDirty(): boolean {
    const snap = readDraftSnapshot()
    return snap.title !== baselineTitle || snap.content !== baselineContent
  }

  /** 本地草稿已与 baseline 对齐，但 store 仍可能是过期落盘结果 */
  function draftDiffersFromStore(): boolean {
    const note = options.selected.value
    if (!note) return false
    const snap = readDraftSnapshot()
    const storeTitle = normalizedTitle(note.title ?? '')
    const storeContent = canonicalNoteBodyContent(note.content ?? '')
    return snap.title !== storeTitle || snap.content !== storeContent
  }

  function needsPersist(): boolean {
    return isDirty() || draftDiffersFromStore()
  }

  function cancelSave() {
    saveGeneration += 1
    clearSaveTimeoutTimer()
    saveUiState.value = 'idle'
  }

  function clearSavingUiIfQuiescent(noteId: string) {
    if (saveUiState.value !== 'saving' && saveUiState.value !== 'timeout') return
    if (options.selected.value?.id !== noteId && activeNoteId !== noteId) {
      saveUiState.value = 'idle'
      return
    }
    if (!needsPersist()) {
      saveUiState.value = 'idle'
    }
  }

  /**
   * 异步落盘一次；仅当落盘期间草稿未再变时更新 baseline（以最后一次操作为准）。
   * @returns 是否已与 baseline 对齐（无更新的未保存编辑）
   */
  async function runSinglePersist(noteId: string, generation: number): Promise<boolean> {
    if (generation !== saveGeneration) return false
    if (options.selected.value?.id !== noteId) return false

    saveUiState.value = 'saving'
    clearSaveTimeoutTimer()
    timeoutTimer = setTimeout(() => {
      if (generation === saveGeneration && saveUiState.value === 'saving') {
        saveUiState.value = 'timeout'
      }
    }, SAVE_TIMEOUT_MS)

    try {
      if (generation !== saveGeneration) return false
      if (options.selected.value?.id !== noteId) return false

      options.beforePersist?.()
      const revisionAtStart = draftRevision

      const toSave = readDraftSnapshot()
      const { title, content } = toSave

      await options.persist(noteId, title, content, flushPersistOptions)

      if (revisionAtStart !== draftRevision) {
        return false
      }

      if (generation !== saveGeneration) {
        return false
      }

      if (options.selected.value?.id !== noteId) {
        return false
      }

      const latest = readDraftSnapshot()
      const matched = latest.title === title && latest.content === content

      if (matched) {
        baselineTitle = title
        baselineContent = content
        if (saveUiState.value === 'saving') {
          saveUiState.value = 'idle'
        }
        return true
      }

      return false
    } catch {
      if (generation !== saveGeneration) return false
      saveUiState.value = 'error'
      options.onPersistError?.()
      return false
    } finally {
      clearSaveTimeoutTimer()
      if (generation !== saveGeneration) {
        if (saveUiState.value === 'saving') {
          saveUiState.value = 'idle'
        }
      } else {
        clearSavingUiIfQuiescent(noteId)
      }
    }
  }

  /** 排空当前便笺的脏数据：多次编辑合并为串行异步保存，以最新草稿为准 */
  function drainSavesForNote(noteId: string): Promise<void> {
    saveChain = saveChain
      .then(async () => {
        if (options.selected.value?.id !== noteId && activeNoteId !== noteId) {
          return
        }
        let guard = 0
        while (needsPersist() && guard < 32) {
          guard += 1
          const generation = saveGeneration
          const settled = await runSinglePersist(noteId, generation)
          if (generation !== saveGeneration) break
          if (settled && !needsPersist()) break
        }
        if (needsPersist() && guard >= 32) {
          scheduleDebouncedSave(noteId)
        }
        clearSavingUiIfQuiescent(noteId)
      })
      .catch(() => {
        /* keep chain alive */
      })
    return saveChain
  }

  function scheduleDebouncedSave(noteId: string) {
    clearDebounceTimer()
    saveTimer = setTimeout(() => {
      saveTimer = null
      void drainSavesForNote(noteId)
    }, SAVE_DEBOUNCE_MS)
  }

  function clearDebounceTimer() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  /** 切换便笺/离开页面前：等待队列排空（不阻塞日常输入） */
  async function flushDraft(persistOptions?: { touchUpdatedAt?: boolean }) {
    clearDebounceTimer()
    const noteId = options.selected.value?.id
    flushPersistOptions = persistOptions
    try {
      if (noteId && needsPersist()) {
        await drainSavesForNote(noteId)
      }
      await saveChain
    } finally {
      flushPersistOptions = undefined
    }
  }

  watch(
    () => options.selected.value?.id ?? null,
    (id, prevId) => {
      activeNoteId = id
      if (!id) {
        hydrating = false
        options.draftTitle.value = ''
        options.draftContent.value = ''
        baselineTitle = ''
        baselineContent = ''
        draftRevision = 0
        return
      }
      const note = options.selected.value
      if (!note) return
      if (id === prevId) return
      loadDraftFromNote(note)
      finishHydrate()
    },
    { immediate: true, flush: 'sync' }
  )

  /** 其他窗口落盘后同步草稿（当前无未保存编辑时） */
  watch(
    () => options.selected.value?.updatedAt,
    () => {
      const note = options.selected.value
      if (!note || hydrating || isDirty() || saveUiState.value === 'saving') return
      loadDraftFromNote(note)
      finishHydrate()
    }
  )

  watch([options.draftTitle, options.draftContent], () => {
    if (hydrating) return
    draftRevision += 1
    const noteId = options.selected.value?.id
    if (!noteId || noteId !== activeNoteId || !needsPersist()) return
    scheduleDebouncedSave(noteId)
  })

  onBeforeUnmount(() => {
    clearDebounceTimer()
    void flushDraft()
  })

  return {
    saveUiState,
    saveUiLabel,
    saveUiVisible,
    saveUiCancellable,
    cancelSave,
    flushDraft
  }
}
