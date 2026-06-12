import type LogicFlow from '@logicflow/core'
import { isGroupFrameModel } from '@modules/library/diagrams/lib/diagramGroupFrame'

/** 键盘微移时展开组合框成员，避免只移动框而漏掉内容 */
export function collectNudgeTargetNodeIds(lf: LogicFlow, selected: string[]): string[] {
  const toMove: string[] = []
  const seen = new Set<string>()
  const add = (id: string) => {
    if (seen.has(id) || !lf.getNodeModelById(id)) return
    seen.add(id)
    toMove.push(id)
  }

  for (const id of selected) {
    const model = lf.getNodeModelById(id)
    if (!model) continue

    if (isGroupFrameModel(model)) {
      add(id)
      for (const memberId of (model.properties?.dgGroupMembers as string[] | undefined) ?? []) {
        add(memberId)
      }
      continue
    }

    const inSelectedGroup = selected.some((groupId) => {
      const group = lf.getNodeModelById(groupId)
      if (!group || !isGroupFrameModel(group)) return false
      return ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).includes(id)
    })
    if (!inSelectedGroup) add(id)
  }

  return toMove
}
