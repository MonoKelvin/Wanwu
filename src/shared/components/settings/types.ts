export interface WwSettingsOption<T = string> {
  readonly label: string
  readonly value: T
}

interface WwSettingsFieldBase {
  readonly label: string
  readonly subtitle?: string
  readonly onUpdate: (value: unknown) => void | Promise<void>
}

export interface WwSettingsSegmentField extends WwSettingsFieldBase {
  readonly type: 'segment'
  readonly options: readonly WwSettingsOption<string>[]
  readonly wide?: boolean
  readonly modelValue: string
}

export interface WwSettingsToggleField extends WwSettingsFieldBase {
  readonly type: 'toggle'
  readonly ariaLabel?: string
  readonly modelValue: boolean
}

export interface WwSettingsSelectField extends WwSettingsFieldBase {
  readonly type: 'select'
  readonly options: readonly WwSettingsOption<unknown>[]
  readonly modelValue: unknown
  readonly disabled?: boolean
  readonly size?: 'narrow' | 'default' | 'block'
}

export type WwSettingsInputSize = 'narrow' | 'default'

export interface WwSettingsTextField extends WwSettingsFieldBase {
  readonly type: 'text'
  readonly modelValue: string
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly ariaLabel?: string
  readonly size?: WwSettingsInputSize
  /** 输入防抖毫秒；默认 0 即立即提交 */
  readonly debounceMs?: number
}

export type WwSettingsField =
  | WwSettingsSegmentField
  | WwSettingsToggleField
  | WwSettingsSelectField
  | WwSettingsTextField

export interface WwSettingsGroupConfig {
  readonly label?: string
  readonly fields: readonly WwSettingsField[]
}
