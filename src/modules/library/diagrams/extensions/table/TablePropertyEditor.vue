<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import type { DiagramNodeShapeExtensionView } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import { useTableActiveCell } from '@modules/library/diagrams/extensions/table/composables/useTableActiveCell'
import { normalizeTableData } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { getDefaultTableActiveCell } from '@modules/library/diagrams/extensions/table/kinds/tableCellNav'
import { focusTableCellOnCanvas } from '@modules/library/diagrams/extensions/table/interaction/tablePropertyBridge'
import { getDiagramEditorRuntime } from '@modules/library/diagrams/composables/useDiagramEditorRuntime'
import { DIAGRAM_TABLE_KIND, type DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

const props = defineProps<{
  nodeId: string
  shapeExtension: DiagramNodeShapeExtensionView
  hasPendingPatch?: boolean
}>()

const emit = defineEmits<{
  patch: [data: DiagramTableData, immediate?: boolean]
}>()

const localData = ref(normalizeTableData(props.shapeExtension.data as DiagramTableData))
useTableActiveCell(() => props.nodeId)

watch(
  () => props.shapeExtension.data,
  (next) => {
    if (props.hasPendingPatch) return
    const normalized = normalizeTableData(next as DiagramTableData)
    if (JSON.stringify(normalized) === JSON.stringify(localData.value)) return
    localData.value = normalized
  }
)

watch(
  () => props.hasPendingPatch,
  (pending, wasPending) => {
    if (wasPending && !pending) {
      localData.value = normalizeTableData(props.shapeExtension.data as DiagramTableData)
    }
  }
)

watch(
  () => props.nodeId,
  () => {
    localData.value = normalizeTableData(props.shapeExtension.data as DiagramTableData)
  }
)

const data = computed(() => localData.value)

function patchNow(next: DiagramTableData) {
  localData.value = normalizeTableData(next)
  emit('patch', localData.value, true)
}

function onShowHeaderChange(value: boolean) {
  const next = { ...data.value, showHeader: value }
  const nextActive = getDefaultTableActiveCell(next)
  const lf = getDiagramEditorRuntime().port?.getLogicFlow() ?? null
  if (lf) focusTableCellOnCanvas(lf, props.nodeId, nextActive)
  patchNow(next)
}
</script>

<template>
  <section
    v-if="shapeExtension.kind === DIAGRAM_TABLE_KIND"
    class="dg-prop-section dg-prop-group dg-table"
  >
    <p class="dg-prop-section__title">表格</p>

    <p class="dg-table__hint">
      点击单元格输入；Shift/Ctrl+点击多选；拖拽框选多格；表上方 ✥ 移动表格；左侧 +/- 增删行，下方 +/- 增删列。
    </p>

    <SettingsRow label="显示表头" class="dg-settings-row--inline dg-settings-row--toggle">
      <WwToggleSwitch
        :model-value="data.showHeader"
        :drag-to-change="false"
        aria-label="显示表头"
        @update:model-value="onShowHeaderChange"
      />
    </SettingsRow>
  </section>
</template>

<style scoped>
.dg-table__hint {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
}
</style>
