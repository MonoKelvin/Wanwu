<script setup lang="ts">
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import { DG_SHORTCUT } from '@modules/library/diagrams/lib/diagramKeyboardShortcuts'

const open = defineModel<boolean>('open', { default: false })

const rows = [
  { keys: DG_SHORTCUT.save, action: '保存文档' },
  { keys: DG_SHORTCUT.saveAs, action: '另存为' },
  { keys: DG_SHORTCUT.undo, action: '撤销' },
  { keys: DG_SHORTCUT.redo, action: '重做' },
  { keys: `${DG_SHORTCUT.copy} / ${DG_SHORTCUT.cut} / ${DG_SHORTCUT.paste}`, action: '复制 / 剪切 / 粘贴' },
  { keys: DG_SHORTCUT.duplicate, action: '创建副本' },
  { keys: DG_SHORTCUT.selectAll, action: '全选' },
  { keys: DG_SHORTCUT.group, action: '组合' },
  { keys: DG_SHORTCUT.ungroup, action: '取消组合' },
  { keys: `${DG_SHORTCUT.zoomFit} / ${DG_SHORTCUT.zoomReset}`, action: '适应画布 / 重置缩放' },
  { keys: `${DG_SHORTCUT.pagePrev} / ${DG_SHORTCUT.pageNext}`, action: '上一页 / 下一页' },
  { keys: '方向键', action: '微移选中图元（吸附开启时按网格步进）' },
  { keys: 'Shift + 方向键', action: '大步微移选中图元' },
  { keys: DG_SHORTCUT.delete, action: '删除选中' },
  { keys: 'Esc', action: '取消选中' },
  { keys: '滚轮', action: '缩放画布' },
  { keys: '左键拖拽空白', action: '框选图元' },
  { keys: '中键拖拽', action: '平移画布' }
]
</script>

<template>
  <WwGlassDialog
    v-model:visible="open"
    header="快捷键"
    width-class="w-[min(24rem,92vw)]"
    panel-blur-only
    dismissable-mask
    closable
    close-on-escape
  >
    <ul class="dg-shortcuts-list">
      <li v-for="row in rows" :key="row.keys" class="dg-shortcuts-list__row">
        <kbd class="dg-shortcuts-list__keys">{{ row.keys }}</kbd>
        <span class="dg-shortcuts-list__action">{{ row.action }}</span>
      </li>
    </ul>
  </WwGlassDialog>
</template>
