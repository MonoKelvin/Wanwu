import type InputText from 'primevue/inputtext'

type InputTextInstance = InstanceType<typeof InputText> & { $el?: HTMLElement }

export function focusInputText(
  comp: InputTextInstance | null | undefined,
  options?: { select?: boolean }
): void {
  const root = comp?.$el
  if (!(root instanceof HTMLElement)) return
  const input = root.querySelector('input')
  if (!(input instanceof HTMLInputElement)) return
  input.focus()
  if (options?.select) input.select()
}
