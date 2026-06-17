import type { NotesPopoutRestoreMode } from '@shared/types/settings'

export const NOTES_POPOUT_RESTORE_OPTIONS: Array<{
  label: string
  value: NotesPopoutRestoreMode
}> = [
  { label: '启动软件', value: 'on-startup' },
  { label: '进入便笺', value: 'on-enter-notes' },
  { label: '不自动还原', value: 'never' }
]
