/** 可「不再提醒」的确认对话框 ID */
export const DISMISSIBLE_PROMPT_IDS = {
  itemDescSave: 'item-desc-save',
  itemDescCancel: 'item-desc-cancel'
} as const

export type DismissiblePromptId =
  (typeof DISMISSIBLE_PROMPT_IDS)[keyof typeof DISMISSIBLE_PROMPT_IDS]

export const DISMISSIBLE_PROMPTS_STORAGE_KEY = 'wanwu.dismissiblePrompts'
