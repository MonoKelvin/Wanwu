/** 流程图编辑器快捷键展示文案（与 useDiagramShortcuts 行为一致） */
export const DG_SHORTCUT = {
  save: 'Ctrl + S',
  saveAs: 'Ctrl + Shift + S',
  undo: 'Ctrl + Z',
  redo: 'Ctrl + Y',
  copy: 'Ctrl + C',
  cut: 'Ctrl + X',
  paste: 'Ctrl + V',
  selectAll: 'Ctrl + A',
  delete: 'Del',
  group: 'Ctrl + G',
  ungroup: 'Ctrl + Shift + G',
  zoomFit: 'Ctrl + 0',
  zoomReset: 'Ctrl + 1',
  pagePrev: 'Ctrl + PageUp',
  pageNext: 'Ctrl + PageDown',
  wheelScroll: '滚轮',
  wheelScrollHorizontal: 'Shift + 滚轮',
  wheelZoom: 'Ctrl + 滚轮',
  /** Ctrl/Meta 点选或框选加选 */
  toggleSelect: 'Ctrl + 点击',
  boxSelectAppend: 'Ctrl + 框选',
  boxSelectSubtract: 'Shift + 框选'
} as const
