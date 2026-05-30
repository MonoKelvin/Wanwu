import { nextTick, ref } from 'vue'

export interface FormFieldValidator {
  key: string
  valid: () => boolean
}

/**
 * 表单必填/校验失败时：高亮对应控件并抖动，不用顶部汇总错误条。
 */
export function useFormFieldHighlight() {
  const invalidKeys = ref(new Set<string>())
  const shakeTick = ref<Record<string, number>>({})

  function clearField(key: string) {
    if (!invalidKeys.value.has(key)) return
    const next = new Set(invalidKeys.value)
    next.delete(key)
    invalidKeys.value = next
  }

  function clearAll() {
    invalidKeys.value = new Set()
    shakeTick.value = {}
  }

  function markInvalid(keys: string | string[]) {
    const list = Array.isArray(keys) ? keys : [keys]
    const next = new Set(invalidKeys.value)
    const ticks = { ...shakeTick.value }
    for (const key of list) {
      next.add(key)
      ticks[key] = (ticks[key] ?? 0) + 1
    }
    invalidKeys.value = next
    shakeTick.value = ticks
  }

  function isInvalid(key: string): boolean {
    return invalidKeys.value.has(key)
  }

  /** 包在 label + 控件外的容器 class */
  function fieldWrapClass(key: string, extra?: string | string[]): string {
    const parts = ['ww-form-field']
    if (extra) {
      const extras = Array.isArray(extra) ? extra : [extra]
      parts.push(...extras.filter(Boolean))
    }
    if (isInvalid(key)) {
      parts.push('ww-form-field--invalid', 'ww-form-field--shake')
    }
    return parts.join(' ')
  }

  /** 用于 :key，重复提交时重新触发抖动动画 */
  function shakeKey(key: string): number {
    return shakeTick.value[key] ?? 0
  }

  /**
   * 按顺序校验；失败字段全部高亮，并可选聚焦第一个失败项。
   */
  async function validate(
    rules: FormFieldValidator[],
    options?: { focusFirst?: (key: string) => void }
  ): Promise<boolean> {
    const failed = rules.filter((r) => !r.valid()).map((r) => r.key)
    if (failed.length === 0) {
      clearAll()
      return true
    }
    markInvalid(failed)
    await nextTick()
    options?.focusFirst?.(failed[0]!)
    return false
  }

  return {
    clearField,
    clearAll,
    markInvalid,
    isInvalid,
    fieldWrapClass,
    shakeKey,
    validate
  }
}
