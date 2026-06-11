<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import WwIcon from '@shared/components/WwIcon.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import WwFontSelect from '@shared/components/WwFontSelect/WwFontSelect.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import DiagramMultiSelectTools from '@modules/library/diagrams/components/DiagramMultiSelectTools.vue'
import DiagramShapePropertyHost from '@modules/library/diagrams/components/shape-properties/DiagramShapePropertyHost.vue'
import { registerDiagramShapeExtensionUi } from '@modules/library/diagrams/app/diagramShapeExtensionUi'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'

registerDiagramShapeExtensionUi()
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
import { UML_CLASSIFIER_KIND } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'
import {
  togglePropsPanelCollapsed,
  useDiagramEditorLayout
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  effectiveEdgeCount,
  effectiveNodeCount,
  selectionScopeKey
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

const props = defineProps<{
  fileId: string | null
}>()

const selectionApi = useDiagramEditorSelection()
const selection = computed(() => selectionApi.selection.value)
const selectionScope = computed(() => selectionScopeKey(selection.value))

const bus = useDiagramCommandBus()
const toast = useWanwuToast()
const imageBusy = ref(false)
const activeTab = ref<'node' | 'edge' | 'canvas'>('canvas')
const layout = useDiagramEditorLayout()

watch(
  selectionScope,
  () => {
    const s = selection.value
    const nodeCount = effectiveNodeCount(s)
    const edgeCount = effectiveEdgeCount(s)
    const total = nodeCount + edgeCount
    if (s.kind === 'canvas' || total === 0) {
      activeTab.value = 'canvas'
      return
    }
    if (edgeCount > 0 && nodeCount === 0) {
      activeTab.value = 'edge'
      return
    }
    if (nodeCount > 0) {
      activeTab.value = 'node'
    }
  },
  { immediate: true }
)

const showNode = computed(
  () => activeTab.value === 'node' && effectiveNodeCount(selection.value) > 0
)
const showEdge = computed(
  () => activeTab.value === 'edge' && effectiveEdgeCount(selection.value) > 0
)
const canvas = computed(() => selection.value.canvas)
const multiNode = computed(() => effectiveNodeCount(selection.value) > 1)
const multiEdge = computed(() => effectiveEdgeCount(selection.value) > 1)
const multiSelect = computed(
  () => effectiveNodeCount(selection.value) + effectiveEdgeCount(selection.value) > 1
)
const showMultiSelectTools = computed(
  () => multiSelect.value || Boolean(selection.value.canUngroup)
)
const isGroupFrame = computed(() => {
  if (effectiveNodeCount(selection.value) !== 1) return false
  return selection.value.node?.type === DIAGRAM_GROUP_FRAME_TYPE
})
const shapeHostKey = computed(() => {
  const node = selection.value.node
  if (!node) return `none|${selectionApi.revision.value}`
  return [
    selectionApi.revision.value,
    node.id,
    node.type,
    node.groupId ?? '',
    node.shapeExtension?.kind ?? ''
  ].join('|')
})
const showGroupFrame = computed(() => isGroupFrame.value && showNode.value)
const isGroupedMember = computed(
  () => !multiNode.value && Boolean(selection.value.node?.groupId)
)

const selectionBanner = computed(() => {
  const nc = effectiveNodeCount(selection.value)
  const ec = effectiveEdgeCount(selection.value)
  if (nc > 0 && ec > 0) return `${nc} 图元 · ${ec} 连线`
  if (nc > 1) return `${nc} 图元`
  if (ec > 1) return `${ec} 连线`
  return ''
})

function isMixed(field: string): boolean {
  return multiNode.value && selection.value.mixedNodeFields.includes(field)
}

function isTextAlignActive(value: string): boolean {
  if (isMixed('textStyle.textAlign')) return false
  return selection.value.node?.textStyle.textAlign === value
}

function isFontWeightActive(): boolean {
  if (isMixed('textStyle.fontWeight')) return false
  return selection.value.node?.textStyle.fontWeight === 'bold'
}

const dispatchBatchNode = useDebounceFn((nodeProps: Record<string, unknown>) => {
  void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
}, 200)

const dispatchNodeText = useDebounceFn((nodeProps: Record<string, unknown>) => {
  const id = selection.value.node?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
}, 200)

function patchNodeNow(nodeProps: Record<string, unknown>) {
  if (multiNode.value) {
    void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
    return
  }
  const id = selection.value.node?.id
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
  const id = selection.value.edge?.id
  if (!id) return
  void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
}

const dispatchBatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
  void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
}, 200)

const dispatchEdgeText = useDebounceFn((edgeProps: Record<string, unknown>) => {
  const id = selection.value.edge?.id
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
  const ts = selection.value.node?.textStyle
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
  const ts = selection.value.node?.textStyle
  if (!ts) return
  patchNodeTextStyle({ underline: !ts.underline })
}

function toggleItalic() {
  const ts = selection.value.node?.textStyle
  if (!ts) return
  patchNodeTextStyle({ fontStyle: (ts.fontStyle ?? 'normal') === 'italic' ? 'normal' : 'italic' })
}

function toggleStrikethrough() {
  const ts = selection.value.node?.textStyle
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
  const node = selection.value.node
  if (!node) return
  patchNodeNumeric({
    x: left + node.width / 2,
    y: top + node.height / 2
  })
}

function patchNodeSizeKeepTopLeft(width: number, height: number) {
  const node = selection.value.node
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
  const node = selection.value.node
  if (!node || multiNode.value) return false
  return node.type === 'dg-image' || Boolean(node.imageAsset?.url)
})

const shapeKindRegistration = computed(() => {
  const ext = selection.value.node?.shapeExtension
  if (!ext?.kind) return null
  return ensureDiagramShapeExtensions().getKind(ext.kind) ?? null
})

const showShapeExtensionHost = computed(() => {
  if (!showNode.value || multiNode.value) return false
  const node = selection.value.node
  if (!node?.shapeExtension?.kind) return false
  return Boolean(shapeKindRegistration.value?.propertyEditor)
})

const hideGenericTextContent = computed(
  () => shapeKindRegistration.value?.propertyEditor?.order === 'replace-text'
)

const nodeTextSectionTitle = computed(() =>
  selection.value.node?.shapeExtension?.kind === UML_CLASSIFIER_KIND ? '标题样式' : '文本'
)

async function pickNodeImage() {
  if (!props.fileId) {
    toast.info('请先保存文档后再插入图片')
    return
  }
  const nodeId = selection.value.node?.id
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
  const nodeId = selection.value.node?.id
  if (!nodeId) return
  void bus.dispatch({
    type: 'canvas.updateNode',
    payload: { nodeId, nodeProps: { imageAsset: null } }
  })
}

function patchGroupStyle(patch: Record<string, unknown>) {
  const id = selection.value.node?.id
  if (!id) return
  const node = selection.value.node
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

function patchGroupAlwaysVisible(value: boolean) {
  const id = selection.value.node?.id
  if (!id) return
  void bus.dispatch({
    type: 'canvas.updateNode',
    payload: {
      nodeId: id,
      patch: {
        properties: {
          dgGroupAlwaysVisible: value
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
        v-if="showMultiSelectTools"
        :key="`multi-${selectionScope}`"
      />

      <!-- 组合框 -->
      <template v-if="showGroupFrame && selection.node" :key="`group-${selectionScope}`">
        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">组合框</p>
          <p v-if="selection.node.groupMemberCount != null" class="dg-prop-hint">
            含 {{ selection.node.groupMemberCount }} 个图元
            <template v-if="selection.node.groupEdgeCount">
              · {{ selection.node.groupEdgeCount }} 条连线
            </template>
            。点击空白区域拖动整体；点击内部图元可单独编辑。
          </p>
          <SettingsRow label="始终显示" class="dg-settings-row--inline dg-settings-row--toggle">
            <WwToggleSwitch
              :model-value="selection.node.groupAlwaysVisible ?? false"
              aria-label="始终显示组合框"
              @update:model-value="patchGroupAlwaysVisible($event)"
            />
          </SettingsRow>
          <p v-if="!(selection.node.groupAlwaysVisible ?? false)" class="dg-prop-hint">
            关闭时仅在悬停、选中或选中内部图元时显示边框
          </p>
          <SettingsRow label="边框色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="selection.node.stroke"
              aria-label="组合框边框色"
              @update:model-value="patchGroupStyle({ stroke: $event })"
            />
          </SettingsRow>
          <SettingsRow label="填充色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="selection.node.fill"
              allow-transparent
              aria-label="组合框填充色"
              @update:model-value="patchGroupStyle({ fill: $event })"
            />
          </SettingsRow>
          <SettingsRow label="边框粗细" class="dg-settings-row--inline dg-settings-row--control">
            <WwNumberInput
              :model-value="selection.node.strokeWidth"
              :min="0"
              :step="0.5"
              :max-fraction-digits="1"
              size="block"
              @update:model-value="
                patchGroupStyle({
                  strokeWidth: parseNumber($event, selection.node!.strokeWidth, 0)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="selection.node.strokeDasharray ?? ''"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchGroupStyle({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
        </section>
      </template>

      <!-- 已组合图元 -->
      <section
        v-if="showNode && selection.node && isGroupedMember && !isGroupFrame"
        class="dg-prop-section dg-prop-group dg-prop-grouped-banner"
      >
        <p class="dg-prop-grouped-banner__text">该图元已在组合内，可直接编辑；需要拆分时可使用上方取消组合。</p>
      </section>

      <!-- 图形 -->
      <template v-if="showNode && selection.node && !isGroupFrame">
        <DiagramShapePropertyHost
          v-if="showShapeExtensionHost"
          :key="shapeHostKey"
          :node="selection.node"
        />
        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">{{ nodeTextSectionTitle }}</p>
          <SettingsRow
            v-if="!multiNode && !hideGenericTextContent"
            label="内容"
            class="dg-settings-row--stacked"
          >
            <Textarea
              :model-value="selection.node.text"
              class="dg-prop-control dg-prop-textarea"
              auto-resize
              rows="1"
              @update:model-value="patchNode({ text: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="字号" class="dg-settings-row--inline dg-settings-row--control dg-settings-row--font-size">
            <WwNumberInput
              :model-value="isMixed('textStyle.fontSize') ? null : selection.node.textStyle.fontSize"
              :placeholder="isMixed('textStyle.fontSize') ? '多种' : undefined"
              :min="8"
              :max="128"
              size="block"
              @update:model-value="
                patchNodeTextStyle({
                  fontSize: parseNumber($event, selection.node!.textStyle.fontSize, 8, 128)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="字体" class="dg-settings-row--inline dg-settings-row--control dg-settings-row--font">
            <WwFontSelect
              :model-value="
                isMixed('textStyle.fontFamily') ? null : selection.node.textStyle.fontFamily
              "
              :placeholder="isMixed('textStyle.fontFamily') ? '多种' : '默认'"
              size="block"
              @update:model-value="patchNodeTextStyle({ fontFamily: $event })"
            />
          </SettingsRow>
          <SettingsRow label="颜色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="selection.node.textStyle.color"
              :mixed="isMixed('textStyle.color')"
              aria-label="颜色"
              @update:model-value="patchNodeTextStyle({ color: $event })"
            />
          </SettingsRow>
          <SettingsRow label="对齐" class="dg-settings-row--inline dg-settings-row--modifier">
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
                <WwIcon :name="action.icon" size="xs" />
              </button>
            </div>
          </SettingsRow>
          <SettingsRow label="样式" class="dg-settings-row--inline dg-settings-row--modifier">
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
              <WwNumberInput
                :model-value="nodeTopLeft(selection.node).left"
                size="block"
                @update:model-value="
                  patchNodePositionFromTopLeft(
                    parseNumber($event, nodeTopLeft(selection.node!).left),
                    nodeTopLeft(selection.node!).top
                  )
                "
              />
            </SettingsRow>
            <SettingsRow label="Y" class="dg-settings-row--stacked dg-settings-row--compact">
              <WwNumberInput
                :model-value="nodeTopLeft(selection.node).top"
                size="block"
                @update:model-value="
                  patchNodePositionFromTopLeft(
                    nodeTopLeft(selection.node!).left,
                    parseNumber($event, nodeTopLeft(selection.node!).top)
                  )
                "
              />
            </SettingsRow>
            <SettingsRow label="宽" class="dg-settings-row--stacked dg-settings-row--compact">
              <WwNumberInput
                :model-value="selection.node.width"
                :min="1"
                size="block"
                @update:model-value="
                  patchNodeSizeKeepTopLeft(
                    parseNumber($event, selection.node!.width, 1),
                    selection.node!.height
                  )
                "
              />
            </SettingsRow>
            <SettingsRow label="高" class="dg-settings-row--stacked dg-settings-row--compact">
              <WwNumberInput
                :model-value="selection.node.height"
                :min="1"
                size="block"
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
          <SettingsRow label="填充色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="selection.node.fill"
              :mixed="isMixed('fill')"
              allow-transparent
              aria-label="填充色"
              @update:model-value="patchNode({ fill: $event })"
            />
          </SettingsRow>
          <SettingsRow label="边框色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="selection.node.stroke"
              :mixed="isMixed('stroke')"
              aria-label="边框色"
              @update:model-value="patchNode({ stroke: $event })"
            />
          </SettingsRow>
          <SettingsRow label="边框粗细" class="dg-settings-row--inline dg-settings-row--control">
            <WwNumberInput
              :model-value="isMixed('strokeWidth') ? null : selection.node.strokeWidth"
              :placeholder="isMixed('strokeWidth') ? '多种' : undefined"
              :min="0"
              :step="0.5"
              :max-fraction-digits="1"
              size="block"
              @update:model-value="
                patchNodeNumeric({
                  strokeWidth: parseNumber($event, selection.node!.strokeWidth, 0)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="isMixed('strokeDasharray') ? null : (selection.node.strokeDasharray ?? '')"
              :placeholder="isMixed('strokeDasharray') ? '多种' : undefined"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchNode({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="阴影" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="isMixed('shadow') ? null : selection.node.shadow"
              :placeholder="isMixed('shadow') ? '多种' : undefined"
              :options="DIAGRAM_SHADOW_PRESETS"
              option-label="label"
              option-value="value"
              size="block"
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
          <SettingsRow label="标签" class="dg-settings-row--inline dg-settings-row--control">
            <InputText
              :model-value="selection.edge.text"
              class="dg-prop-control"
              @update:model-value="patchEdge({ text: String($event ?? '') })"
            />
          </SettingsRow>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">线条</p>
          <SettingsRow label="线型" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="selection.edge.type"
              :options="DIAGRAM_EDGE_TYPES"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchEdge({ type: String($event ?? 'polyline') })"
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="selection.edge.strokeDasharray"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchEdge({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="颜色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="selection.edge.stroke"
              aria-label="线条颜色"
              @update:model-value="patchEdge({ stroke: $event })"
            />
          </SettingsRow>
          <SettingsRow label="粗细" class="dg-settings-row--inline dg-settings-row--control">
            <WwNumberInput
              :model-value="selection.edge.strokeWidth"
              :min="0"
              :step="0.5"
              :max-fraction-digits="1"
              size="block"
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
          <SettingsRow label="起点" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="selection.edge.startArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchEdge({ startArrowType: String($event ?? 'none') })"
            />
          </SettingsRow>
          <SettingsRow label="终点" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="selection.edge.endArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="block"
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
          <SettingsRow label="背景色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="canvas.backgroundColor"
              aria-label="背景色"
              @update:model-value="patchCanvas({ backgroundColor: $event })"
            />
          </SettingsRow>
          <SettingsRow label="主题配色" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="canvas.themePreset"
              :options="DIAGRAM_THEME_PRESETS"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchCanvas({ themePreset: String($event ?? 'default') })"
            />
          </SettingsRow>
        </section>

        <section class="dg-prop-section dg-prop-group">
          <p class="dg-prop-section__title">默认连线</p>
          <SettingsRow label="线型" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="canvas.defaultEdge.type"
              :options="DIAGRAM_EDGE_TYPES"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchDefaultEdge({ type: String($event ?? 'polyline') })"
            />
          </SettingsRow>
          <SettingsRow label="默认线条色" class="dg-settings-row--inline dg-settings-row--control">
            <WwColorInput
              :model-value="canvas.defaultEdge.stroke"
              aria-label="默认线条颜色"
              @update:model-value="patchDefaultEdge({ stroke: $event })"
            />
          </SettingsRow>
          <SettingsRow label="粗细" class="dg-settings-row--inline dg-settings-row--control">
            <WwNumberInput
              :model-value="canvas.defaultEdge.strokeWidth"
              :min="0"
              :step="0.5"
              :max-fraction-digits="1"
              size="block"
              @update:model-value="
                patchDefaultEdge({
                  strokeWidth: parseNumber($event, canvas.defaultEdge.strokeWidth, 0)
                })
              "
            />
          </SettingsRow>
          <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="canvas.defaultEdge.strokeDasharray"
              :options="DIAGRAM_DASH_PRESETS"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchDefaultEdge({ strokeDasharray: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="终点箭头" class="dg-settings-row--inline dg-settings-row--control">
            <WwSelect
              :model-value="canvas.defaultEdge.endArrowType"
              :options="DIAGRAM_ARROW_TYPES"
              option-label="label"
              option-value="value"
              size="block"
              @update:model-value="patchDefaultEdge({ endArrowType: String($event ?? 'solid') })"
            />
          </SettingsRow>
        </section>
      </template>
    </div>
  </aside>
</template>
