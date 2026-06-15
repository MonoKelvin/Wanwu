import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import { useDiagramDataCommand } from '@modules/library/diagrams/composables/useDiagramDataCommand'

/** 页面（Page）数据命令封装 */
export function useDiagramPageCommands() {
  const { dispatch, dispatchEmpty, dispatchTyped } = useDiagramDataCommand()

  return {
    switch: (pageId: string) => dispatchTyped(DiagramCmd.Page.Switch, { pageId }),
    add: () => dispatchEmpty(DiagramCmd.Page.Add),
    rename: (pageId: string, name: string) => dispatchTyped(DiagramCmd.Page.Rename, { pageId, name }),
    delete: (pageId: string) => dispatchTyped(DiagramCmd.Page.Delete, { pageId }),
    duplicate: (pageId: string) => dispatchTyped(DiagramCmd.Page.Duplicate, { pageId }),
    prev: () => dispatchEmpty(DiagramCmd.Page.Prev),
    next: () => dispatchEmpty(DiagramCmd.Page.Next),
    dispatch,
    dispatchEmpty
  }
}
