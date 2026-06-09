<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwTruncatedText from '@shared/components/WwTruncatedText.vue'
import type { DiagramNodeShapeExtensionView } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import {
  useUmlClassifierEditFocus,
  type UmlClassifierPanelFocus
} from '@modules/library/diagrams/extensions/uml/composables/useUmlClassifierEditFocus'
import {
  formatUmlAttributeExpression,
  formatUmlOperationExpression,
  formatParametersInput,
  parseParametersInput
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierFormat'
import {
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
}>()

const emit = defineEmits<{
  patch: [data: UmlClassifierData]
}>()

const { panelFocus, setPanelFocus } = useUmlClassifierEditFocus()
const memberRefs = ref(new Map<string, HTMLElement>())
const nameRowRef = ref<HTMLElement | null>(null)

const data = computed(() => props.shapeExtension.data as UmlClassifierData)

const visibilityOptions = UML_VISIBILITY_OPTIONS.map((item) => ({
  label: `${item.symbol} ${item.label}`,
  value: item.value
}))

function patch(partial: Partial<UmlClassifierData>) {
  emit('patch', { ...data.value, ...partial })
}

function onClassifierKind(value: UmlClassifierKind) {
  patch({ classifierKind: value })
}

function setMemberRef(id: string, el: Element | null) {
  if (el instanceof HTMLElement) memberRefs.value.set(id, el)
  else memberRefs.value.delete(id)
}

const expandedAttributes = ref(new Set<string>())
const expandedOperations = ref(new Set<string>())

const isNameFocused = computed(() => {
  const focus = panelFocus.value
  return focus?.nodeId === props.nodeId && focus.region === 'name'
})

function focusInputIn(container: HTMLElement | null | undefined) {
  const input = container?.querySelector('input')
  if (!(input instanceof HTMLInputElement)) return
  input.focus()
  input.select()
}

async function applyPanelFocus(focus: UmlClassifierPanelFocus) {
  if (focus.nodeId !== props.nodeId) return

  if (focus.region === 'attributes-add') {
    addAttribute()
    return
  }
  if (focus.region === 'operations-add') {
    addOperation()
    return
  }

  await nextTick()

  if (focus.region === 'name') {
    nameRowRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    focusInputIn(nameRowRef.value)
    return
  }

  if (focus.region === 'attribute' || focus.region === 'operation') {
    expandMember(focus.memberId, focus.region)
    await nextTick()
    const el = memberRefs.value.get(focus.memberId)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    focusInputIn(el)
  }
}

watch(() => panelFocus.value, (focus) => {
  if (focus) void applyPanelFocus(focus)
})

watch(
  () => props.nodeId,
  () => {
    expandedAttributes.value = new Set()
    expandedOperations.value = new Set()
  }
)

function memberExpandedSet(kind: 'attribute' | 'operation') {
  return kind === 'attribute' ? expandedAttributes : expandedOperations
}

function isMemberExpanded(memberId: string, kind: 'attribute' | 'operation'): boolean {
  return memberExpandedSet(kind).value.has(memberId)
}

function expandMember(memberId: string, kind: 'attribute' | 'operation') {
  const set = memberExpandedSet(kind)
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

function openMember(memberId: string, kind: 'attribute' | 'operation') {
  expandMember(memberId, kind)
  setPanelFocus({
    nodeId: props.nodeId,
    region: kind,
    memberId
  })
}

function focusName() {
  setPanelFocus({ nodeId: props.nodeId, region: 'name' })
}

function addAttribute() {
  const next: UmlAttribute = {
    id: createMemberId(),
    name: 'field',
    visibility: 'private',
    isStatic: false,
    type: 'string'
  }
  patch({ attributes: [...data.value.attributes, next] })
  openMember(next.id, 'attribute')
}

function updateAttribute(id: string, partial: Partial<UmlAttribute>) {
  patch({
    attributes: data.value.attributes.map((item) =>
      item.id === id ? { ...item, ...partial } : item
    )
  })
}

function removeAttribute(id: string) {
  if (panelFocus.value?.nodeId === props.nodeId && panelFocus.value.region === 'attribute' && panelFocus.value.memberId === id) {
    setPanelFocus(null)
  }
  collapseMember(id, 'attribute')
  patch({ attributes: data.value.attributes.filter((item) => item.id !== id) })
}

function moveAttribute(id: string, dir: -1 | 1) {
  const list = [...data.value.attributes]
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return
  const target = index + dir
  if (target < 0 || target >= list.length) return
  ;[list[index], list[target]] = [list[target], list[index]]
  patch({ attributes: list })
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
  patch({ operations: [...data.value.operations, next] })
  openMember(next.id, 'operation')
}

function updateOperation(id: string, partial: Partial<UmlOperation>) {
  patch({
    operations: data.value.operations.map((item) =>
      item.id === id ? { ...item, ...partial } : item
    )
  })
}

function removeOperation(id: string) {
  if (panelFocus.value?.nodeId === props.nodeId && panelFocus.value.region === 'operation' && panelFocus.value.memberId === id) {
    setPanelFocus(null)
  }
  collapseMember(id, 'operation')
  patch({ operations: data.value.operations.filter((item) => item.id !== id) })
}

function moveOperation(id: string, dir: -1 | 1) {
  const list = [...data.value.operations]
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return
  const target = index + dir
  if (target < 0 || target >= list.length) return
  ;[list[index], list[target]] = [list[target], list[index]]
  patch({ operations: list })
}

function onParametersInput(id: string, raw: string) {
  updateOperation(id, { parameters: parseParametersInput(raw) })
}
</script>

<template>
  <section
    v-if="shapeExtension.kind === UML_CLASSIFIER_KIND"
    class="dg-prop-section dg-prop-group dg-uml"
  >
    <p class="dg-prop-section__title">UML</p>
      <SettingsRow label="类型" class="dg-settings-row--stacked">
        <WwSelect
          :model-value="data.classifierKind"
          :options="UML_CLASSIFIER_KIND_OPTIONS"
          option-label="label"
          option-value="value"
          size="block"
          class="dg-prop-control dg-prop-control--full"
          @update:model-value="onClassifierKind($event as UmlClassifierKind)"
        />
      </SettingsRow>
      <div
        ref="nameRowRef"
        class="dg-uml-name"
        :class="{ 'dg-uml-name--active': isNameFocused }"
        @click="focusName"
      >
        <SettingsRow label="名称" class="dg-settings-row--stacked">
          <InputText
            :model-value="data.name"
            class="dg-prop-control"
            placeholder="ClassName"
            @update:model-value="patch({ name: String($event ?? '') })"
            @focus="focusName"
          />
        </SettingsRow>
      </div>

      <div class="dg-uml-subsection dg-uml-members">
        <div class="dg-uml-block__head">
        <span class="dg-uml-block__label">属性</span>
        <WwIconButton icon="plus" icon-size="sm" compact ariaLabel="添加属性" @click="addAttribute" />
      </div>

      <p v-if="!data.attributes.length" class="dg-uml-block__empty">暂无属性</p>

      <div
        v-for="(attr, index) in data.attributes"
        :key="attr.id"
        :ref="(el) => setMemberRef(attr.id, el as Element | null)"
        class="dg-uml-member"
        :class="{ 'dg-uml-member--expanded': isMemberExpanded(attr.id, 'attribute') }"
      >
        <div class="dg-uml-member__bar" @click="toggleMemberExpanded(attr.id, 'attribute')">
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
          <SettingsRow label="可见性" class="dg-settings-row--inline dg-uml-field-row dg-uml-vis-row">
            <WwSelect
              :model-value="attr.visibility"
              :options="visibilityOptions"
              option-label="label"
              option-value="value"
              size="narrow"
              class="dg-prop-control dg-uml-vis-select"
              @update:model-value="updateAttribute(attr.id, { visibility: $event as UmlVisibility })"
            />
          </SettingsRow>
          <SettingsRow label="名称" class="dg-settings-row--stacked dg-uml-field-row">
            <InputText
              :model-value="attr.name"
              placeholder="field"
              class="dg-prop-control"
              @update:model-value="updateAttribute(attr.id, { name: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="类型" class="dg-settings-row--stacked dg-uml-field-row">
            <InputText
              :model-value="attr.type ?? ''"
              placeholder="string"
              class="dg-prop-control"
              @update:model-value="updateAttribute(attr.id, { type: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="修饰" class="dg-settings-row--inline dg-uml-field-row">
            <div class="dg-prop-row--toggles dg-uml-modifier-toggles">
              <button
                type="button"
                class="dg-prop-toggle dg-prop-toggle--icon"
                :class="{ 'dg-prop-toggle--active': attr.isStatic }"
                title="静态"
                @click="updateAttribute(attr.id, { isStatic: !attr.isStatic })"
              >
                S
              </button>
            </div>
          </SettingsRow>
        </div>
      </div>
      </div>

      <div class="dg-uml-subsection dg-uml-members">
        <div class="dg-uml-block__head">
        <span class="dg-uml-block__label">操作</span>
        <WwIconButton icon="plus" icon-size="sm" compact ariaLabel="添加操作" @click="addOperation" />
      </div>

      <p v-if="!data.operations.length" class="dg-uml-block__empty">暂无操作</p>

      <div
        v-for="(op, index) in data.operations"
        :key="op.id"
        :ref="(el) => setMemberRef(op.id, el as Element | null)"
        class="dg-uml-member"
        :class="{ 'dg-uml-member--expanded': isMemberExpanded(op.id, 'operation') }"
      >
        <div class="dg-uml-member__bar" @click="toggleMemberExpanded(op.id, 'operation')">
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
          <SettingsRow label="可见性" class="dg-settings-row--inline dg-uml-field-row dg-uml-vis-row">
            <WwSelect
              :model-value="op.visibility"
              :options="visibilityOptions"
              option-label="label"
              option-value="value"
              size="narrow"
              class="dg-prop-control dg-uml-vis-select"
              @update:model-value="updateOperation(op.id, { visibility: $event as UmlVisibility })"
            />
          </SettingsRow>
          <SettingsRow label="名称" class="dg-settings-row--stacked dg-uml-field-row">
            <InputText
              :model-value="op.name"
              placeholder="method"
              class="dg-prop-control"
              @update:model-value="updateOperation(op.id, { name: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="参数" class="dg-settings-row--stacked dg-uml-field-row">
            <InputText
              :model-value="formatParametersInput(op)"
              placeholder="a: int, b: string"
              class="dg-prop-control"
              @update:model-value="onParametersInput(op.id, String($event ?? ''))"
            />
          </SettingsRow>
          <SettingsRow label="返回类型" class="dg-settings-row--stacked dg-uml-field-row">
            <InputText
              :model-value="op.returnType ?? ''"
              placeholder="void"
              class="dg-prop-control"
              @update:model-value="updateOperation(op.id, { returnType: String($event ?? '') })"
            />
          </SettingsRow>
          <SettingsRow label="修饰" class="dg-settings-row--inline dg-uml-field-row">
            <div class="dg-prop-row--toggles dg-uml-modifier-toggles">
              <button
                type="button"
                class="dg-prop-toggle dg-prop-toggle--icon"
                :class="{ 'dg-prop-toggle--active': op.isStatic }"
                title="静态"
                @click="updateOperation(op.id, { isStatic: !op.isStatic })"
              >
                S
              </button>
              <button
                type="button"
                class="dg-prop-toggle dg-prop-toggle--icon dg-prop-toggle--italic"
                :class="{ 'dg-prop-toggle--active': op.isAbstract }"
                title="抽象"
                @click="updateOperation(op.id, { isAbstract: !op.isAbstract })"
              >
                A
              </button>
            </div>
          </SettingsRow>
        </div>
      </div>
      </div>

      <div class="dg-uml-subsection dg-uml-display">
        <SettingsRow label="显示属性区" class="dg-settings-row--inline">
          <WwToggleSwitch
            :model-value="data.showAttributes"
            aria-label="显示属性区"
            @update:model-value="patch({ showAttributes: $event })"
          />
        </SettingsRow>
        <SettingsRow label="显示操作区" class="dg-settings-row--inline">
          <WwToggleSwitch
            :model-value="data.showOperations"
            aria-label="显示操作区"
            @update:model-value="patch({ showOperations: $event })"
          />
        </SettingsRow>
      </div>
  </section>
</template>

<style scoped>
.dg-uml {
  gap: 0.375rem;
}

.dg-uml :deep(.ww-select.p-select) {
  --ww-select-height: 1.75rem;
  --ww-select-min-w: 0;
  min-height: 1.75rem;
  font-size: 0.75rem;
}

.dg-uml :deep(.ww-select .p-select-label) {
  font-size: 0.75rem;
  padding-block: 0.25rem;
}

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

.dg-uml-block__empty {
  margin: 0;
  padding: 0 0 0.25rem;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
}

.dg-uml-name--active :deep(.ww-settings-row__title) {
  color: var(--ww-accent);
}

.dg-uml-member {
  padding: 0.3125rem 0.375rem;
  border-radius: var(--dg-prop-radius);
  cursor: pointer;
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

.dg-uml-member:hover,
.dg-uml-member--expanded {
  background: color-mix(in srgb, var(--ww-ink-faint) 7.5%, transparent);
}

.dg-uml-member__bar {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 1.5rem;
  padding-right: 3.25rem;
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
  right: 0;
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

.dg-uml-member__fields :deep(.dg-uml-field-row.dg-settings-row--inline) {
  min-height: 1.75rem;
  padding: 0.1875rem 0;
}

.dg-uml-vis-row :deep(.ww-settings-row__label) {
  flex: 1 1 auto;
  min-width: 0;
  padding-right: 0.375rem;
}

.dg-uml-vis-row :deep(.ww-settings-row__control) {
  flex: 0 0 auto;
  width: auto;
  max-width: none;
  padding-right: 0.125rem;
}

.dg-uml-vis-row :deep(.dg-uml-vis-select.ww-select-root) {
  width: 6.875rem;
  max-width: 100%;
}

.dg-uml-vis-row :deep(.ww-select.p-select) {
  width: 6.875rem !important;
  min-width: 6.875rem !important;
  max-width: 100%;
}

.dg-uml-modifier-toggles {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

[data-theme='dark'] .dg-uml-member:hover,
[data-theme='dark'] .dg-uml-member--expanded {
  background: rgb(255 255 255 / 0.07);
}
</style>
