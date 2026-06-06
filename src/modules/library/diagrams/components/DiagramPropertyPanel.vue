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
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import {
  DIAGRAM_ARROW_TYPES,
  DIAGRAM_DASH_PRESETS,
  DIAGRAM_EDGE_TYPES,
  DIAGRAM_SHADOW_PRESETS,
  DIAGRAM_TEXT_ALIGN_OPTIONS,
  DIAGRAM_THEME_PRESETS
} from '@modules/library/diagrams/lib/diagramEditorConstants'
import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  togglePropsPanelCollapsed,
  useDiagramEditorLayout
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'

const props = defineProps<{
  selection: DiagramEditorSelection
  fileId: string | null
}>()

const bus = useDiagramCommandBus()
const toast = useWanwuToast()
const imageBusy = ref(false)
const activeTab = ref<'node' | 'edge' | 'canvas'>('canvas')
const layout = useDiagramEditorLayout()
const collapsed = layout.propsCollapsed

watch(
  () => ({
    nodeCount: props.selection.selectedNodeCount,
    edgeCount: props.selection.selectedEdgeCount,
    kind: props.selection.kind
  }),
  ({ nodeCount, edgeCount, kind }) => {
    if (nodeCount > 0) activeTab.value = 'node'
    else if (edgeCount > 0) activeTab.value = 'edge'
    else if (kind === 'node' || kind === 'edge') activeTab.value = kind
  },
  { immediate: true }
)

const showNode = computed(() => activeTab.value === 'node' && props.selection.node)
const showEdge = computed(() => activeTab.value === 'edge' && props.selection.edge)
const canvas = computed(() => props.selection.canvas)
const multiNode = computed(() => props.selection.selectedNodeCount > 1)
const multiEdge = computed(() => props.selection.selectedEdgeCount > 1)

const selectionBanner = computed(() => {
  const nc = props.selection.selectedNodeCount
  const ec = props.selection.selectedEdgeCount
  if (nc > 0 && ec > 0) return `已选 ${nc} 个图元、${ec} 条连线`
  if (nc > 1) return `当前选择 ${nc} 个图形`
  if (ec > 1) return `当前选择 ${ec} 条连线`
  return ''
})

const dispatchBatchNode = useDebounceFn((nodeProps: Record<string, unknown>) => {
  void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
}, 200)

const dispatchNode = useDebounceFn((nodeProps: Record<string, unknown>) => {
  const id = props.selection.node?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
}, 200)

const dispatchBatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
  void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
}, 200)

const dispatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
  const id = props.selection.edge?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
}, 200)

const dispatchCanvas = useDebounceFn((settings: Record<string, unknown>) => {
  void bus.dispatch({ type: 'canvas.updateSettings', payload: { settings } })
}, 200)

function patchNode(patch: Record<string, unknown>) {
  if (multiNode.value) {
    void dispatchBatchNode(patch)
    return
  }
  void dispatchNode(patch)
}

function patchDefaultEdge(patch: Record<string, unknown>) {
  void dispatchCanvas({
    defaultEdge: { ...canvas.value.defaultEdge, ...patch }
  })
}

function patchNodeTextStyle(patch: Record<string, unknown>) {
  const ts = props.selection.node?.textStyle
  if (!ts) return
  patchNode({ textStyle: { ...ts, ...patch } })
}

function patchEdge(patch: Record<string, unknown>) {
  if (multiEdge.value) {
    void dispatchBatchEdge(patch)
    return
  }
  void dispatchEdge(patch)
}

function patchCanvas(patch: Record<string, unknown>) {
  void dispatchCanvas(patch)
}

function toggleUnderline() {
  const ts = props.selection.node?.textStyle
  if (!ts) return
  patchNodeTextStyle({ underline: !ts.underline })
}

function toggleStrikethrough() {
  const ts = props.selection.node?.textStyle
  if (!ts) return
  patchNodeTextStyle({ strikethrough: !ts.strikethrough })
}

function parseNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
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
</script>

<template>
  <aside
    class="dg-panel dg-panel--stacked dg-panel--props dg-float dg-float--right ww-glass-blur"
    :class="{ 'dg-panel--collapsed': collapsed }"
    aria-label="属性"
  >
    <header class="dg-panel__head">
      <WwIcon name="sliders-horizontal" size="sm" class="dg-panel__head-icon" />
      <span v-if="!collapsed" class="dg-panel__head-title">属性</span>
      <WwIconButton
        :icon="collapsed ? 'chevron-left' : 'chevron-right'"
        icon-size="sm"
        class="dg-panel__collapse-btn"
        :aria-label="collapsed ? '展开属性面板' : '收起属性面板'"
        compact
        @click="togglePropsPanelCollapsed(layout)"
      />
    </header>
    <template v-if="!collapsed">
    <div class="dg-panel-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="dg-panel-tab"
        :class="{ 'dg-panel-tab--active': activeTab === 'node' }"
        :aria-selected="activeTab === 'node'"
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
      <!-- 图元 -->
      <template v-if="showNode && selection.node">
        <section v-if="!multiNode" class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">文本</p>
          <SettingsRow label="内容">
            <InputText
              :model-value="selection.node.text"
              class="dg-prop-control"
              @update:model-value="patchNode({ text: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="字号">
            <InputText
              :model-value="String(selection.node.textStyle.fontSize)"
              type="number"
              class="dg-prop-control dg-prop-control--num"
              @update:model-value="
                patchNodeTextStyle({
                  fontSize: parseNumber($event, selection.node!.textStyle.fontSize)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="文字颜色">
            <input
              :value="selection.node.textStyle.color"
              type="color"
              class="dg-field-color dg-prop-color-swatch"
              aria-label="文字颜色"
              @input="patchNodeTextStyle({ color: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="对齐">
            <WwSelect
              :model-value="selection.node.textStyle.textAlign"
              :options="DIAGRAM_TEXT_ALIGN_OPTIONS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchNodeTextStyle({ textAlign: String($event ?? 'center') })"
            />
          </SettingsRow>
          <SettingsRow label="样式">
            <div class="dg-prop-row dg-prop-row--toggles" role="group" aria-label="文本样式">
              <button
                type="button"
                class="dg-prop-toggle"
                :class="{ 'dg-prop-toggle--active': selection.node.textStyle.fontWeight === 'bold' }"
                aria-label="粗体"
                :aria-pressed="selection.node.textStyle.fontWeight === 'bold'"
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
          <div class="dg-prop-kv-grid dg-prop-kv-grid--stacked">
            <SettingsRow label="X">
              <InputText
                :model-value="String(selection.node.x)"
                type="number"
                class="dg-prop-control dg-prop-control--num"
                @update:model-value="patchNode({ x: parseNumber($event, selection.node!.x) })"
              />
            </SettingsRow>
            <SettingsRow label="Y">
              <InputText
                :model-value="String(selection.node.y)"
                type="number"
                class="dg-prop-control dg-prop-control--num"
                @update:model-value="patchNode({ y: parseNumber($event, selection.node!.y) })"
              />
            </SettingsRow>
            <SettingsRow label="宽">
              <InputText
                :model-value="String(selection.node.width)"
                type="number"
                class="dg-prop-control dg-prop-control--num"
                @update:model-value="patchNode({ width: parseNumber($event, selection.node!.width) })"
              />
            </SettingsRow>
            <SettingsRow label="高">
              <InputText
                :model-value="String(selection.node.height)"
                type="number"
                class="dg-prop-control dg-prop-control--num"
                @update:model-value="patchNode({ height: parseNumber($event, selection.node!.height) })"
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
          <SettingsRow label="填充色">
            <input
              :value="selection.node.fill"
              type="color"
              class="dg-field-color dg-prop-color-swatch"
              aria-label="填充色"
              @input="patchNode({ fill: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="边框色">
            <input
              :value="selection.node.stroke"
              type="color"
              class="dg-field-color dg-prop-color-swatch"
              aria-label="边框色"
              @input="patchNode({ stroke: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="边框粗细">
            <InputText
              :model-value="String(selection.node.strokeWidth)"
              type="number"
              class="dg-prop-control dg-prop-control--num"
              @update:model-value="
                patchNode({ strokeWidth: parseNumber($event, selection.node!.strokeWidth) })
              "
            />
          </SettingsRow>
          <SettingsRow label="阴影">
            <WwSelect
              :model-value="selection.node.shadow"
              :options="DIAGRAM_SHADOW_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchNode({ shadow: String($event ?? 'none') })"
            />
          </SettingsRow>
        </section>
      </template>

      <div v-else-if="activeTab === 'node'" class="dg-panel__empty">
        <WwIcon name="square" size="sm" class="opacity-30" />
        <p class="dg-hint">选中图元以编辑属性</p>
      </div>

      <!-- 连线 -->
      <template v-if="showEdge && selection.edge">
        <section v-if="!multiEdge" class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">文本</p>
          <SettingsRow label="标签">
            <InputText
              :model-value="selection.edge.text"
              class="dg-prop-control"
              @update:model-value="patchEdge({ text: String($event ?? '') })"
            />
          </SettingsRow>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">线条</p>
          <SettingsRow label="线型">
            <WwSelect
              :model-value="selection.edge.type"
              :options="DIAGRAM_EDGE_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ type: String($event ?? 'polyline') })"
            />
          </SettingsRow>
          <SettingsRow label="虚线">
            <WwSelect
              :model-value="selection.edge.strokeDasharray"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="颜色">
            <input
              :value="selection.edge.stroke"
              type="color"
              class="dg-field-color dg-prop-color-swatch"
              aria-label="线条颜色"
              @input="patchEdge({ stroke: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="粗细">
            <InputText
              :model-value="String(selection.edge.strokeWidth)"
              type="number"
              class="dg-prop-control dg-prop-control--num"
              @update:model-value="
                patchEdge({ strokeWidth: parseNumber($event, selection.edge!.strokeWidth) })
              "
            />
          </SettingsRow>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">箭头</p>
          <SettingsRow label="起点">
            <WwSelect
              :model-value="selection.edge.startArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ startArrowType: String($event ?? 'none') })"
            />
          </SettingsRow>
          <SettingsRow label="终点">
            <WwSelect
              :model-value="selection.edge.endArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchEdge({ endArrowType: String($event ?? 'arrow') })"
            />
          </SettingsRow>
        </section>
      </template>

      <div v-else-if="activeTab === 'edge'" class="dg-panel__empty">
        <WwIcon name="link" size="sm" class="opacity-30" />
        <p class="dg-hint">选中连线以编辑样式</p>
      </div>

      <!-- 画布 -->
      <template v-if="activeTab === 'canvas'">
        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">画布</p>
          <SettingsRow label="显示网格">
            <WwToggleSwitch
              :model-value="canvas.gridVisible"
              aria-label="显示网格"
              @update:model-value="patchCanvas({ gridVisible: $event })"
            />
          </SettingsRow>
          <SettingsRow label="捕捉对齐">
            <WwToggleSwitch
              :model-value="canvas.snapGrid"
              aria-label="捕捉对齐"
              @update:model-value="patchCanvas({ snapGrid: $event })"
            />
          </SettingsRow>
          <SettingsRow label="导航窗口">
            <WwToggleSwitch
              :model-value="canvas.miniMapVisible"
              aria-label="显示导航窗口"
              @update:model-value="patchCanvas({ miniMapVisible: $event })"
            />
          </SettingsRow>
          <SettingsRow label="背景色">
            <input
              :value="canvas.backgroundColor"
              type="color"
              class="dg-field-color dg-prop-color-swatch"
              aria-label="背景色"
              @input="patchCanvas({ backgroundColor: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="主题配色">
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
          <SettingsRow label="线型">
            <WwSelect
              :model-value="canvas.defaultEdge.type"
              :options="DIAGRAM_EDGE_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchDefaultEdge({ type: String($event ?? 'polyline') })"
            />
          </SettingsRow>
          <SettingsRow label="默认线条色">
            <input
              :value="canvas.defaultEdge.stroke"
              type="color"
              class="dg-field-color dg-prop-color-swatch"
              aria-label="默认线条颜色"
              @input="patchDefaultEdge({ stroke: ($event.target as HTMLInputElement).value })"
            />
          </SettingsRow>
          <SettingsRow label="粗细">
            <InputText
              :model-value="String(canvas.defaultEdge.strokeWidth)"
              type="number"
              class="dg-prop-control dg-prop-control--num"
              @update:model-value="
                patchDefaultEdge({
                  strokeWidth: parseNumber($event, canvas.defaultEdge.strokeWidth)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="虚线">
            <WwSelect
              :model-value="canvas.defaultEdge.strokeDasharray"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchDefaultEdge({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="终点箭头">
            <WwSelect
              :model-value="canvas.defaultEdge.endArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="narrow"
              @update:model-value="patchDefaultEdge({ endArrowType: String($event ?? 'arrow') })"
            />
          </SettingsRow>
        </section>
      </template>
    </div>
    </template>
  </aside>
</template>
