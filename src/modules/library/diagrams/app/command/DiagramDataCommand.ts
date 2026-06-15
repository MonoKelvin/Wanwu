/**
 * 数据命令层：只操作 session / port / repo / 事务，不包含 UI 副作用。
 * 注册在 DiagramCommandRegistry，由 bus.dispatch(diagramCmd(...)) 触发。
 */
export {
  DiagramAppCommandBase as DiagramDataCommandBase,
  type IDiagramAppCommand as IDiagramDataCommand,
  type DiagramCommandExecutionContext
} from '@modules/library/diagrams/app/command/DiagramAppCommand'
