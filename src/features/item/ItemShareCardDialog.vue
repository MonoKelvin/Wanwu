<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import SelectButton from 'primevue/selectbutton'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { Item } from '@shared/types/item'
import type { ShareCardTemplateId } from '@features/item/shareCard/types'
import type {
  ShareCardColorId,
  ShareCardFilterId,
  ShareCardFontId,
  ShareCardSizeId,
  ShareCardStyle
} from '@features/item/shareCard/styleCatalog'
import {
  DEFAULT_SHARE_CARD_STYLE,
  DEFAULT_SHARE_CARD_TEMPLATE,
  renderItemShareCard,
  SHARE_CARD_COLOR_OPTIONS,
  SHARE_CARD_FILTER_OPTIONS,
  SHARE_CARD_FONT_OPTIONS,
  SHARE_CARD_SIZE_OPTIONS,
  SHARE_CARD_TEMPLATES
} from '@features/item/utils/renderItemShareCard'

const props = defineProps<{
  visible: boolean
  item: Item | null
  coverUrl?: string | null
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
}>()

const previewUrl = ref<string | null>(null)
const previewGenerating = ref(false)
const saving = ref(false)
const error = ref('')
const template = ref<ShareCardTemplateId>(DEFAULT_SHARE_CARD_TEMPLATE)
const customOpen = ref(false)
const customStyle = reactive({ ...DEFAULT_SHARE_CARD_STYLE })

let renderSeq = 0
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const templateOptions = SHARE_CARD_TEMPLATES.map((t) => ({
  label: t.label,
  value: t.id
}))

const dialogWidthClass = computed(() =>
  customOpen.value ? 'ww-share-card-dialog--wide' : 'w-[min(34rem,96vw)]'
)

const activeTemplateMeta = computed(() =>
  SHARE_CARD_TEMPLATES.find((t) => t.id === template.value)
)

const currentStyle = customStyle

function clearScheduledPreview() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function invalidatePreviewRender() {
  renderSeq += 1
  clearScheduledPreview()
}

function schedulePreviewRender(immediate = false) {
  if (!props.visible || !props.item) return

  clearScheduledPreview()

  const run = () => {
    debounceTimer = null
    void renderPreview()
  }

  if (immediate) {
    run()
  } else {
    debounceTimer = setTimeout(run, 120)
  }
}

async function renderPreview() {
  if (!props.item) return

  const seq = ++renderSeq
  previewGenerating.value = true
  if (!previewUrl.value) error.value = ''

  try {
    const url = await renderItemShareCard(
      props.item,
      props.coverUrl ?? props.item.coverPath ?? null,
      template.value,
      {
        style: { ...customStyle },
        useCustomStyle: customOpen.value
      }
    )
    if (seq !== renderSeq) return
    previewUrl.value = url
    error.value = ''
  } catch {
    if (seq !== renderSeq) return
    if (!previewUrl.value) error.value = '生成预览失败'
  } finally {
    if (seq === renderSeq) previewGenerating.value = false
  }
}

watch(
  () => [props.visible, props.item?.id] as const,
  ([open]) => {
    invalidatePreviewRender()
    previewGenerating.value = false

    if (!open || !props.item) return

    template.value = DEFAULT_SHARE_CARD_TEMPLATE
    customOpen.value = false
    Object.assign(customStyle, DEFAULT_SHARE_CARD_STYLE)
    previewUrl.value = null
    error.value = ''
    schedulePreviewRender(true)
  }
)

watch(template, () => {
  if (props.visible && props.item) schedulePreviewRender(true)
})

watch(
  () => props.coverUrl,
  () => {
    if (props.visible && props.item) schedulePreviewRender(true)
  }
)

watch(customOpen, () => {
  if (props.visible && props.item) schedulePreviewRender(true)
})

watch(
  customStyle,
  () => {
    if (props.visible && props.item && customOpen.value) schedulePreviewRender()
  },
  { deep: true }
)

onUnmounted(() => {
  invalidatePreviewRender()
})

function onTemplateChange(value: ShareCardTemplateId | null | undefined) {
  if (!value) return
  template.value = value
}

function toggleCustom() {
  customOpen.value = !customOpen.value
}

function patchStyle(patch: Partial<ShareCardStyle>) {
  Object.assign(customStyle, patch)
}

function setFont(id: ShareCardFontId) {
  patchStyle({ fontId: id })
}

function setSize(id: ShareCardSizeId) {
  patchStyle({ sizeId: id })
}

function setColor(id: ShareCardColorId) {
  patchStyle({ colorId: id })
}

function setFilter(id: ShareCardFilterId) {
  patchStyle({ filterId: id })
}

async function save() {
  if (!previewUrl.value || !props.item) return
  saving.value = true
  try {
    const safeName = props.item.name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 48)
    await window.wanwu.shell.savePngDataUrl({
      dataUrl: previewUrl.value,
      defaultName: `${safeName}-card.png`
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    header="定制卡片"
    strong-blur
    :width-class="dialogWidthClass"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="ww-share-card-dialog__hint">
      把这件物品的封面和简介做成一张精美图片，方便分享到朋友圈、微博或保存收藏。挑选样式即可预览效果。
    </p>

    <div
      class="ww-share-card-dialog__body"
      :class="{ 'ww-share-card-dialog__body--custom': customOpen }"
    >
      <div class="ww-share-card-dialog__preview-col">
        <div class="ww-share-card-dialog__preview">
          <div class="ww-share-card-dialog__preview-body">
            <p
              v-if="error && !previewUrl"
              class="ww-share-card-dialog__status ww-share-card-dialog__status--err"
            >
              {{ error }}
            </p>
            <img
              v-else-if="previewUrl"
              :src="previewUrl"
              alt="定制卡片预览"
              class="ww-share-card-dialog__img"
            />
            <p v-else-if="!previewGenerating" class="ww-share-card-dialog__status">暂无预览</p>
          </div>
          <div
            v-if="previewGenerating && !previewUrl"
            class="ww-share-card-dialog__preview-overlay"
            aria-live="polite"
          >
            正在渲染…
          </div>
          <div
            v-else-if="previewGenerating"
            class="ww-share-card-dialog__preview-badge"
            aria-live="polite"
            aria-label="正在更新预览"
          >
            <WwIcon name="loader" size="sm" spin />
          </div>
        </div>
      </div>

      <aside
        class="ww-share-card-dialog__settings"
        :class="{ 'ww-share-card-dialog__settings--open': customOpen }"
        aria-label="样式设置"
        :aria-hidden="!customOpen"
      >
        <div class="ww-share-card-dialog__settings-section">
          <span class="ww-share-card-dialog__settings-label">滤镜</span>
          <div class="ww-share-card-dialog__chip-grid">
            <button
              v-for="f in SHARE_CARD_FILTER_OPTIONS"
              :key="f.id"
              type="button"
              class="ww-share-card-dialog__chip"
              :class="{ 'ww-share-card-dialog__chip--active': currentStyle.filterId === f.id }"
              @click="setFilter(f.id)"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="ww-share-card-dialog__settings-section">
          <span class="ww-share-card-dialog__settings-label">字体</span>
          <div class="ww-share-card-dialog__chip-grid">
            <button
              v-for="f in SHARE_CARD_FONT_OPTIONS"
              :key="f.id"
              type="button"
              class="ww-share-card-dialog__chip"
              :class="{ 'ww-share-card-dialog__chip--active': currentStyle.fontId === f.id }"
              @click="setFont(f.id)"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="ww-share-card-dialog__settings-section">
          <span class="ww-share-card-dialog__settings-label">字号</span>
          <div class="ww-share-card-dialog__chip-grid">
            <button
              v-for="s in SHARE_CARD_SIZE_OPTIONS"
              :key="s.id"
              type="button"
              class="ww-share-card-dialog__chip"
              :class="{ 'ww-share-card-dialog__chip--active': currentStyle.sizeId === s.id }"
              @click="setSize(s.id)"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <div class="ww-share-card-dialog__settings-section">
          <span class="ww-share-card-dialog__settings-label">颜色</span>
          <div class="ww-share-card-dialog__color-grid">
            <button
              v-for="c in SHARE_CARD_COLOR_OPTIONS"
              :key="c.id"
              type="button"
              class="ww-share-card-dialog__color-swatch"
              :class="{ 'ww-share-card-dialog__color-swatch--active': currentStyle.colorId === c.id }"
              :style="{ background: c.swatch }"
              :title="c.label"
              :aria-label="c.label"
              @click="setColor(c.id)"
            />
          </div>
        </div>
      </aside>
    </div>

    <div class="ww-share-card-dialog__toolbar">
      <div class="ww-share-card-dialog__toolbar-row">
        <SelectButton
          :model-value="template"
          class="ww-share-card-dialog__modes"
          :options="templateOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          :disabled="saving"
          @update:model-value="onTemplateChange"
        />
        <div class="ww-share-card-dialog__toolbar-actions">
          <button
            type="button"
            class="ww-share-card-dialog__icon-btn"
            title="保存到本地"
            :disabled="!previewUrl || saving"
            @click="save"
          >
            <WwIcon :name="saving ? 'loader' : 'download'" size="sm" :spin="saving" />
          </button>
          <button
            type="button"
            class="ww-share-card-dialog__icon-btn"
            :class="{ 'ww-share-card-dialog__icon-btn--active': customOpen }"
            title="自定义样式"
            :disabled="saving"
            @click="toggleCustom"
          >
            <WwIcon name="palette" size="sm" />
          </button>
        </div>
      </div>
      <p v-if="activeTemplateMeta" class="ww-share-card-dialog__template-desc">
        {{ activeTemplateMeta.description }}
      </p>
    </div>
  </WwGlassDialog>
</template>
