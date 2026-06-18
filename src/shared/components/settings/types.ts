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
}

export type WwSettingsField =
  | WwSettingsSegmentField
  | WwSettingsToggleField
  | WwSettingsSelectField

export interface WwSettingsGroupConfig {
  readonly label?: string
  readonly fields: readonly WwSettingsField[]
}
