import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { DiagramCommandResult } from '@modules/library/diagrams/domain/commands/types'
import { DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'

export interface DiagramSaveFlow {
  saveDocument: (payload?: { title?: string; folderId?: string }) => Promise<boolean>
  saveAsDocument: (payload?: { title?: string; folderId?: string }) => Promise<boolean>
  isSaving: Ref<boolean>
  conflictOpen: Ref<boolean>
  folderPickerOpen: Ref<boolean>
  pickedFolderId: Ref<string>
  pendingSaveAsTitle: Ref<string | undefined>
  folderPickPurpose: Ref<'conflict' | 'saveAs' | null>
  onConflictDismiss: () => void
  onConflictReload: () => Promise<void>
  onConflictOverwrite: () => Promise<void>
  onConflictSaveAs: () => void
  promptSaveAs: (title?: string) => void
  onFolderPicked: () => Promise<void>
  onFolderPickerCancel: () => void
  openConflictDialog: (title?: string) => void
}

export const DIAGRAM_SAVE_FLOW_KEY: InjectionKey<DiagramSaveFlow> = Symbol('diagram-save-flow')

export function provideDiagramSaveFlow(
  bus: IDiagramCommandBus,
  toast: { add: (msg: object) => void }
): DiagramSaveFlow {
  const isSaving = ref(false)
  const conflictOpen = ref(false)
  const folderPickerOpen = ref(false)
  const pendingSaveAsTitle = ref<string | undefined>()
  const pickedFolderId = ref(DG_FILES)
  const folderPickPurpose = ref<'conflict' | 'saveAs' | null>(null)
  let conflictResolve: ((ok: boolean) => void) | null = null
  let folderPickerBusy = false
  let skipFolderPickerCancelHide = false

  function dismissConflictPending(ok = false) {
    conflictResolve?.(ok)
    conflictResolve = null
    isSaving.value = false
  }

  async function dispatchSave(payload?: Record<string, unknown>): Promise<DiagramCommandResult> {
    return bus.dispatch({ type: 'document.save', payload })
  }

  async function finishConflictSave(action: () => Promise<DiagramCommandResult>): Promise<boolean> {
    const result = await action()
    if (result.ok) {
      toast.add({ severity: 'success', summary: '已保存', life: 2000 })
      conflictResolve?.(true)
      conflictResolve = null
      return true
    }
    toast.add({
      severity: 'error',
      summary: '保存失败',
      detail: result.message,
      life: 4000
    })
    conflictResolve?.(false)
    conflictResolve = null
    return false
  }

  function openConflictDialog(title?: string) {
    if (conflictOpen.value) return
    pendingSaveAsTitle.value = title
    conflictOpen.value = true
  }

  async function saveDocument(payload?: { title?: string; folderId?: string }): Promise<boolean> {
    isSaving.value = true
    try {
      const result = await dispatchSave({
        ...payload,
        folderId: payload?.folderId ?? pickedFolderId.value
      })
      if (result.ok) {
        if (!(result.data as { noop?: boolean } | undefined)?.noop) {
          toast.add({ severity: 'success', summary: '已保存', life: 2000 })
        }
        return true
      }
      if (result.code === 'CANCELED') return false
      if (result.code !== 'CONFLICT') {
        toast.add({
          severity: 'error',
          summary: '保存失败',
          detail: result.message,
          life: 4000
        })
        return false
      }
      pendingSaveAsTitle.value = payload?.title
      isSaving.value = false
      return new Promise((resolve) => {
        conflictResolve = resolve
        openConflictDialog(payload?.title)
      })
    } finally {
      isSaving.value = false
    }
  }

  async function saveAsDocument(payload?: { title?: string; folderId?: string }): Promise<boolean> {
    isSaving.value = true
    try {
      const result = await bus.dispatch({
        type: 'document.saveAs',
        payload: { folderId: payload?.folderId ?? pickedFolderId.value, title: payload?.title }
      })
      if (result.ok) {
        toast.add({ severity: 'success', summary: '已另存为', life: 2000 })
        return true
      }
      toast.add({
        severity: 'error',
        summary: '另存失败',
        detail: result.message,
        life: 4000
      })
      return false
    } finally {
      isSaving.value = false
    }
  }

  function onConflictDismiss() {
    if (!conflictResolve) return
    if (folderPickPurpose.value === 'conflict') return
    dismissConflictPending(false)
  }

  async function onConflictReload() {
    const result = await bus.dispatch({ type: 'document.reload' })
    if (result.ok) {
      toast.add({ severity: 'info', summary: '已重新加载', life: 2000 })
      conflictResolve?.(true)
      conflictResolve = null
      isSaving.value = false
      conflictOpen.value = false
      return
    }
    toast.add({ severity: 'error', summary: '重新加载失败', detail: result.message, life: 4000 })
    conflictResolve?.(false)
    conflictResolve = null
    isSaving.value = false
  }

  async function onConflictOverwrite() {
    const ok = await finishConflictSave(() =>
      dispatchSave({ force: true, title: pendingSaveAsTitle.value })
    )
    isSaving.value = false
    if (ok) conflictOpen.value = false
  }

  function onConflictSaveAs() {
    folderPickPurpose.value = 'conflict'
    conflictOpen.value = false
    folderPickerOpen.value = true
  }

  function promptSaveAs(title?: string) {
    pendingSaveAsTitle.value = title
    folderPickPurpose.value = 'saveAs'
    folderPickerOpen.value = true
  }

  async function onFolderPicked() {
    if (folderPickerBusy) return
    folderPickerBusy = true
    const purpose = folderPickPurpose.value
    try {
      const ok = await saveAsDocument({
        folderId: pickedFolderId.value,
        title: pendingSaveAsTitle.value
      })
      if (ok) {
        skipFolderPickerCancelHide = true
        folderPickerOpen.value = false
      }
      if (purpose === 'conflict') {
        conflictResolve?.(ok)
        conflictResolve = null
        isSaving.value = false
      }
    } finally {
      folderPickPurpose.value = null
      folderPickerBusy = false
    }
  }

  function onFolderPickerCancel() {
    if (skipFolderPickerCancelHide) {
      skipFolderPickerCancelHide = false
      return
    }
    if (folderPickerBusy) return
    if (folderPickPurpose.value === 'conflict') {
      dismissConflictPending(false)
    }
    folderPickPurpose.value = null
    folderPickerOpen.value = false
  }

  const flow: DiagramSaveFlow = {
    saveDocument,
    saveAsDocument,
    isSaving,
    conflictOpen,
    folderPickerOpen,
    pickedFolderId,
    pendingSaveAsTitle,
    folderPickPurpose,
    onConflictDismiss,
    onConflictReload,
    onConflictOverwrite,
    onConflictSaveAs,
    promptSaveAs,
    onFolderPicked,
    onFolderPickerCancel,
    openConflictDialog
  }

  provide(DIAGRAM_SAVE_FLOW_KEY, flow)
  return flow
}

export function useDiagramSaveFlow(): DiagramSaveFlow {
  const flow = inject(DIAGRAM_SAVE_FLOW_KEY)
  if (!flow) throw new Error('DiagramSaveFlow 未注入')
  return flow
}
