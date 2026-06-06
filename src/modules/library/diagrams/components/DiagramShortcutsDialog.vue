<script setup lang="ts">
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'

const open = defineModel<boolean>('open', { default: false })

const rows = [
  { keys: 'Ctrl + S', action: '保存文档' },
  { keys: 'Ctrl + Shift + S', action: '另存为' },
  { keys: 'Ctrl + Z', action: '撤销' },
  { keys: 'Ctrl + Shift + Z', action: '重做' },
  { keys: 'Ctrl + C / X / V', action: '复制 / 剪切 / 粘贴' },
  { keys: 'Ctrl + A', action: '全选' },
  { keys: 'Ctrl + 0 / 1', action: '适应画布 / 重置缩放' },
  { keys: 'Ctrl + PageUp/Down', action: '上一页 / 下一页' },
  { keys: 'Delete', action: '删除选中' },
  { keys: '滚轮', action: '缩放画布' },
  { keys: '左键拖拽空白', action: '框选图元' },
  { keys: '中键拖拽', action: '平移画布' }
]
</script>

<template>
  <WwGlassDialog :visible="open" header="快捷键" width-class="w-[min(24rem,92vw)]" @update:visible="open = $event">
    <ul class="dg-shortcuts-list">
      <li v-for="row in rows" :key="row.keys" class="dg-shortcuts-list__row">
        <kbd class="dg-shortcuts-list__keys">{{ row.keys }}</kbd>
        <span class="dg-shortcuts-list__action">{{ row.action }}</span>
      </li>
    </ul>
  </WwGlassDialog>
</template>
