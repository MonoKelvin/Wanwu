<script setup lang="ts">
import WwSlider from '@shared/components/WwSlider.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import type { PersonalBackgroundConfig } from '@shared/types/profile'
import { usePersonalBackgroundEditor } from './composables/usePersonalBackgroundEditor'

const props = defineProps<{
  imageUrl: string
  autoFit?: boolean
  viewportEl?: HTMLElement | null
}>()

const draft = defineModel<PersonalBackgroundConfig>({ required: true })

const emit = defineEmits<{
  confirm: [config: PersonalBackgroundConfig]
  cancel: []
  replace: []
  reset: []
}>()

const {
  cropMode,
  surfaceRef,
  helpTriggerRef,
  helpOpen,
  helpPos,
  openHelp,
  closeHelp,
  spaceHeld,
  scalePercent,
  scaleSliderValue,
  opacityUi,
  stageHint,
  cropFrameStyle,
  visibleHelpShortcuts,
  cropHandles,
  BACKGROUND_SCALE_MIN,
  BACKGROUND_SCALE_MAX,
  onScaleSliderStart,
  onScaleSlideEnd,
  onSurfacePointerDown,
  onCropPointerDown,
  onSurfaceWheel,
  resetDraft,
  confirm
} = usePersonalBackgroundEditor(props, draft, emit)
</script>

<template>
  <div class="ww-bg-editor" role="dialog" aria-modal="true" aria-label="调整背景图">
    <div
      ref="surfaceRef"
      class="ww-bg-editor__surface"
      :class="{ 'is-cropping': cropMode, 'is-pan-modifier': cropMode && spaceHeld }"
      @pointerdown="onSurfacePointerDown"
      @wheel.prevent="onSurfaceWheel"
      @contextmenu.prevent
    >
      <p class="ww-bg-editor__hint">{{ stageHint }}</p>

      <template v-if="cropMode && draft.crop">
        <div
          class="ww-bg-editor__crop"
          :style="cropFrameStyle"
          @pointerdown="onCropPointerDown($event, 'crop-move')"
          @wheel.prevent="onSurfaceWheel"
        >
          <span
            v-for="h in cropHandles"
            :key="h.corner"
            class="ww-bg-editor__crop-handle"
            :class="h.class"
            @pointerdown.stop="onCropPointerDown($event, 'crop-resize', h.corner)"
          />
        </div>
      </template>
    </div>

    <div class="ww-bg-editor__panel" @pointerdown.stop @wheel.stop>
      <header class="ww-bg-editor__panel-head">
        <div class="ww-bg-editor__panel-head-text">
          <h2 class="ww-bg-editor__panel-title">背景设置</h2>
          <p class="ww-bg-editor__panel-desc">对照页面内容调整位置与可见范围</p>
        </div>
        <div class="ww-bg-editor__help">
          <span
            ref="helpTriggerRef"
            class="ww-bg-editor__help-trigger"
            tabindex="0"
            aria-label="操作说明"
            @mouseenter="openHelp"
            @mouseleave="closeHelp"
            @focus="openHelp"
            @blur="closeHelp"
          >
            <WwIcon name="circle-help" size="sm" />
          </span>
        </div>
      </header>

      <Teleport to="body">
        <Transition name="ww-bg-editor-help">
          <div
            v-if="helpOpen"
            class="ww-bg-editor__help-popover"
            role="tooltip"
            :style="{ top: `${helpPos.top}px`, right: `${helpPos.right}px` }"
            @mouseenter="openHelp"
            @mouseleave="closeHelp"
          >
            <p class="ww-bg-editor__help-title">操作说明</p>
            <ul class="ww-bg-editor__help-list">
              <li
                v-for="(item, i) in visibleHelpShortcuts"
                :key="i"
                class="ww-bg-editor__help-row"
              >
                <span class="ww-bg-editor__help-keys">
                  <kbd
                    v-for="(key, ki) in item.keys"
                    :key="ki"
                    class="ww-bg-editor__help-kbd"
                  >{{ key }}</kbd>
                </span>
                <span class="ww-bg-editor__help-label">{{ item.label }}</span>
              </li>
            </ul>
          </div>
        </Transition>
      </Teleport>

      <div class="ww-bg-editor__panel-body">
        <SettingsRow label="缩放">
          <div class="ww-bg-editor__slider-field">
            <WwSlider
              v-model="scaleSliderValue"
              class="ww-bg-editor__slider"
              :min="BACKGROUND_SCALE_MIN"
              :max="BACKGROUND_SCALE_MAX"
              :step="0.01"
              @pointerdown.passive="onScaleSliderStart"
              @slideend="onScaleSlideEnd"
              @change="onScaleSlideEnd"
            />
            <span class="ww-bg-editor__value">{{ scalePercent }}%</span>
          </div>
        </SettingsRow>

        <SettingsRow label="透明度">
          <div class="ww-bg-editor__slider-field">
            <WwSlider v-model="opacityUi" class="ww-bg-editor__slider" :min="0" :max="100" :step="1" />
            <span class="ww-bg-editor__value">{{ opacityUi }}%</span>
          </div>
        </SettingsRow>

        <SettingsRow
          label="剪裁区域"
          subtitle="框选页面可见范围"
          class="ww-bg-editor__crop-row"
        >
          <WwToggleSwitch v-model="cropMode" class="ww-bg-editor__switch" />
        </SettingsRow>
      </div>

      <footer class="ww-bg-editor__panel-foot">
        <div class="ww-bg-editor__panel-foot-start">
          <button
            type="button"
            class="ww-bg-editor__icon-btn"
            aria-label="更换图片"
            v-tooltip.bottom="'更换图片'"
            :disabled="!imageUrl"
            @click="emit('replace')"
          >
            <WwIcon name="image" size="sm" />
          </button>
          <button
            type="button"
            class="ww-bg-editor__icon-btn"
            aria-label="恢复默认"
            v-tooltip.bottom="'恢复默认'"
            @click="resetDraft"
          >
            <WwIcon name="rotate-ccw" size="sm" />
          </button>
        </div>
        <div class="ww-bg-editor__panel-actions">
          <WwButton label="取消" size="small" severity="secondary" outlined @click="emit('cancel')" />
          <WwButton label="应用" icon="check" icon-size="xs" size="small" @click="confirm" />
        </div>
      </footer>
    </div>
  </div>
</template>

<style>
@import './styles/personal-bg-editor.css';
</style>
