export const DIAGRAM_COMMAND_ERROR_CODES = [
  'NO_SESSION',
  'CONFLICT',
  'CANCELED',
  'VALIDATION',
  'NOT_FOUND',
  'FORBIDDEN',
  'UNKNOWN_COMMAND',
  'INTERNAL'
] as const

export type DiagramCommandErrorCode = (typeof DIAGRAM_COMMAND_ERROR_CODES)[number]

export function diagramError(
  code: DiagramCommandErrorCode,
  message: string
): { ok: false; code: DiagramCommandErrorCode; message: string } {
  return { ok: false, code, message }
}
