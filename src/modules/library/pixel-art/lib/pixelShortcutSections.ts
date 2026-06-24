import type { WwShortcutSection } from '@shared/types/shortcuts'

/** 像素画编辑器菜单/提示用快捷键文案（与 usePixelShortcuts 保持一致） */
export const PA_SHORTCUT = {
  save: 'Ctrl+S',
  saveAs: 'Ctrl+Shift+S',
  newDoc: 'Ctrl+N',
  openRecent: 'Ctrl+O',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  selectAll: 'Ctrl+A',
  delete: 'Delete',
  brushSizeWheel: 'Ctrl+滚轮',
  opacityWheel: 'Shift+滚轮',
  zoomIn: 'Ctrl++',
  zoomOut: 'Ctrl+-',
  zoomReset: 'Ctrl+0',
  zoomFit: 'Ctrl+1'
} as const

/** 像素画编辑器快捷键说明（与 usePixelShortcuts 行为一致） */
export const PIXEL_SHORTCUT_SECTIONS: WwShortcutSection[] = [
  {
    title: '文件',
    rows: [
      { keys: 'Ctrl + N', action: '新建画布' },
      { keys: 'Ctrl + O', action: '打开最近文件' },
      { keys: 'Ctrl + S', action: '保存' },
      { keys: 'Ctrl + Shift + S', action: '另存为' }
    ]
  },
  {
    title: '编辑',
    rows: [
      { keys: 'Ctrl + Z', action: '撤销' },
      { keys: 'Ctrl + Y', action: '重做' },
      { keys: 'Ctrl + A', action: '全选' },
      { keys: PA_SHORTCUT.delete, action: '清除选区内容' },
      { keys: '方向键', action: '移动选区 1 像素' }
    ]
  },
  {
    title: '工具',
    rows: [
      { keys: 'B', action: '铅笔' },
      { keys: 'E', action: '橡皮' },
      { keys: 'G', action: '填充' },
      { keys: 'L', action: '直线' },
      { keys: 'U', action: '矩形' },
      { keys: 'O', action: '椭圆' },
      { keys: 'I', action: '吸管' },
      { keys: 'M', action: '矩形选区' },
      { keys: 'V', action: '偏移选区' },
      { keys: 'H', action: '抓手' },
      { keys: '[ / ]', action: '画笔大小 − / +' },
      { keys: PA_SHORTCUT.brushSizeWheel, action: '画笔大小 − / +' },
      { keys: PA_SHORTCUT.opacityWheel, action: '前景色透明度 − / +' },
      { keys: 'X', action: '交换前景/背景色' },
      { keys: '空格（按住）', action: '临时平移画布' }
    ]
  },
  {
    title: '视图',
    rows: [
      { keys: 'Ctrl + +', action: '放大' },
      { keys: 'Ctrl + -', action: '缩小' },
      { keys: 'Ctrl + 0', action: '重置缩放' },
      { keys: 'Ctrl + 1', action: '适应画布' },
      { keys: '滚轮', action: '缩放画布（以指针为中心）' }
    ]
  }
]
