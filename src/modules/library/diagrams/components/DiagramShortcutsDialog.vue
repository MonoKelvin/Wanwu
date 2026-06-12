<script setup lang="ts">
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import { DG_SHORTCUT } from '@modules/library/diagrams/lib/diagramKeyboardShortcuts'

const open = defineModel<boolean>('open', { default: false })

type ShortcutRow = { keys: string; action: string }
type ShortcutSection = { title: string; rows: ShortcutRow[] }

const sections: ShortcutSection[] = [
  {
    title: '文件与编辑',
    rows: [
      { keys: DG_SHORTCUT.save, action: '保存文档' },
      { keys: DG_SHORTCUT.saveAs, action: '另存为' },
      { keys: DG_SHORTCUT.undo, action: '撤销' },
      { keys: DG_SHORTCUT.redo, action: '重做' },
      { keys: DG_SHORTCUT.copy, action: '复制' },
      { keys: DG_SHORTCUT.cut, action: '剪切' },
      { keys: DG_SHORTCUT.paste, action: '粘贴' },
      { keys: DG_SHORTCUT.duplicate, action: '创建副本' },
      { keys: DG_SHORTCUT.delete, action: '删除选中' }
    ]
  },
  {
    title: '选择与框选',
    rows: [
      { keys: DG_SHORTCUT.toggleSelect, action: '加选或取消图元' },
      { keys: '拖拽空白', action: '框选（替换选区）' },
      { keys: '左上 → 右下', action: '正向框选：完全包含（实线）' },
      { keys: '右下 → 左上', action: '逆向框选：部分相交（虚线）' },
      { keys: DG_SHORTCUT.boxSelectAppend, action: '加选框内未选图元' },
      { keys: DG_SHORTCUT.boxSelectSubtract, action: '减选框内已选图元' },
      { keys: DG_SHORTCUT.selectAll, action: '全选' },
      { keys: 'Esc', action: '取消选中' }
    ]
  },
  {
    title: '视图与移动',
    rows: [
      { keys: DG_SHORTCUT.group, action: '组合' },
      { keys: DG_SHORTCUT.ungroup, action: '取消组合' },
      { keys: DG_SHORTCUT.zoomFit, action: '适应画布' },
      { keys: DG_SHORTCUT.zoomReset, action: '重置缩放' },
      { keys: DG_SHORTCUT.pagePrev, action: '上一页' },
      { keys: DG_SHORTCUT.pageNext, action: '下一页' },
      { keys: DG_SHORTCUT.wheelScroll, action: '上下滚动画布' },
      { keys: DG_SHORTCUT.wheelScrollHorizontal, action: '左右滚动画布' },
      { keys: DG_SHORTCUT.wheelZoom, action: '缩放画布' },
      { keys: '中键拖拽', action: '平移画布' },
      { keys: '方向键', action: '微移图元（可吸附网格）' },
      { keys: 'Ctrl + 方向键', action: '精确微移 1px（不吸附）' },
      { keys: 'Shift + 方向键', action: '大步微移图元' },
      { keys: 'Ctrl + 拖拽 / 缩放', action: '自由移动或缩放（不吸附）' }
    ]
  }
]
</script>

<template>
  <WwGlassDialog
    v-model:visible="open"
    header="快捷键"
    width-class="w-[min(28rem,92vw)]"
    dialog-class="dg-shortcuts-dialog"
    mask-class="dg-shortcuts-mask"
    panel-blur-only
    frosted-panel
    dismissable-mask
    closable
    close-on-escape
  >
    <div class="dg-shortcuts-scroll">
      <section
        v-for="section in sections"
        :key="section.title"
        class="dg-shortcuts-section"
      >
        <h3 class="dg-shortcuts-section__title">{{ section.title }}</h3>
        <ul class="dg-shortcuts-list">
          <li
            v-for="row in section.rows"
            :key="`${section.title}-${row.keys}-${row.action}`"
            class="dg-shortcuts-list__row"
          >
            <kbd class="dg-shortcuts-list__keys">{{ row.keys }}</kbd>
            <span class="dg-shortcuts-list__action">{{ row.action }}</span>
          </li>
        </ul>
      </section>
    </div>
  </WwGlassDialog>
</template>
