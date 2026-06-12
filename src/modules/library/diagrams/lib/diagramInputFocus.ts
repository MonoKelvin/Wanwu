export function focusInputText(
  comp: unknown,
  options?: { select?: boolean }
): void {
  const root = (comp as { $el?: unknown } | null | undefined)?.$el
  if (!(root instanceof HTMLElement)) return
  const input = root.querySelector('input')
  if (!(input instanceof HTMLInputElement)) return
  input.focus()
  if (options?.select) input.select()
}
