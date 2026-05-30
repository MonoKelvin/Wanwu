import {
  DISMISSIBLE_PROMPTS_STORAGE_KEY,
  type DismissiblePromptId
} from '@shared/constants/dismissiblePrompts'

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSIBLE_PROMPTS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id) => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeSet(ids: Set<string>) {
  localStorage.setItem(DISMISSIBLE_PROMPTS_STORAGE_KEY, JSON.stringify([...ids]))
}

export function isDismissiblePromptSkipped(id: DismissiblePromptId): boolean {
  return readSet().has(id)
}

export function dismissDismissiblePrompt(id: DismissiblePromptId) {
  const set = readSet()
  set.add(id)
  writeSet(set)
}

export function resetAllDismissiblePrompts() {
  localStorage.removeItem(DISMISSIBLE_PROMPTS_STORAGE_KEY)
}
