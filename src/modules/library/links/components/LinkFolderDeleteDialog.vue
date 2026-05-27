<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Checkbox from 'primevue/checkbox'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'

const visible = defineModel<boolean>('visible', { required: true })

const props = defineProps<{
  folderName: string
  linkCount: number
  childFolderCount: number
}>()

const emit = defineEmits<{
  confirm: [moveBookmarksToRoot: boolean]
}>()

const moveToRoot = ref(true)

const hasLinks = computed(() => props.linkCount > 0)

const message = computed(() => {
  const name = props.folderName
  if (!hasLinks.value) {
    if (props.childFolderCount > 0) {
      return `确定删除目录「${name}」？其下 ${props.childFolderCount} 个子目录将一并删除。`
    }
    return `确定删除目录「${name}」？`
  }
  if (props.childFolderCount > 0) {
    return `确定删除目录「${name}」？该目录及其 ${props.childFolderCount} 个子目录、共 ${props.linkCount} 条链接将受到影响。`
  }
  return `确定删除目录「${name}」？该目录下共 ${props.linkCount} 条链接将受到影响。`
})

watch(
  () => visible.value,
  (open) => {
    if (open) moveToRoot.value = true
  }
)

function submit() {
  emit('confirm', hasLinks.value ? moveToRoot.value : true)
  visible.value = false
}
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    header="删除目录"
    width-class="w-[min(22rem,92vw)]"
    dim-mask
    @update:visible="visible = $event"
  >
    <p class="ww-link-folder-delete__message">{{ message }}</p>
    <label v-if="hasLinks" class="ww-link-folder-delete__option">
      <Checkbox v-model="moveToRoot" binary />
      <span>将链接移至收藏夹（根目录）</span>
    </label>
    <template #footer>
      <WwDialogFooterButton label="取消" variant="text" @click="visible = false" />
      <WwDialogFooterButton label="删除" danger @click="submit" />
    </template>
  </WwGlassDialog>
</template>

<style>
.ww-link-folder-delete__message {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--ww-ink);
}

.ww-link-folder-delete__option {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.875rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ww-ink);
  cursor: pointer;
  user-select: none;
}
</style>
