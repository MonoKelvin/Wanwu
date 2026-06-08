<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import InputText from 'primevue/inputtext'
import WwIcon from '@shared/components/WwIcon.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import DiagramMultiSelectTools from '@modules/library/diagrams/components/DiagramMultiSelectTools.vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import {
  DIAGRAM_ARROW_TYPES,
  DIAGRAM_DASH_PRESETS,
  DIAGRAM_EDGE_TYPES,
  DIAGRAM_SHADOW_PRESETS,
  DIAGRAM_TEXT_ALIGN_ACTIONS,
  DIAGRAM_THEME_PRESETS
} from '@modules/library/diagrams/lib/diagramEditorConstants'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'
import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  togglePropsPanelCollapsed,
  useDiagramEditorLayout
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'

const props = defineProps<{
  selection: DiagramEditorSelection
  fileId: string | null
  canUngroup?: boolean
  canGroup?: boolean
}>()

const bus = useDiagramCommandBus()
const toast = useWanwuToast()
const imageBusy = ref(false)
const activeTab = ref<'node' | 'edge' | 'canvas'>('canvas')
const layout = useDiagramEditorLayout()

watch(
  () => ({
    nodeCount: props.selection.selectedNodeCount,
    edgeCount: props.selection.selectedEdgeCount
  }),
  (next, prev) => {
    if (next.nodeCount === 0 && next.edgeCount === 0) {
      activeTab.value = 'canvas'
    } else if (next.nodeCount > 0 && (prev?.nodeCount ?? 0) === 0) {
      activeTab.value = 'node'
    } else if (next.edgeCount > 0 && next.nodeCount === 0 && (prev?.edgeCount ?? 0) === 0) {
      activeTab.value = 'edge'
    }
  },
  { immediate: true }
)

const showNode = computed(
  () => activeTab.value === 'node' && props.selection.selectedNodeCount > 0
)
const showEdge = computed(
  () => activeTab.value === 'edge' && props.selection.selectedEdgeCount > 0
)
const canvas = computed(() => props.selection.canvas)
const multiNode = computed(() => props.selection.selectedNodeCount > 1)
const multiEdge = computed(() => props.selection.selectedEdgeCount > 1)
const multiSelect = computed(
  () => props.selection.selectedNodeCount + props.selection.selectedEdgeCount > 1
)
const isGroupFrame = computed(() => {
  if (props.selection.selectedNodeCount !== 1) return false
  return props.selection.node?.type === DIAGRAM_GROUP_FRAME_TYPE
})

const selectionBanner = computed(() => {
  const nc = props.selection.selectedNodeCount
  const ec = props.selection.selectedEdgeCount
  if (nc > 0 && ec > 0) return `${nc} 图元 · ${ec} 连线`
  if (nc > 1) return `${nc} 图元`
  if (ec > 1) return `${ec} 连线`
  return ''
})

function isMixed(field: string): boolean {
  return multiNode.value && props.selection.mixedNodeFields.includes(field)
}

function isTextAlignActive(value: string): boolean {
  if (isMixed('textStyle.textAlign')) return false
  return props.selection.node?.textStyle.textAlign === value
}

function isFontWeightActive(): boolean {
  if (isMixed('textStyle.fontWeight')) return false
  return props.selection.node?.textStyle.fontWeight === 'bold'
}

function fillColorForPicker(fill: string): string {
  if (!fill || fill === 'transparent' || fill === 'none') return '#ffffff'
  return fill
}

const dispatchBatchNode = useDebounceFn((nodeProps: Record<string, unknown>) => {
  void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
}, 200)

const dispatchNodeText = useDebounceFn((nodeProps: Record<string, unknown>) => {
  const id = props.selection.node?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
}, 200)

function patchNodeNow(nodeProps: Record<string, unknown>) {
  if (multiNode.value) {
    void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
    return
  }
  const id = props.selection.node?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
}

const dispatchNodeNumeric = useDebounceFn((nodeProps: Record<string, unknown>) => {
  patchNodeNow(nodeProps)
}, 200)

const dispatchEdgeNumeric = useDebounceFn((edgeProps: Record<string, unknown>) => {
  patchEdgeNow(edgeProps)
}, 200)

function patchEdgeNow(edgeProps: Record<string, unknown>) {
  if (multiEdge.value) {
    void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
    return
  }
  const id = props.selection.edge?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
}

const dispatchBatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
  void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
}, 200)

const dispatchEdgeText = useDebounceFn((edgeProps: Record<string, unknown>) => {
  const id = props.selection.edge?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
}, 200)

function patchNode(patch: Record<string, unknown>) {
  if ('text' in patch) {
    if (multiNode.value) void dispatchBatchNode(patch)
    else void dispatchNodeText(patch)
    return
  }
  patchNodeNow(patch)
}

function patchDefaultEdge(patch: Record<string, unknown>) {
  patchCanvas({
    defaultEdge: { ...canvas.value.defaultEdge, ...patch }
  })
}

function patchNodeTextStyle(patch: Record<string, unknown>) {
  const ts = props.selection.node?.textStyle
  if (!ts) return
  const next = { ...ts, ...patch }
  if (typeof next.fontSize === 'number') {
    next.fontSize = Math.min(128, Math.max(8, next.fontSize))
  }
  patchNodeNow({ textStyle: next })
}

function patchNodeNumeric(patch: Record<string, unknown>) {
  void dispatchNodeNumeric(patch)
}

function patchEdge(patch: Record<string, unknown>) {
  if ('text' in patch) {
    if (multiEdge.value) void dispatchBatchEdge(patch)
    else void dispatchEdgeText(patch)
    return
  }
  patchEdgeNow(patch)
}

function patchCanvas(patch: Record<string, unknown>) {
  void bus.dispatch({ type: 'canvas.updateSettings', payload: { settings: patch } })
}

function toggleUnderline() {
  const ts = props.selection.node?.textStyle
  if (!ts) return
  patchNodeTextStyle({ underline: !ts.underline })
}

function toggleItalic() {
  const ts = props.selection.node?.textStyle
  if (!ts) return
  patchNodeTextStyle({ fontStyle: (ts.fontStyle ?? 'normal') === 'italic' ? 'normal' : 'italic' })
}

function toggleStrikethrough() {
  const ts = props.selection.node?.textStyle
  if (!ts) return
  patchNodeTextStyle({ strikethrough: !ts.strikethrough })
}

function setTextAlign(align: 'left' | 'center' | 'right') {
  patchNodeTextStyle({ textAlign: align })
}

function nodeTopLeft(node: { x: number; y: number; width: number; height: number }) {
  return {
    left: Math.round(node.x - node.width / 2),
    top: Math.round(node.y - node.height / 2)
  }
}

function patchNodePositionFromTopLeft(left: number, top: number) {
  const node = props.selection.node
  if (!node) return
  patchNodeNumeric({
    x: left + node.width / 2,
    y: top + node.height / 2
  })
}

function patchNodeSizeKeepTopLeft(width: number, height: number) {
  const node = props.selection.node
  if (!node) return
  const { left, top } = nodeTopLeft(node)
  patchNodeNow({
    width,
    height,
    x: left + width / 2,
    y: top + height / 2
  })
}

function parseNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

const showImageSection = computed(() => {
  const node = props.selection.node
  if (!node || multiNode.value) return false
  return node.type === 'dg-image' || Boolean(node.imageAsset?.url)
})

async function pickNodeImage() {
  if (!props.fileId) {
    toast.info('请先保存文档后再插入图片')
    return
  }
  const nodeId = props.selection.node?.id
  if (!nodeId) return
  imageBusy.value = true
  try {
    const result = await window.wanwu.diagrams.importNodeAsset({ fileId: props.fileId })
    if (!result.ok) {
      if (!result.canceled && result.error) toast.error(result.error)
      return
    }
    await bus.dispatch({
      type: 'canvas.updateNode',
      payload: {
        nodeId,
        nodeProps: {
          imageAsset: { assetId: result.assetId, ext: result.ext, url: result.url }
        }
      }
    })
  } finally {
    imageBusy.value = false
  }
}

function clearNodeImage() {
  const nodeId = props.selection.node?.id
  if (!nodeId) return
  void bus.dispatch({
    type: 'canvas.updateNode',
    payload: { nodeId, nodeProps: { imageAsset: null } }
  })
}

function patchGroupStyle(patch: Record<string, unknown>) {
  const id = props.selection.node?.id
  if (!id) return
  const node = props.selection.node
  void bus.dispatch({
    type: 'canvas.updateNode',
    payload: {
      nodeId: id,
      patch: {
        properties: {
          dgGroupStyle: {
            stroke: node?.stroke,
            strokeWidth: node?.strokeWidth,
            strokeDasharray: node?.strokeDasharray ?? '',
            fill: node?.fill,
            ...patch
          }
        }
      }
    }
  })
}
</script>

<template>
  <aside
    class="dg-panel dg-panel--stacked dg-panel--props dg-float dg-float--right ww-glass-blur"
    aria-label="属性"
  >
    <header class="dg-panel__head">
      <WwIcon name="sliders-horizontal" size="sm" class="dg-panel__head-icon" />
      <span class="dg-panel__head-title">属性</span>
      <WwIconButton
        icon="chevron-right"
        icon-size="sm"
        class="dg-panel__collapse-btn"
        aria-label="收起属性面板"
        compact
        @click="togglePropsPanelCollapsed(layout)"
      />
    </header>
    <div class="dg-panel-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="dg-panel-tab"
        :class="{ 'dg-panel-tab--active': activeTab === 'node' }"
        :aria-selected="activeTab === 'node'"
        :disabled="selection.selectedNodeCount === 0"
        @click="activeTab = 'node'"
      >
        图元
      </button>
      <button
        type="button"
        role="tab"
        class="dg-panel-tab"
        :class="{ 'dg-panel-tab--active': activeTab === 'edge' }"
        :aria-selected="activeTab === 'edge'"
        :disabled="selection.selectedEdgeCount === 0"
        @click="activeTab = 'edge'"
      >
        连线
      </button>
      <button
        type="button"
        role="tab"
        class="dg-panel-tab"
        :class="{ 'dg-panel-tab--active': activeTab === 'canvas' }"
        :aria-selected="activeTab === 'canvas'"
        @click="activeTab = 'canvas'"
      >
        画布
      </button>
    </div>

    <div class="dg-panel__body ww-scroll-main">
      <p v-if="selectionBanner" class="dg-prop-selection-banner">{{ selectionBanner }}</p>

      <DiagramMultiSelectTools
        v-if="multiSelect"
        :node-count="selection.selectedNodeCount"
        :edge-count="selection.selectedEdgeCount"
        :can-group="canGroup ?? false"
        :can-ungroup="canUngroup ?? false"
      />

      <!-- 组合框 -->
      <template v-if="isGroupFrame && selection.node">
        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">组合框</p>
          <SettingsRow label="边框色" class="dg-settings-row--stacked">
            <input
              :value="selection.node.stroke"
              type="color"
              class="dg-field-color dg-prop-color-block"
              aria-label="组合框边框色"
              @input="patchGroupStyle({ stroke: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="填充色" class="dg-settings-row--stacked">
            <input
              :value="selection.node.fill === 'transparent' ? '#ffffff' : selection.node.fill"
              type="color"
              class="dg-field-color dg-prop-color-block"
              aria-label="组合框填充色"
              @input="patchGroupStyle({ fill: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="边框粗细" class="dg-settings-row--stacked">
            <InputText
              :model-value="String(selection.node.strokeWidth)"
              type="number"
              class="dg-prop-control dg-prop-control--num"
              @update:model-value="
                patchGroupStyle({ strokeWidth: parseNumber($event, selection.node!.strokeWidth) })
              "
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="selection.node.strokeDasharray ?? ''"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchGroupStyle({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
        </section>
      </template>

      <!-- 图元 -->
      <template v-if="showNode && selection.node && !isGroupFrame">
        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">文本</p>
          <SettingsRow v-if="!multiNode" label="内容" class="dg-settings-row--stacked">
            <InputText
              :model-value="selection.node.text"
              class="dg-prop-control"
              @update:model-value="patchNode({ text: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="字号" class="dg-settings-row--stacked">
            <InputText
              :model-value="isMixed('textStyle.fontSize') ? '' : String(selection.node.textStyle.fontSize)"
              :placeholder="isMixed('textStyle.fontSize') ? '多种' : undefined"
              type="number"
              min="8"
              max="128"
              class="dg-prop-control dg-prop-control--num dg-prop-control--full"
              :class="{ 'dg-prop-control--mixed': isMixed('textStyle.fontSize') }"
              @update:model-value="
                patchNodeTextStyle({
                  fontSize: parseNumber($event, selection.node!.textStyle.fontSize, 8, 128)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="对齐" class="dg-settings-row--stacked">
            <div class="dg-prop-row dg-prop-row--toggles" role="group" aria-label="文本对齐">
              <button
                v-for="action in DIAGRAM_TEXT_ALIGN_ACTIONS"
                :key="action.value"
                type="button"
                class="dg-prop-toggle dg-prop-toggle--icon"
                :class="{ 'dg-prop-toggle--active': isTextAlignActive(action.value) }"
                :aria-label="action.label"
                :aria-pressed="isTextAlignActive(action.value)"
                @click="setTextAlign(action.value)"
              >
                <WwIcon :name="action.icon" size="sm" />
              </button>
            </div>
          </SettingsRow>
          <SettingsRow label="文字颜色" class="dg-settings-row--stacked">
            <input
              :value="isMixed('textStyle.color') ? '#b0b0b0' : selection.node.textStyle.color"
              type="color"
              class="dg-field-color dg-prop-color-block"
              :class="{ 'dg-prop-color-block--mixed': isMixed('textStyle.color') }"
              aria-label="文字颜色"
              @input="patchNodeTextStyle({ color: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="样式" class="dg-settings-row--stacked">
            <div class="dg-prop-row dg-prop-row--toggles" role="group" aria-label="文本样式">
              <button
                type="button"
                class="dg-prop-toggle"
                :class="{ 'dg-prop-toggle--active': isFontWeightActive() }"
                aria-label="粗体"
                :aria-pressed="isFontWeightActive()"
                @click="
                  patchNodeTextStyle({
                    fontWeight: selection.node.textStyle.fontWeight === 'bold' ? 'normal' : 'bold'
                  })
                "
              >
                B
              </button>
              <button
                type="button"
                class="dg-prop-toggle dg-prop-toggle--italic"
                :class="{ 'dg-prop-toggle--active': (selection.node.textStyle.fontStyle ?? 'normal') === 'italic' }"
                aria-label="斜体"
                :aria-pressed="(selection.node.textStyle.fontStyle ?? 'normal') === 'italic'"
                @click="toggleItalic"
              >
                I
              </button>
              <button
                type="button"
                class="dg-prop-toggle"
                :class="{ 'dg-prop-toggle--active': selection.node.textStyle.underline }"
                aria-label="下划线"
                :aria-pressed="selection.node.textStyle.underline"
                @click="toggleUnderline"
              >
                U
              </button>
              <button
                type="button"
                class="dg-prop-toggle"
                :class="{ 'dg-prop-toggle--active': selection.node.textStyle.strikethrough }"
                aria-label="删除线"
                :aria-pressed="selection.node.textStyle.strikethrough"
                @click="toggleStrikethrough"
              >
                S
              </button>
            </div>
          </SettingsRow>
        </section>

        <section v-if="!multiNode" class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">位置与尺寸</p>
          <div class="dg-prop-kv-grid dg-prop-kv-grid--metrics">
            <SettingsRow label="X" class="dg-settings-row--stacked dg-settings-row--compact">
              <InputText
                :model-value="String(nodeTopLeft(selection.node).left)"
                type="number"
                class="dg-prop-control dg-prop-control--num dg-prop-control--full"
                @update:model-value="
                  patchNodePositionFromTopLeft(
                    parseNumber($event, nodeTopLeft(selection.node!).left),
                    nodeTopLeft(selection.node!).top
                  )
                "
              />
            </SettingsRow>
            <SettingsRow label="Y" class="dg-settings-row--stacked dg-settings-row--compact">
              <InputText
                :model-value="String(nodeTopLeft(selection.node).top)"
                type="number"
                class="dg-prop-control dg-prop-control--num dg-prop-control--full"
                @update:model-value="
                  patchNodePositionFromTopLeft(
                    nodeTopLeft(selection.node!).left,
                    parseNumber($event, nodeTopLeft(selection.node!).top)
                  )
                "
              />
            </SettingsRow>
            <SettingsRow label="宽" class="dg-settings-row--stacked dg-settings-row--compact">
              <InputText
                :model-value="String(selection.node.width)"
                type="number"
                min="1"
                class="dg-prop-control dg-prop-control--num dg-prop-control--full"
                @update:model-value="
                  patchNodeSizeKeepTopLeft(
                    parseNumber($event, selection.node!.width, 1),
                    selection.node!.height
                  )
                "
              />
            </SettingsRow>
            <SettingsRow label="高" class="dg-settings-row--stacked dg-settings-row--compact">
              <InputText
                :model-value="String(selection.node.height)"
                type="number"
                min="1"
                class="dg-prop-control dg-prop-control--num dg-prop-control--full"
                @update:model-value="
                  patchNodeSizeKeepTopLeft(
                    selection.node!.width,
                    parseNumber($event, selection.node!.height, 1)
                  )
                "
              />
            </SettingsRow>
          </div>
        </section>

        <section v-if="showImageSection" class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">图片</p>
          <div v-if="selection.node?.imageAsset?.url" class="dg-prop-image-preview">
            <img :src="selection.node.imageAsset.url" alt="" class="dg-prop-image-preview__img" />
          </div>
          <div class="dg-prop-image-actions">
            <WwButton
              label="选择图片"
              icon="image"
              size="small"
              severity="secondary"
              :loading="imageBusy"
              @click="pickNodeImage"
            />
            <WwButton
              v-if="selection.node?.imageAsset?.url"
              label="移除"
              size="small"
              severity="secondary"
              text
              @click="clearNodeImage"
            />
          </div>
          <p v-if="!fileId" class="dg-hint dg-prop-image-hint">保存文档后可插入内嵌图片</p>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">外观</p>
          <SettingsRow label="填充色" class="dg-settings-row--stacked">
            <input
              :value="isMixed('fill') ? '#b0b0b0' : fillColorForPicker(selection.node.fill)"
              type="color"
              class="dg-field-color dg-prop-color-block"
              :class="{ 'dg-prop-color-block--mixed': isMixed('fill') }"
              aria-label="填充色"
              @input="patchNode({ fill: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="边框色" class="dg-settings-row--stacked">
            <input
              :value="isMixed('stroke') ? '#b0b0b0' : selection.node.stroke"
              type="color"
              class="dg-field-color dg-prop-color-block"
              :class="{ 'dg-prop-color-block--mixed': isMixed('stroke') }"
              aria-label="边框色"
              @input="patchNode({ stroke: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="边框粗细" class="dg-settings-row--stacked">
            <InputText
              :model-value="isMixed('strokeWidth') ? '' : String(selection.node.strokeWidth)"
              :placeholder="isMixed('strokeWidth') ? '多种' : undefined"
              type="number"
              min="0"
              step="0.5"
              class="dg-prop-control dg-prop-control--num dg-prop-control--full"
              :class="{ 'dg-prop-control--mixed': isMixed('strokeWidth') }"
              @update:model-value="
                patchNodeNumeric({
                  strokeWidth: parseNumber($event, selection.node!.strokeWidth, 0)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="isMixed('strokeDasharray') ? null : (selection.node.strokeDasharray ?? '')"
              :placeholder="isMixed('strokeDasharray') ? '多种' : undefined"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchNode({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="阴影" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="isMixed('shadow') ? null : selection.node.shadow"
              :placeholder="isMixed('shadow') ? '多种' : undefined"
              :options="DIAGRAM_SHADOW_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchNode({ shadow: String($event ?? 'none') })"
            />
          </SettingsRow>
        </section>
      </template>

      <div v-else-if="activeTab === 'node' && selection.selectedNodeCount === 0" class="dg-panel__empty">
        <WwIcon name="square" size="sm" class="opacity-30" />
        <p class="dg-hint">选中图元以编辑属性</p>
      </div>

      <!-- 连线 -->
      <template v-if="showEdge && selection.edge">
        <section v-if="!multiEdge" class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">文本</p>
          <SettingsRow label="标签" class="dg-settings-row--stacked">
            <InputText
              :model-value="selection.edge.text"
              class="dg-prop-control"
              @update:model-value="patchEdge({ text: String($event ?? '') })"
            />
          </SettingsRow>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">线条</p>
          <SettingsRow label="线型" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="selection.edge.type"
              :options="DIAGRAM_EDGE_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ type: String($event ?? 'polyline') })"
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="selection.edge.strokeDasharray"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="颜色" class="dg-settings-row--stacked">
            <input
              :value="selection.edge.stroke"
              type="color"
              class="dg-field-color dg-prop-color-block"
              aria-label="线条颜色"
              @input="patchEdge({ stroke: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="粗细" class="dg-settings-row--stacked">
            <InputText
              :model-value="String(selection.edge.strokeWidth)"
              type="number"
              min="0"
              step="0.5"
              class="dg-prop-control dg-prop-control--num dg-prop-control--full"
              @update:model-value="
                dispatchEdgeNumeric({
                  strokeWidth: parseNumber($event, selection.edge!.strokeWidth, 0)
                })
              "
            />
          </SettingsRow>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">箭头</p>
          <SettingsRow label="起点" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="selection.edge.startArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ startArrowType: String($event ?? 'none') })"
            />
          </SettingsRow>
          <SettingsRow label="终点" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="selection.edge.endArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ endArrowType: String($event ?? 'solid') })"
            />
          </SettingsRow>
        </section>
      </template>

      <div v-else-if="activeTab === 'edge' && selection.selectedEdgeCount === 0" class="dg-panel__empty">
        <WwIcon name="link" size="sm" class="opacity-30" />
        <p class="dg-hint">选中连线以编辑样式</p>
      </div>

      <!-- 画布 -->
      <template v-if="activeTab === 'canvas'">
        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">画布</p>
          <SettingsRow label="显示网格" class="dg-settings-row--inline">
            <WwToggleSwitch
              :model-value="canvas.gridVisible"
              aria-label="显示网格"
              @update:model-value="patchCanvas({ gridVisible: $event })"
            />
          </SettingsRow>
          <SettingsRow label="吸附网格" class="dg-settings-row--inline">
            <WwToggleSwitch
              :model-value="canvas.snapGrid"
              aria-label="吸附网格"
              @update:model-value="patchCanvas({ snapGrid: $event })"
            />
          </SettingsRow>
          <p v-if="canvas.snapGrid" class="dg-prop-hint">
            拖动时显示对齐线，接近网格时轻吸附，松手后对齐网格
          </p>
          <SettingsRow label="导航窗口" class="dg-settings-row--inline">
            <WwToggleSwitch
              :model-value="canvas.miniMapVisible"
              aria-label="显示导航窗口"
              @update:model-value="patchCanvas({ miniMapVisible: $event })"
            />
          </SettingsRow>
          <SettingsRow label="背景色" class="dg-settings-row--stacked">
            <input
              :value="canvas.backgroundColor"
              type="color"
              class="dg-field-color dg-prop-color-block"
              aria-label="背景色"
              @input="patchCanvas({ backgroundColor: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="主题配色" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="canvas.themePreset"
              :options="DIAGRAM_THEME_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchCanvas({ themePreset: String($event ?? 'default') })"
            />
          </SettingsRow>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">默认连线</p>
          <SettingsRow label="线型" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="canvas.defaultEdge.type"
              :options="DIAGRAM_EDGE_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchDefaultEdge({ type: String($event ?? 'polyline') })"
            />
          </SettingsRow>
          <SettingsRow label="默认线条色" class="dg-settings-row--stacked">
            <input
              :value="canvas.defaultEdge.stroke"
              type="color"
              class="dg-field-color dg-prop-color-block"
              aria-label="默认线条颜色"
              @input="patchDefaultEdge({ stroke: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="粗细" class="dg-settings-row--stacked">
            <InputText
              :model-value="String(canvas.defaultEdge.strokeWidth)"
              type="number"
              min="0"
              step="0.5"
              class="dg-prop-control dg-prop-control--num dg-prop-control--full"
              @update:model-value="
                patchDefaultEdge({
                  strokeWidth: parseNumber($event, canvas.defaultEdge.strokeWidth, 0)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="canvas.defaultEdge.strokeDasharray"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchDefaultEdge({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="终点箭头" class="dg-settings-row--stacked">
            <WwSelect
              :model-value="canvas.defaultEdge.endArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchDefaultEdge({ endArrowType: String($event ?? 'solid') })"
            />
          </SettingsRow>
        </section>
      </template>
    </div>
  </aside>
</template>
