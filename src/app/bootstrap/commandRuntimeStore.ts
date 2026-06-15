import type { CommandRuntime } from './createCommandRuntime'

let runtime: CommandRuntime | null = null

export function setCommandRuntime(next: CommandRuntime | null): void {
  runtime = next
}

export function getCommandRuntime(): CommandRuntime | null {
  return runtime
}
