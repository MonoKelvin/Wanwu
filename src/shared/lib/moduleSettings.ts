/** 按 moduleId 深合并 moduleSettings（overlay 字段覆盖 base） */
export function mergeModuleSettingsMaps(
  base: Record<string, Record<string, unknown>> | undefined,
  overlay: Record<string, Record<string, unknown>> | undefined
): Record<string, Record<string, unknown>> {
  const result = { ...(base ?? {}) }
  for (const [moduleId, modulePatch] of Object.entries(overlay ?? {})) {
    result[moduleId] = { ...(result[moduleId] ?? {}), ...modulePatch }
  }
  return result
}

/** 克隆 moduleSettings，确保嵌套变更可被响应式系统追踪 */
export function cloneModuleSettingsMap(
  input: Record<string, Record<string, unknown>> | undefined
): Record<string, Record<string, unknown>> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, Record<string, unknown>> = {}
  for (const [moduleId, moduleValue] of Object.entries(input)) {
    out[moduleId] = moduleValue && typeof moduleValue === 'object' ? { ...moduleValue } : {}
  }
  return out
}
