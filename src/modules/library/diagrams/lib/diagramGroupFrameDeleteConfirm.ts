import { nextTick, reactive } from 'vue'

export type DiagramGroupFrameDeleteChoice = 'cancel' | 'frame-only' | 'with-contents'

type Resolver = (choice: DiagramGroupFrameDeleteChoice) => void

/** 当前打开文档内有效；关闭/重开文档后重置 */
let sessionPreference: Exclude<DiagramGroupFrameDeleteChoice, 'cancel'> | null = null

export const diagramGroupFrameDeleteConfirmState = reactive({
  open: false,
  header: '删除选择框',
  message: '',
  skipChecked: false,
  _resolve: null as Resolver | null
})

export function resetDiagramGroupFrameDeleteSession(): void {
  sessionPreference = null
  diagramGroupFrameDeleteConfirmState.open = false
  diagramGroupFrameDeleteConfirmState.skipChecked = false
  diagramGroupFrameDeleteConfirmState._resolve?.('cancel')
  diagramGroupFrameDeleteConfirmState._resolve = null
}

export function getDiagramGroupFrameDeleteSessionPreference():
  | Exclude<DiagramGroupFrameDeleteChoice, 'cancel'>
  | null {
  return sessionPreference
}

function rememberSessionPreference(choice: Exclude<DiagramGroupFrameDeleteChoice, 'cancel'>): void {
  sessionPreference = choice
}

function finish(choice: DiagramGroupFrameDeleteChoice): void {
  diagramGroupFrameDeleteConfirmState.open = false
  diagramGroupFrameDeleteConfirmState._resolve?.(choice)
  diagramGroupFrameDeleteConfirmState._resolve = null
}

export function resolveDiagramGroupFrameDeleteConfirm(
  choice: DiagramGroupFrameDeleteChoice
): void {
  if (
    diagramGroupFrameDeleteConfirmState.skipChecked &&
    (choice === 'frame-only' || choice === 'with-contents')
  ) {
    rememberSessionPreference(choice)
  }
  finish(choice)
}

export function cancelDiagramGroupFrameDeleteConfirm(): void {
  finish('cancel')
}

export function askDiagramGroupFrameDeleteConfirm(groupFrameCount: number): Promise<DiagramGroupFrameDeleteChoice> {
  const pref = getDiagramGroupFrameDeleteSessionPreference()
  if (pref) return Promise.resolve(pref)

  const message =
    groupFrameCount > 1
      ? `将删除 ${groupFrameCount} 个选择框。是否同时删除框内的图元？选「否」仅删除选择框，保留内部图元。`
      : '将删除此选择框。是否同时删除框内的图元？选「否」仅删除选择框，保留内部图元。'

  return new Promise((resolve) => {
    void nextTick(() => {
      diagramGroupFrameDeleteConfirmState.message = message
      diagramGroupFrameDeleteConfirmState.skipChecked = false
      diagramGroupFrameDeleteConfirmState._resolve = resolve
      diagramGroupFrameDeleteConfirmState.open = true
    })
  })
}
