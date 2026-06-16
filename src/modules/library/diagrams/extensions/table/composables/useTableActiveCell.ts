import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import {
  getTableActiveCell,
  tableActiveCellRevision
} from '@modules/library/diagrams/extensions/table/interaction'

/** 订阅指定表格节点的画布活动单元格 */
export function useTableActiveCell(nodeId: MaybeRefOrGetter<string | undefined>) {
  const activeCell = computed(() => {
    void tableActiveCellRevision.value
    const id = toValue(nodeId)
    return id ? getTableActiveCell(id) : null
  })
  return { activeCell }
}
