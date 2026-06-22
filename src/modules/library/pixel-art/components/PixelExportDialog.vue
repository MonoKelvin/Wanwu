<script setup lang="ts">
defineOptions({ name: 'PixelExportDialog' })

import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import type { SvgExportMode, SvgVectorStrategy } from '@modules/library/pixel-art/domain/types'

const props = defineProps<{
  open: boolean
  docWidth: number
  docHeight: number
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  export: [options: {
    format: 'png' | 'jpeg' | 'svg'
    jpegQuality: number
    svgMode: SvgExportMode
    svgStrategy: SvgVectorStrategy
  }]
}>()

const format = ref<'png' | 'jpeg' | 'svg'>('png')
const jpegQuality = ref(92)
const svgMode = ref<SvgExportMode>('raster')
const svgStrategy = ref<SvgVectorStrategy>('merged')

const formatOptions = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'SVG', value: 'svg' }
]

const svgModeOptions = [
  { label: '栅格嵌入（推荐）', value: 'raster' },
  { label: '矢量矩形', value: 'vector' }
]

const svgStrategyOptions = [
  { label: '行内合并（推荐）', value: 'merged' },
  { label: '逐像素', value: 'per-pixel' }
]

const vectorWarning = computed(
  () => svgMode.value === 'vector' && Math.max(props.docWidth, props.docHeight) >= 128
)

watch(
  () => props.open,
  (v) => {
    if (v) {
      format.value = 'png'
      svgMode.value = 'raster'
    }
  }
)

function close() {
  emit('update:open', false)
}

function confirm() {
  emit('export', {
    format: format.value,
    jpegQuality: jpegQuality.value / 100,
    svgMode: svgMode.value,
    svgStrategy: svgStrategy.value
  })
  close()
}
</script>

<template>
  <Dialog
    :visible="open"
    header="导出图像"
    modal
    class="w-[min(24rem,90vw)]"
    @update:visible="emit('update:open', $event)"
  >
    <div class="export-form">
      <label class="field">
        <span>格式</span>
        <WwSelect v-model="format" :options="formatOptions" option-label="label" option-value="value" />
      </label>

      <label v-if="format === 'jpeg'" class="field">
        <span>JPEG 质量（{{ jpegQuality }}%）</span>
        <input v-model.number="jpegQuality" type="range" min="50" max="100" />
      </label>

      <template v-if="format === 'svg'">
        <label class="field">
          <span>SVG 模式</span>
          <WwSelect v-model="svgMode" :options="svgModeOptions" option-label="label" option-value="value" />
        </label>
        <label v-if="svgMode === 'vector'" class="field">
          <span>合并策略</span>
          <WwSelect
            v-model="svgStrategy"
            :options="svgStrategyOptions"
            option-label="label"
            option-value="value"
          />
        </label>
        <p v-if="vectorWarning" class="warn">
          画布 ≥128px，矢量 SVG 体积可能很大，建议使用栅格嵌入。
        </p>
      </template>
    </div>

    <template #footer>
      <WwDialogFooterButton label="取消" cancel @click="close" />
      <WwDialogFooterButton label="导出" @click="confirm" />
    </template>
  </Dialog>
</template>

<style scoped>
.export-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.warn {
  margin: 0;
  font-size: 12px;
  color: var(--ww-warning, #b45309);
}
</style>
