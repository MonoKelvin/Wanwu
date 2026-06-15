import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { DiagramFileSaveParams } from '@modules/library/diagrams/app/command/domain/payloads'
import { DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'
import { createDiagramFileCommands } from '@modules/library/diagrams/composables/useDiagramFileCommands'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import {
  adaptPrimeToast,
  runForceSaveUiCommand,
  runReloadDocumentUiCommand,
  runSaveAsDocumentUiCommand,
  runSaveDocumentUiCommand
} from '@modules/library/diagrams/app/command/ui/fileSaveUiCommands'

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
  toast: { add: (msg: object) => void },
  options?: { onDocumentSaved?: () => void }
): DiagramSaveFlow {
  const file = createDiagramFileCommands(bus)
  const ui = adaptPrimeToast(toast)
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

  function openConflictDialog(title?: string) {
    if (conflictOpen.value) return
    pendingSaveAsTitle.value = title
    conflictOpen.value = true
  }

  async function saveDocument(payload?: { title?: string; folderId?: string }): Promise<boolean> {
    isSaving.value = true
    try {
      const savePayload: DiagramFileSaveParams = {
        ...payload,
        folderId: payload?.folderId ?? pickedFolderId.value
      }
      const result = await runSaveDocumentUiCommand(file, savePayload, ui, {
        onDocumentSaved: options?.onDocumentSaved
      })
      if (result.ok) return true
      if (result.code === 'CANCELED') return false
      if (result.code !== 'CONFLICT') return false
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
      return await runSaveAsDocumentUiCommand(
        file,
        {
          folderId: payload?.folderId ?? pickedFolderId.value,
          title: payload?.title
        },
        ui,
        { onDocumentSaved: options?.onDocumentSaved }
      )
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
    const result = await runReloadDocumentUiCommand(file, ui)
    if (result.ok) {
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
    const ok = await runForceSaveUiCommand(
      file,
      { force: true, title: pendingSaveAsTitle.value },
      ui,
      { onDocumentSaved: options?.onDocumentSaved }
    )
    isSaving.value = false
    if (ok) {
      conflictResolve?.(true)
      conflictResolve = null
      conflictOpen.value = false
    } else {
      conflictResolve?.(false)
      conflictResolve = null
    }
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
