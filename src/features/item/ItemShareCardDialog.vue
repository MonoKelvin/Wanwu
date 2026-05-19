<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from 'primevue/button'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import type { Item } from '@shared/types/item'
import { renderItemShareCard } from '@features/item/utils/renderItemShareCard'

const props = defineProps<{
  visible: boolean
  item: Item | null
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
}>()

const previewUrl = ref<string | null>(null)
const generating = ref(false)
const saving = ref(false)
const error = ref('')

watch(
  () => [props.visible, props.item?.id] as const,
  async ([open, id]) => {
    if (!open || !props.item || !id) return
    generating.value = true
    error.value = ''
    previewUrl.value = null
    try {
      previewUrl.value = await renderItemShareCard(props.item, props.item.coverPath ?? null)
    } catch {
      error.value = '生成预览失败'
    } finally {
      generating.value = false
    }
  }
)

function close() {
  emit('update:visible', false)
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
    close()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    header="生成分享卡片"
    width-class="w-[min(28rem,94vw)]"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="ww-share-card-dialog__hint">将物品信息渲染为竖版介绍图，可保存到本地分享。</p>

    <div class="ww-share-card-dialog__preview">
      <p v-if="generating" class="ww-share-card-dialog__status">正在渲染…</p>
      <p v-else-if="error" class="ww-share-card-dialog__status ww-share-card-dialog__status--err">
        {{ error }}
      </p>
      <img v-else-if="previewUrl" :src="previewUrl" alt="分享卡片预览" class="ww-share-card-dialog__img" />
    </div>

    <template #footer>
      <Button label="关闭" severity="secondary" text @click="close" />
      <Button label="保存到本地" :loading="saving" :disabled="!previewUrl || generating" @click="save" />
    </template>
  </WwGlassDialog>
</template>
