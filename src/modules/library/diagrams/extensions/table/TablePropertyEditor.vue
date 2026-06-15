<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import type { DiagramNodeShapeExtensionView } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import { normalizeTableData } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

const props = defineProps<{
  nodeId: string
  shapeExtension: DiagramNodeShapeExtensionView
  hasPendingPatch?: boolean
}>()

const emit = defineEmits<{
  patch: [data: DiagramTableData, immediate?: boolean]
}>()

const localData = ref(normalizeTableData(props.shapeExtension.data as DiagramTableData))

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
  () => props.nodeId,
  () => {
    localData.value = normalizeTableData(props.shapeExtension.data as DiagramTableData)
  }
)

const data = computed(() => localData.value)

function emitPatch(immediate = false) {
  emit('patch', normalizeTableData(localData.value), immediate)
}

function setColumnCount(count: number) {
  const next = Math.max(1, Math.min(8, count))
  const columns = Array.from({ length: next }, (_, i) => data.value.columns[i] ?? `列 ${i + 1}`)
  const rows = data.value.rows.map((row) =>
    Array.from({ length: next }, (_, i) => row[i] ?? '')
  )
  localData.value = { ...data.value, columns, rows }
  emitPatch(true)
}

function addRow() {
  const colCount = data.value.columns.length
  localData.value = {
    ...data.value,
    rows: [...data.value.rows, Array.from({ length: colCount }, () => '')]
  }
  emitPatch(true)
}

function removeRow(index: number) {
  if (data.value.rows.length <= 1) return
  localData.value = {
    ...data.value,
    rows: data.value.rows.filter((_, i) => i !== index)
  }
  emitPatch(true)
}

function updateHeader(col: number, value: string) {
  const columns = [...data.value.columns]
  columns[col] = value
  localData.value = { ...data.value, columns }
  emitPatch()
}

function updateCell(row: number, col: number, value: string) {
  const rows = data.value.rows.map((r, ri) =>
    ri === row ? r.map((c, ci) => (ci === col ? value : c)) : [...r]
  )
  localData.value = { ...data.value, rows }
  emitPatch()
}
function onShowHeaderChange(value: boolean) {
  localData.value = { ...localData.value, showHeader: value }
  emitPatch(true)
}
</script>

<template>
  <div class="dg-table-editor">
    <SettingsRow label="显示表头">
      <WwToggleSwitch :model-value="data.showHeader" @update:model-value="onShowHeaderChange" />
    </SettingsRow>
    <SettingsRow label="列数">
      <div class="dg-table-editor__cols">
        <WwIconButton
          icon="minus"
          icon-size="sm"
          compact
          aria-label="减少列"
          @click="setColumnCount(data.columns.length - 1)"
        />
        <span>{{ data.columns.length }}</span>
        <WwIconButton
          icon="plus"
          icon-size="sm"
          compact
          aria-label="增加列"
          @click="setColumnCount(data.columns.length + 1)"
        />
      </div>
    </SettingsRow>
    <template v-if="data.showHeader">
      <SettingsRow
        v-for="(col, index) in data.columns"
        :key="`h-${index}`"
        :label="`表头 ${index + 1}`"
      >
        <InputText
          :model-value="col"
          class="dg-table-editor__input"
          @update:model-value="(v) => updateHeader(index, String(v ?? ''))"
        />
      </SettingsRow>
    </template>
    <div class="dg-table-editor__rows-head">
      <span>数据行</span>
      <WwIconButton icon="plus" icon-size="sm" compact aria-label="添加行" @click="addRow" />
    </div>
    <div
      v-for="(row, rowIndex) in data.rows"
      :key="`r-${rowIndex}`"
      class="dg-table-editor__row"
    >
      <div class="dg-table-editor__row-label">行 {{ rowIndex + 1 }}</div>
      <SettingsRow
        v-for="(cell, colIndex) in row"
        :key="`c-${rowIndex}-${colIndex}`"
        :label="data.columns[colIndex] ?? `列 ${colIndex + 1}`"
      >
        <InputText
          :model-value="cell"
          class="dg-table-editor__input"
          @update:model-value="(v) => updateCell(rowIndex, colIndex, String(v ?? ''))"
        />
      </SettingsRow>
      <WwIconButton
        v-if="data.rows.length > 1"
        icon="trash"
        icon-size="sm"
        compact
        aria-label="删除行"
        @click="removeRow(rowIndex)"
      />
    </div>
  </div>
</template>

<style scoped>
.dg-table-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dg-table-editor__cols {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dg-table-editor__input {
  width: 100%;
}

.dg-table-editor__rows-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ww-text-secondary, #888);
}

.dg-table-editor__row {
  padding: 8px 0;
  border-top: 1px solid var(--ww-border-subtle, rgba(128, 128, 128, 0.2));
}

.dg-table-editor__row-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}
</style>
