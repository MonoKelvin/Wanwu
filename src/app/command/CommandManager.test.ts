import { describe, expect, it, vi } from 'vitest'
import {
  CommandCatalog,
  CommandDispatcher,
  CommandExecutionLog,
  CommandManager,
  CommandPipeline,
  GuardMiddleware,
  HandlerRegistry,
  type CommandContext,
  type ICommand
} from './index'
import { nowIso } from './utils'

function ctx(scopeId = 'shell'): CommandContext {
  return { scopeId, services: {} }
}

function cmd(type: string, payload: unknown = {}): ICommand {
  return {
    meta: { name: type, type, issuedAt: nowIso(), source: 'ui' },
    payload
  }
}

function createManager(handlers: HandlerRegistry, catalog?: CommandCatalog) {
  const pipeline = new CommandPipeline()
  const cat = catalog ?? new CommandCatalog()
  pipeline.use(new GuardMiddleware(cat))
  const dispatcher = new CommandDispatcher(handlers, pipeline)
  const log = new CommandExecutionLog()
  return { manager: new CommandManager(dispatcher, log), catalog: cat }
}

describe('CommandManager', () => {
  it('C1: unknown type returns CMD_UNKNOWN_TYPE and does not log', async () => {
    const registry = new HandlerRegistry()
    const { manager } = createManager(registry)
    const result = await manager.dispatch(cmd('missing.type'), ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CMD_UNKNOWN_TYPE')
    expect(manager.getLog()).toHaveLength(0)
  })

  it('C2: handler throw becomes CMD_HANDLER_THROW', async () => {
    const registry = new HandlerRegistry()
    registry.register({
      commandType: 'test.throw',
      handle() {
        throw new Error('boom')
      }
    })
    const { manager } = createManager(registry)
    const result = await manager.dispatch(cmd('test.throw'), ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CMD_HANDLER_THROW')
    expect(manager.getLog()).toHaveLength(1)
  })

  it('C3: record false skips log', async () => {
    const registry = new HandlerRegistry()
    registry.register({
      commandType: 'test.ok',
      handle: () => ({ ok: true })
    })
    const { manager } = createManager(registry)
    await manager.dispatch(cmd('test.ok'), ctx(), { record: false })
    expect(manager.getLog()).toHaveLength(0)
  })

  it('C4: repeatLast without history', async () => {
    const registry = new HandlerRegistry()
    const { manager } = createManager(registry)
    const result = await manager.repeatLast(ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CMD_NO_LAST_ENTRY')
  })

  it('C5: canExecute false short-circuits', async () => {
    const registry = new HandlerRegistry()
    registry.register({
      commandType: 'test.guarded',
      handle: () => ({ ok: true })
    })
    const catalog = new CommandCatalog()
    catalog.register({
      type: 'test.guarded',
      title: 'Guarded',
      canExecute: () => false
    })
    const { manager } = createManager(registry, catalog)
    const result = await manager.dispatch(cmd('test.guarded'), ctx())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CMD_NOT_EXECUTABLE')
  })

  it('C6: dispatchBatch stops on error', async () => {
    const registry = new HandlerRegistry()
    registry.register({
      commandType: 'test.fail',
      handle: () => ({ ok: false, code: 'X', message: 'fail' })
    })
    registry.register({
      commandType: 'test.ok',
      handle: () => ({ ok: true })
    })
    const pipeline = new CommandPipeline()
    const dispatcher = new CommandDispatcher(registry, pipeline)
    const results = await dispatcher.dispatchBatch(
      [cmd('test.fail'), cmd('test.ok')],
      ctx()
    )
    expect(results).toHaveLength(1)
  })

  it('C8: circular payload stored with error marker', async () => {
    const registry = new HandlerRegistry()
    registry.register({
      commandType: 'test.ok',
      handle: () => ({ ok: true })
    })
    const { manager } = createManager(registry)
    const payload: Record<string, unknown> = {}
    payload.self = payload
    await manager.dispatch(cmd('test.ok', payload), ctx())
    const entry = manager.getLastEntry()
    expect(entry?.payload).toEqual({ _error: 'UNSERIALIZABLE_PAYLOAD' })
  })

  it('logs successful dispatch and repeatLast replays', async () => {
    const registry = new HandlerRegistry()
    let count = 0
    registry.register({
      commandType: 'test.count',
      handle: () => {
        count += 1
        return { ok: true, data: count }
      }
    })
    const { manager } = createManager(registry)
    await manager.dispatch(cmd('test.count', { n: 1 }), ctx())
    expect(manager.getRecent(1)).toHaveLength(1)
    await manager.repeatLast(ctx())
    expect(count).toBe(2)
  })

  it('onLogChange notifies listeners', async () => {
    const registry = new HandlerRegistry()
    registry.register({ commandType: 'test.ok', handle: () => ({ ok: true }) })
    const { manager } = createManager(registry)
    const listener = vi.fn()
    manager.onLogChange(listener)
    await manager.dispatch(cmd('test.ok'), ctx())
    expect(listener).toHaveBeenCalled()
  })
})
