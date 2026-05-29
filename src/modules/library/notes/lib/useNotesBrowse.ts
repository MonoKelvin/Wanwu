import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@shared/stores/notes'
import { noteMatchesQuery } from '@modules/library/notes/lib/noteContentText'
import { sortNotesList } from '@modules/library/notes/lib/noteListOrder'

/**
 * 便笺主界面：搜索 + 列表 + 选中 + 右侧栏显隐（单一状态源）
 *
 * 无搜索：全量列表；无选中 → 右侧空状态提示；有选中 → 编辑器
 * 有搜索有结果：默认不选中、隐藏右侧；可点选
 * 有搜索无结果：侧栏大空态、隐藏右侧
 * 清空搜索：恢复搜索前选中，或保留搜索期间用户点选的项
 */
export function useNotesBrowse() {
  const notesStore = useNotesStore()
  const { notes, selectedNoteId, selectedNote, loading } = storeToRefs(notesStore)

  const searchQuery = ref('')
  const selectionBeforeSearch = ref<string | null>(null)
  const pickedInSearch = ref(false)

  const trimmedQuery = computed(() => searchQuery.value.trim())
  const isSearchActive = computed(() => Boolean(trimmedQuery.value))

  const listNotes = computed(() => {
    const sorted = sortNotesList(notes.value)
    const q = trimmedQuery.value
    if (!q) return sorted
    return sorted.filter((note) => noteMatchesQuery(note.title, note.content, q))
  })

  const isSearchNoMatch = computed(
    () => isSearchActive.value && notes.value.length > 0 && listNotes.value.length === 0
  )

  /** 是否展示右侧栏（空状态提示或编辑器） */
  const showRightPane = computed(() => {
    if (isSearchNoMatch.value) return false
    if (isSearchActive.value && !pickedInSearch.value) return false
    return true
  })

  /** 侧栏高亮：搜索中且尚未点选时不显示选中态；无效 id 不高亮 */
  const sidebarSelectedId = computed(() => {
    if (isSearchActive.value && !pickedInSearch.value) return null
    return validNoteId(selectedNoteId.value)
  })

  const showPickHint = computed(
    () =>
      showRightPane.value &&
      !selectedNote.value &&
      !loading.value &&
      notes.value.length > 0
  )

  function validNoteId(id: string | null | undefined): string | null {
    if (!id) return null
    return notes.value.some((n) => n.id === id) ? id : null
  }

  function onSearchEnter() {
    selectionBeforeSearch.value = selectedNoteId.value
    pickedInSearch.value = false
    // 不清空 store 选中，避免销毁编辑器；右侧与侧栏高亮由 pickedInSearch 控制
  }

  function onSearchLeave() {
    if (pickedInSearch.value) {
      const current = validNoteId(selectedNoteId.value)
      if (!current) notesStore.setSelected(validNoteId(selectionBeforeSearch.value))
    } else {
      notesStore.setSelected(validNoteId(selectionBeforeSearch.value))
    }
    selectionBeforeSearch.value = null
    pickedInSearch.value = false
  }

  watch(trimmedQuery, (q, prev) => {
    const next = q.trim()
    const old = (prev ?? '').trim()
    if (next && !old) onSearchEnter()
    else if (!next && old) onSearchLeave()
  })

  function markPickedInSearch() {
    if (isSearchActive.value) pickedInSearch.value = true
  }

  async function loadNotes() {
    await notesStore.loadAll()
  }

  return {
    searchQuery,
    notes,
    selectedNoteId,
    selectedNote,
    sidebarSelectedId,
    loading,
    listNotes,
    isSearchActive,
    isSearchNoMatch,
    showRightPane,
    showPickHint,
    pickedInSearch,
    markPickedInSearch,
    loadNotes
  }
}
