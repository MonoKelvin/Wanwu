<script setup lang="ts">
import { computed } from 'vue'
import Textarea from 'primevue/textarea'
import WwIcon from '@shared/components/WwIcon.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import WwFontSelect from '@shared/components/WwFontSelect/WwFontSelect.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { DIAGRAM_TEXT_ALIGN_ACTIONS } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'

const { ctx, actions } = useDiagramPropertyContext()
const node = computed(() => ctx.value.selectedNode!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">{{ actions.textSectionTitle() }}</p>
    <SettingsRow
      v-if="!ctx.multiNode && !actions.hideTextContent()"
      label="内容"
      class="dg-settings-row--stacked"
    >
      <Textarea
        :model-value="node.text"
        class="dg-prop-control dg-prop-textarea"
        auto-resize
        rows="1"
        @update:model-value="actions.patchNode({ text: String($event ?? '') })"
      />
    </SettingsRow>
    <SettingsRow label="字号" class="dg-settings-row--inline dg-settings-row--control dg-settings-row--font-size">
      <WwNumberInput
        :model-value="actions.isMixed('textStyle.fontSize') ? null : node.textStyle.fontSize"
        :placeholder="actions.isMixed('textStyle.fontSize') ? '多种' : undefined"
        :min="8"
        :max="128"
        size="block"
        @update:model-value="
          actions.patchNodeTextStyle({
            fontSize: actions.parseNumber($event, node.textStyle.fontSize, 8, 128)
          })
        "
      />
    </SettingsRow>
    <SettingsRow label="字体" class="dg-settings-row--inline dg-settings-row--control dg-settings-row--font">
      <WwFontSelect
        :model-value="actions.isMixed('textStyle.fontFamily') ? null : node.textStyle.fontFamily"
        :placeholder="actions.isMixed('textStyle.fontFamily') ? '多种' : '默认'"
        size="block"
        @update:model-value="actions.patchNodeTextStyle({ fontFamily: $event })"
      />
    </SettingsRow>
    <SettingsRow label="颜色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="node.textStyle.color"
        :mixed="actions.isMixed('textStyle.color')"
        aria-label="颜色"
        @update:model-value="actions.patchNodeTextStyle({ color: $event })"
      />
    </SettingsRow>
    <SettingsRow label="对齐" class="dg-settings-row--inline dg-settings-row--modifier">
      <div class="dg-prop-row dg-prop-row--toggles" role="group" aria-label="文本对齐">
        <button
          v-for="action in DIAGRAM_TEXT_ALIGN_ACTIONS"
          :key="action.value"
          type="button"
          class="dg-prop-toggle dg-prop-toggle--icon"
          :class="{ 'dg-prop-toggle--active': actions.isTextAlignActive(action.value) }"
          :aria-label="action.label"
          :aria-pressed="actions.isTextAlignActive(action.value)"
          @click="actions.setTextAlign(action.value)"
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
          :class="{ 'dg-prop-toggle--active': actions.isFontWeightActive() }"
          aria-label="粗体"
          :aria-pressed="actions.isFontWeightActive()"
          @click="
            actions.patchNodeTextStyle({
              fontWeight: node.textStyle.fontWeight === 'bold' ? 'normal' : 'bold'
            })
          "
        >
          B
        </button>
        <button
          type="button"
          class="dg-prop-toggle dg-prop-toggle--italic"
          :class="{ 'dg-prop-toggle--active': (node.textStyle.fontStyle ?? 'normal') === 'italic' }"
          aria-label="斜体"
          :aria-pressed="(node.textStyle.fontStyle ?? 'normal') === 'italic'"
          @click="actions.toggleItalic()"
        >
          I
        </button>
        <button
          type="button"
          class="dg-prop-toggle"
          :class="{ 'dg-prop-toggle--active': node.textStyle.underline }"
          aria-label="下划线"
          :aria-pressed="node.textStyle.underline"
          @click="actions.toggleUnderline()"
        >
          U
        </button>
        <button
          type="button"
          class="dg-prop-toggle"
          :class="{ 'dg-prop-toggle--active': node.textStyle.strikethrough }"
          aria-label="删除线"
          :aria-pressed="node.textStyle.strikethrough"
          @click="actions.toggleStrikethrough()"
        >
          S
        </button>
      </div>
    </SettingsRow>
  </section>
</template>
