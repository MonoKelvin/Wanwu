<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwTruncatedText from '@shared/components/WwTruncatedText.vue'
import type { DiagramNodeShapeExtensionView } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import {
  formatUmlAttributeExpression,
  formatUmlOperationExpression,
  formatParametersInput,
  normalizeUmlClassifierData,
  parseParametersInput
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierFormat'
import {
  classifierKindChangePatch,
  lfTypeForClassifierKind,
  UML_CLASSIFIER_KIND_OPTIONS,
  UML_VISIBILITY_OPTIONS
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierUi'
import {
  createMemberId,
  UML_CLASSIFIER_KIND,
  type UmlAttribute,
  type UmlClassifierData,
  type UmlClassifierKind,
  type UmlOperation,
  type UmlVisibility
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

const props = defineProps<{
  nodeId: string
  shapeExtension: DiagramNodeShapeExtensionView
  /** Host 有未落盘的 debounced patch 时，跳过外部 data 回写以免覆盖编辑中内容 */
  hasPendingPatch?: boolean
}>()

const emit = defineEmits<{
  patch: [data: UmlClassifierData, immediate?: boolean, meta?: { lfType?: string }]
}>()

const localData = ref(normalizeUmlClassifierData(props.shapeExtension.data))

watch(
  () => props.shapeExtension.data,
  (next) => {
    if (props.hasPendingPatch) return
    const normalized = normalizeUmlClassifierData(next)
    if (JSON.stringify(normalized) === JSON.stringify(localData.value)) return
    localData.value = normalized
  }
)

watch(
  () => props.hasPendingPatch,
  (pending, wasPending) => {
    if (wasPending && !pending) {
      localData.value = normalizeUmlClassifierData(props.shapeExtension.data)
    }
  }
)

watch(
  () => props.nodeId,
  () => {
    localData.value = normalizeUmlClassifierData(props.shapeExtension.data)
    expandedAttributes.value = new Set()
    expandedOperations.value = new Set()
  }
)

const data = computed(() => localData.value)

const visibilityOptions = UML_VISIBILITY_OPTIONS.map((item) => ({
  label: `${item.symbol} ${item.label}`,
  value: item.value
}))

function patch(
  partial: Partial<UmlClassifierData>,
  immediate = false,
  meta?: { lfType?: string }
) {
  localData.value = { ...localData.value, ...partial }
  emit('patch', localData.value, immediate, meta)
}

function patchNow(partial: Partial<UmlClassifierData>) {
  patch(partial, true)
}

/** 文本输入失焦时立即同步画布，避免 debounce 期间切换节点丢数据 */
function flushTextPatch() {
  patch({}, true)
}

function onClassifierKind(value: UmlClassifierKind) {
  patch(classifierKindChangePatch(value), true, { lfType: lfTypeForClassifierKind(value) })
}

const expandedAttributes = ref(new Set<string>())
const expandedOperations = ref(new Set<string>())

function memberExpandedSet(kind: 'attribute' | 'operation') {
  return kind === 'attribute' ? expandedAttributes : expandedOperations
}

function isMemberExpanded(memberId: string, kind: 'attribute' | 'operation'): boolean {
  return memberExpandedSet(kind).value.has(memberId)
}

function expandMember(
  memberId: string,
  kind: 'attribute' | 'operation',
  exclusive = false
) {
  const set = memberExpandedSet(kind)
  if (exclusive) {
    set.value = new Set([memberId])
    return
  }
  if (set.value.has(memberId)) return
  set.value = new Set([...set.value, memberId])
}

function collapseMember(memberId: string, kind: 'attribute' | 'operation') {
  const set = memberExpandedSet(kind)
  if (!set.value.has(memberId)) return
  const next = new Set(set.value)
  next.delete(memberId)
  set.value = next
}

function toggleMemberExpanded(memberId: string, kind: 'attribute' | 'operation') {
  if (isMemberExpanded(memberId, kind)) collapseMember(memberId, kind)
  else expandMember(memberId, kind)
}

function onMemberBarClick(
  memberId: string,
  kind: 'attribute' | 'operation',
  event: MouseEvent
) {
  if (event.detail > 1) return
  toggleMemberExpanded(memberId, kind)
}

function onMemberBarDblClick(
  memberId: string,
  kind: 'attribute' | 'operation',
  event: MouseEvent
) {
  event.preventDefault()
  expandMember(memberId, kind, true)
}

function addAttribute() {
  const next: UmlAttribute = {
    id: createMemberId(),
    name: 'field',
    visibility: 'private',
    isStatic: false,
    type: 'string'
  }
  const partial: Partial<UmlClassifierData> = {
    attributes: [...data.value.attributes, next]
  }
  if (!data.value.showAttributes) partial.showAttributes = true
  patchNow(partial)
  expandMember(next.id, 'attribute', true)
}

function updateAttribute(id: string, partial: Partial<UmlAttribute>, immediate = false) {
  patch(
    {
      attributes: data.value.attributes.map((item) =>
        item.id === id ? { ...item, ...partial } : item
      )
    },
    immediate
  )
}

function removeAttribute(id: string) {
  collapseMember(id, 'attribute')
  patchNow({ attributes: data.value.attributes.filter((item) => item.id !== id) })
}

function moveAttribute(id: string, dir: -1 | 1) {
  const list = [...data.value.attributes]
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return
  const target = index + dir
  if (target < 0 || target >= list.length) return
  ;[list[index], list[target]] = [list[target], list[index]]
  patchNow({ attributes: list })
}

function addOperation() {
  const next: UmlOperation = {
    id: createMemberId(),
    name: 'method',
    visibility: 'public',
    isStatic: false,
    isAbstract: false,
    parameters: [],
    returnType: 'void'
  }
  const partial: Partial<UmlClassifierData> = {
    operations: [...data.value.operations, next]
  }
  if (!data.value.showOperations) partial.showOperations = true
  patchNow(partial)
  expandMember(next.id, 'operation', true)
}

function updateOperation(id: string, partial: Partial<UmlOperation>, immediate = false) {
  patch(
    {
      operations: data.value.operations.map((item) =>
        item.id === id ? { ...item, ...partial } : item
      )
    },
    immediate
  )
}

function removeOperation(id: string) {
  collapseMember(id, 'operation')
  patchNow({ operations: data.value.operations.filter((item) => item.id !== id) })
}

function moveOperation(id: string, dir: -1 | 1) {
  const list = [...data.value.operations]
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return
  const target = index + dir
  if (target < 0 || target >= list.length) return
  ;[list[index], list[target]] = [list[target], list[index]]
  patchNow({ operations: list })
}

function onParametersInput(id: string, raw: string) {
  updateOperation(id, { parameters: parseParametersInput(raw) })
}

/** 至少保留一个分区可见，避免空白类图 */
function onShowAttributes(value: boolean) {
  if (!value && !data.value.showOperations) {
    patchNow({ showAttributes: false, showOperations: true })
    return
  }
  if (!value) {
    expandedAttributes.value = new Set()
  }
  patchNow({ showAttributes: value })
}

function onShowOperations(value: boolean) {
  if (!value && !data.value.showAttributes) {
    patchNow({ showOperations: false, showAttributes: true })
    return
  }
  if (!value) {
    expandedOperations.value = new Set()
  }
  patchNow({ showOperations: value })
}
</script>

<template>
  <section
    v-if="shapeExtension.kind === UML_CLASSIFIER_KIND"
    class="dg-prop-section dg-prop-group dg-uml"
  >
    <p class="dg-prop-section__title">UML</p>
      <SettingsRow label="类型" class="dg-settings-row--inline dg-settings-row--control dg-uml-field-row">
        <WwSelect
          :model-value="data.classifierKind"
          :options="UML_CLASSIFIER_KIND_OPTIONS"
          option-label="label"
          option-value="value"
          size="block"
          class="dg-prop-control"
          @update:model-value="onClassifierKind($event as UmlClassifierKind)"
        />
      </SettingsRow>
      <SettingsRow label="名称" class="dg-settings-row--inline dg-settings-row--control dg-uml-field-row">
        <InputText
          :model-value="data.name"
          class="dg-prop-control"
          placeholder="ClassName"
          @update:model-value="patch({ name: String($event ?? '') })"
          @blur="flushTextPatch"
        />
      </SettingsRow>

      <p
        v-if="!data.showAttributes"
        class="dg-uml-subsection dg-uml-block__empty dg-uml-block__empty--action"
        @click="onShowAttributes(true)"
      >
        属性区已隐藏 · 点击显示
      </p>
      <div v-else class="dg-uml-subsection dg-uml-members">
        <div class="dg-uml-block__head">
        <span class="dg-uml-block__label">
          属性<span v-if="data.attributes.length" class="dg-uml-block__count"> ({{ data.attributes.length }})</span>
        </span>
        <WwIconButton icon="plus" icon-size="sm" compact ariaLabel="添加属性" @click="addAttribute" />
      </div>

      <div
        v-for="(attr, index) in data.attributes"
        :key="attr.id"
        class="dg-uml-member"
        :class="{ 'dg-uml-member--expanded': isMemberExpanded(attr.id, 'attribute') }"
      >
        <div
          class="dg-uml-member__bar"
          @click="onMemberBarClick(attr.id, 'attribute', $event)"
          @dblclick="onMemberBarDblClick(attr.id, 'attribute', $event)"
        >
          <WwTruncatedText
            :text="formatUmlAttributeExpression(attr)"
            class="dg-uml-member__expr"
          />
          <div class="dg-uml-member__tools">
            <WwIconButton
              icon="chevron-up"
              icon-size="sm"
              compact
              :disabled="index === 0"
              ariaLabel="上移"
              @click.stop="moveAttribute(attr.id, -1)"
            />
            <WwIconButton
              icon="chevron-down"
              icon-size="sm"
              compact
              :disabled="index === data.attributes.length - 1"
              ariaLabel="下移"
              @click.stop="moveAttribute(attr.id, 1)"
            />
            <WwIconButton
              icon="trash-2"
              icon-size="sm"
              compact
              ariaLabel="删除"
              @click.stop="removeAttribute(attr.id)"
            />
          </div>
        </div>
        <div v-show="isMemberExpanded(attr.id, 'attribute')" class="dg-uml-member__fields">
          <SettingsRow label="可见性" class="dg-settings-row--inline dg-settings-row--control dg-uml-member-field-row">
            <WwSelect
              :model-value="attr.visibility"
              :options="visibilityOptions"
              option-label="label"
              option-value="value"
              size="block"
              class="dg-prop-control"
              @update:model-value="updateAttribute(attr.id, { visibility: $event as UmlVisibility }, true)"
            />
          </SettingsRow>
          <SettingsRow label="名称" class="dg-settings-row--inline dg-settings-row--control dg-uml-member-field-row">
            <InputText
              :model-value="attr.name"
              placeholder="field"
              class="dg-prop-control dg-uml-member-name-input"
              @update:model-value="updateAttribute(attr.id, { name: String($event ?? '') })"
              @blur="flushTextPatch"
            />
          </SettingsRow>
          <SettingsRow label="类型" class="dg-settings-row--inline dg-settings-row--control dg-uml-member-field-row">
            <InputText
              :model-value="attr.type ?? ''"
              placeholder="string"
              class="dg-prop-control"
              @update:model-value="updateAttribute(attr.id, { type: String($event ?? '') })"
              @blur="flushTextPatch"
            />
          </SettingsRow>
          <SettingsRow label="修饰" class="dg-settings-row--inline dg-settings-row--modifier dg-uml-field-row">
            <div class="dg-prop-row--toggles dg-uml-modifier-toggles">
              <button
                type="button"
                class="dg-prop-toggle dg-prop-toggle--icon"
                :class="{ 'dg-prop-toggle--active': attr.isStatic }"
                title="静态"
                @click="updateAttribute(attr.id, { isStatic: !attr.isStatic }, true)"
              >
                S
              </button>
            </div>
          </SettingsRow>
        </div>
      </div>
      </div>

      <p
        v-if="!data.showOperations"
        class="dg-uml-subsection dg-uml-block__empty dg-uml-block__empty--action"
        @click="onShowOperations(true)"
      >
        操作区已隐藏 · 点击显示
      </p>
      <div v-else class="dg-uml-subsection dg-uml-members">
        <div class="dg-uml-block__head">
        <span class="dg-uml-block__label">
          操作<span v-if="data.operations.length" class="dg-uml-block__count"> ({{ data.operations.length }})</span>
        </span>
        <WwIconButton icon="plus" icon-size="sm" compact ariaLabel="添加操作" @click="addOperation" />
      </div>

      <div
        v-for="(op, index) in data.operations"
        :key="op.id"
        class="dg-uml-member"
        :class="{ 'dg-uml-member--expanded': isMemberExpanded(op.id, 'operation') }"
      >
        <div
          class="dg-uml-member__bar"
          @click="onMemberBarClick(op.id, 'operation', $event)"
          @dblclick="onMemberBarDblClick(op.id, 'operation', $event)"
        >
          <WwTruncatedText
            :text="formatUmlOperationExpression(op)"
            class="dg-uml-member__expr"
          />
          <div class="dg-uml-member__tools">
            <WwIconButton
              icon="chevron-up"
              icon-size="sm"
              compact
              :disabled="index === 0"
              ariaLabel="上移"
              @click.stop="moveOperation(op.id, -1)"
            />
            <WwIconButton
              icon="chevron-down"
              icon-size="sm"
              compact
              :disabled="index === data.operations.length - 1"
              ariaLabel="下移"
              @click.stop="moveOperation(op.id, 1)"
            />
            <WwIconButton
              icon="trash-2"
              icon-size="sm"
              compact
              ariaLabel="删除"
              @click.stop="removeOperation(op.id)"
            />
          </div>
        </div>
        <div v-show="isMemberExpanded(op.id, 'operation')" class="dg-uml-member__fields">
          <SettingsRow label="可见性" class="dg-settings-row--inline dg-settings-row--control dg-uml-member-field-row">
            <WwSelect
              :model-value="op.visibility"
              :options="visibilityOptions"
              option-label="label"
              option-value="value"
              size="block"
              class="dg-prop-control"
              @update:model-value="updateOperation(op.id, { visibility: $event as UmlVisibility }, true)"
            />
          </SettingsRow>
          <SettingsRow label="名称" class="dg-settings-row--inline dg-settings-row--control dg-uml-member-field-row">
            <InputText
              :model-value="op.name"
              placeholder="method"
              class="dg-prop-control dg-uml-member-name-input"
              @update:model-value="updateOperation(op.id, { name: String($event ?? '') })"
              @blur="flushTextPatch"
            />
          </SettingsRow>
          <SettingsRow label="参数" class="dg-settings-row--inline dg-settings-row--control dg-uml-member-field-row">
            <InputText
              :model-value="formatParametersInput(op)"
              placeholder="a: int, b: string"
              class="dg-prop-control"
              @update:model-value="onParametersInput(op.id, String($event ?? ''))"
              @blur="flushTextPatch"
            />
          </SettingsRow>
          <SettingsRow label="返回类型" class="dg-settings-row--inline dg-settings-row--control dg-uml-member-field-row">
            <InputText
              :model-value="op.returnType ?? ''"
              placeholder="void"
              class="dg-prop-control"
              @update:model-value="updateOperation(op.id, { returnType: String($event ?? '') })"
              @blur="flushTextPatch"
            />
          </SettingsRow>
          <SettingsRow label="修饰" class="dg-settings-row--inline dg-settings-row--modifier dg-uml-field-row">
            <div class="dg-prop-row--toggles dg-uml-modifier-toggles">
              <button
                type="button"
                class="dg-prop-toggle dg-prop-toggle--icon"
                :class="{ 'dg-prop-toggle--active': op.isStatic }"
                title="静态"
                @click="updateOperation(op.id, { isStatic: !op.isStatic }, true)"
              >
                S
              </button>
              <button
                type="button"
                class="dg-prop-toggle dg-prop-toggle--icon dg-prop-toggle--italic"
                :class="{ 'dg-prop-toggle--active': op.isAbstract }"
                title="抽象"
                @click="updateOperation(op.id, { isAbstract: !op.isAbstract }, true)"
              >
                A
              </button>
            </div>
          </SettingsRow>
        </div>
      </div>
      </div>

      <div class="dg-uml-subsection dg-uml-display">
        <SettingsRow label="显示属性区" class="dg-settings-row--inline dg-settings-row--toggle">
          <WwToggleSwitch
            :model-value="data.showAttributes"
            aria-label="显示属性区"
            @update:model-value="onShowAttributes($event)"
          />
        </SettingsRow>
        <SettingsRow label="显示操作区" class="dg-settings-row--inline dg-settings-row--toggle">
          <WwToggleSwitch
            :model-value="data.showOperations"
            aria-label="显示操作区"
            @update:model-value="onShowOperations($event)"
          />
        </SettingsRow>
      </div>
  </section>
</template>

<style scoped>
.dg-uml-subsection {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--ww-border-faint);
}

.dg-uml-members {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-inline: 0.125rem;
}

.dg-uml-display :deep(.ww-settings-row:last-child) {
  padding-bottom: 0;
}

[data-theme='dark'] .dg-uml-subsection {
  border-top-color: var(--ww-glass-border);
}

.dg-uml-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
  min-width: 0;
  margin-bottom: 0.25rem;
}

.dg-uml-block__label {
  flex: 1 1 auto;
  min-width: 0;
  width: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ww-ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dg-uml-block__count {
  font-weight: 400;
  color: var(--ww-ink-faint);
}

.dg-uml-block__empty {
  margin: 0;
  padding: 0.3125rem 0.375rem;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
  text-align: left;
}

.dg-uml-block__empty--action {
  width: 100%;
  border: none;
  border-radius: var(--dg-prop-radius);
  background: transparent;
  cursor: pointer;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out);
}

.dg-uml-block__empty--action:hover {
  color: var(--ww-accent);
  background: color-mix(in srgb, var(--ww-ink-faint) 8%, transparent);
}

.dg-uml-member {
  padding: 0.3125rem 0.375rem;
  border-radius: var(--dg-prop-radius);
  cursor: pointer;
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

.dg-uml-member:hover,
.dg-uml-member--expanded,
.dg-uml-member--active {
  background: color-mix(in srgb, var(--ww-ink-faint) 7.5%, transparent);
}

.dg-uml-member--active:not(.dg-uml-member--expanded) .dg-uml-member__expr {
  color: var(--ww-accent);
}

.dg-uml-member__bar {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 1.5rem;
  padding-right: 5.5rem;
  cursor: pointer;
}

.dg-uml-member--expanded .dg-uml-member__bar {
  margin-bottom: 0.25rem;
}

.dg-uml-member__expr {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink-faint);
}

.dg-uml-member--expanded .dg-uml-member__expr {
  color: var(--ww-ink);
}

.dg-uml-member__tools {
  position: absolute;
  right: -0.25rem;
  top: 50%;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.0625rem;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.dg-uml-member:hover .dg-uml-member__tools,
.dg-uml-member--expanded .dg-uml-member__tools {
  opacity: 1;
  pointer-events: auto;
}

.dg-uml-member__fields {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-inline: 0.0625rem;
  padding-bottom: 0.125rem;
}

.dg-uml-member__fields :deep(.dg-uml-field-row.ww-settings-row) {
  padding: 0.25rem 0;
  gap: 0.25rem;
}

.dg-uml-member__fields :deep(.ww-settings-row__title) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-theme='dark'] .dg-uml-member:hover,
[data-theme='dark'] .dg-uml-member--expanded,
[data-theme='dark'] .dg-uml-member--active {
  background: rgb(255 255 255 / 0.07);
}
</style>
