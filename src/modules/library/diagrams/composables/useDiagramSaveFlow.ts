import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { DiagramCommandResult } from '@modules/library/diagrams/domain/commands/types'
import { DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'

export interface DiagramSaveFlow {
  saveDocument: (payload?: { title?: string; folderId?: string }) => Promise<boolean>
  saveAsDocument: (payload?: { title?: string; folderId?: string }) => Promise<boolean>
  conflictOpen: Ref<boolean>
  folderPickerOpen: Ref<boolean>
  pickedFolderId: Ref<string>
  pendingSaveAsTitle: Ref<string | undefined>
  folderPickPurpose: Ref<'conflict' | 'saveAs' | null>
  onConflictReload: () => Promise<void>
  onConflictOverwrite: () => Promise<void>
  onConflictSaveAs: () => void
  promptSaveAs: (title?: string) => void
  onFolderPicked: () => Promise<void>
}

export const DIAGRAM_SAVE_FLOW_KEY: InjectionKey<DiagramSaveFlow> = Symbol('diagram-save-flow')

export function provideDiagramSaveFlow(
  bus: IDiagramCommandBus,
  toast: { add: (msg: object) => void }
): DiagramSaveFlow {
  const conflictOpen = ref(false)
  const folderPickerOpen = ref(false)
  const pendingSaveAsTitle = ref<string | undefined>()
  const pickedFolderId = ref(DG_FILES)
  const folderPickPurpose = ref<'conflict' | 'saveAs' | null>(null)
  let conflictResolve: ((ok: boolean) => void) | null = null

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

  async function saveDocument(payload?: { title?: string; folderId?: string }): Promise<boolean> {
    const result = await dispatchSave({
      ...payload,
      folderId: payload?.folderId ?? pickedFolderId.value
    })
    if (result.ok) {
      toast.add({ severity: 'success', summary: '已保存', life: 2000 })
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
    return new Promise((resolve) => {
      conflictResolve = resolve
      conflictOpen.value = true
    })
  }

  async function saveAsDocument(payload?: { title?: string; folderId?: string }): Promise<boolean> {
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
  }

  async function onConflictReload() {
    const result = await bus.dispatch({ type: 'document.reload' })
    if (result.ok) {
      toast.add({ severity: 'info', summary: '已重新加载', life: 2000 })
      conflictResolve?.(true)
    } else {
      toast.add({ severity: 'error', summary: '重新加载失败', detail: result.message, life: 4000 })
      conflictResolve?.(false)
    }
    conflictResolve = null
  }

  async function onConflictOverwrite() {
    await finishConflictSave(() => dispatchSave({ force: true, title: pendingSaveAsTitle.value }))
  }

  function onConflictSaveAs() {
    folderPickPurpose.value = 'conflict'
    folderPickerOpen.value = true
  }

  function promptSaveAs(title?: string) {
    pendingSaveAsTitle.value = title
    folderPickPurpose.value = 'saveAs'
    folderPickerOpen.value = true
  }

  async function onFolderPicked() {
    const ok = await saveAsDocument({
      folderId: pickedFolderId.value,
      title: pendingSaveAsTitle.value
    })
    if (ok) folderPickerOpen.value = false
    if (folderPickPurpose.value === 'conflict') {
      conflictResolve?.(ok)
      conflictResolve = null
    }
    folderPickPurpose.value = null
  }

  const flow: DiagramSaveFlow = {
    saveDocument,
    saveAsDocument,
    conflictOpen,
    folderPickerOpen,
    pickedFolderId,
    pendingSaveAsTitle,
    folderPickPurpose,
    onConflictReload,
    onConflictOverwrite,
    onConflictSaveAs,
    promptSaveAs,
    onFolderPicked
  }

  provide(DIAGRAM_SAVE_FLOW_KEY, flow)
  return flow
}

export function useDiagramSaveFlow(): DiagramSaveFlow {
  const flow = inject(DIAGRAM_SAVE_FLOW_KEY)
  if (!flow) throw new Error('DiagramSaveFlow 未注入')
  return flow
}
