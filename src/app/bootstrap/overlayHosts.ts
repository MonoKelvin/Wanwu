import { ref } from 'vue'

export const confirmDialogMounted = ref(false)
export const dismissibleConfirmMounted = ref(false)

export function ensureConfirmDialogMounted(): void {
  confirmDialogMounted.value = true
}

export function ensureDismissibleConfirmMounted(): void {
  dismissibleConfirmMounted.value = true
}

export function runWhenIdle(task: () => void, timeoutMs = 5000): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout: timeoutMs })
    return
  }
  setTimeout(task, Math.min(timeoutMs, 800))
}
