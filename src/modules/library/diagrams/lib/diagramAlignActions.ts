import type { WwIconName } from '@shared/icons/registry'
import type { DiagramAlignMode, DiagramDistributeMode } from '@modules/library/diagrams/lib/diagramNodeLayout'

export const DIAGRAM_ALIGN_ACTIONS: Array<{ mode: DiagramAlignMode; icon: WwIconName; label: string }> = [
  { mode: 'left', icon: 'layout-panel-left', label: '左对齐' },
  { mode: 'center-h', icon: 'align-center-h', label: '水平居中' },
  { mode: 'right', icon: 'layout-panel-right', label: '右对齐' },
  { mode: 'top', icon: 'arrow-up-to-line', label: '顶对齐' },
  { mode: 'center-v', icon: 'align-center-v', label: '垂直居中' },
  { mode: 'bottom', icon: 'arrow-down-from-line', label: '底对齐' }
]

export const DIAGRAM_DISTRIBUTE_ACTIONS: Array<{
  mode: DiagramDistributeMode
  icon: WwIconName
  label: string
}> = [
  { mode: 'horizontal', icon: 'align-distribute-h', label: '水平分布' },
  { mode: 'vertical', icon: 'align-distribute-v', label: '垂直分布' }
]
