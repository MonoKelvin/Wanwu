<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import type { RssGroup } from '@shared/types/rss'

const props = defineProps<{
  visible: boolean
  groups: RssGroup[]
  feedTitle?: string
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  move: [groupId: string]
}>()

const selectedId = ref('')

const options = computed(() =>
  props.groups.filter((g) => !g.isRecycleBin).map((g) => ({ label: g.name, value: g.id }))
)

watch(
  () => props.visible,
  (open) => {
    if (open) selectedId.value = options.value[0]?.value ?? ''
  }
)

function close() {
  emit('update:visible', false)
}

function confirm() {
  if (!selectedId.value) return
  emit('move', selectedId.value)
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    header="移至分组"
    modal
    class="ww-rss-dialog w-[min(20rem,90vw)]"
    @update:visible="emit('update:visible', $event)"
  >
    <p v-if="feedTitle" class="mb-3 text-xs text-ww-ink-muted">「{{ feedTitle }}」</p>
    <ul class="m-0 max-h-48 list-none overflow-y-auto p-0">
      <li v-for="opt in options" :key="opt.value">
        <button
          type="button"
          class="ww-rss-move-option"
          :class="{ 'is-selected': selectedId === opt.value }"
          @click="selectedId = opt.value"
        >
          {{ opt.label }}
        </button>
      </li>
    </ul>
    <template #footer>
      <WwDialogFooterButton label="取消" cancel @click="close" />
      <WwDialogFooterButton label="确定" :disabled="!selectedId" @click="confirm" />
    </template>
  </Dialog>
</template>
