<script setup lang="ts">
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  save: []
  discard: []
  cancel: []
}>()
</script>

<template>
  <WwGlassDialog
    :visible="open"
    header="未保存的更改"
    width-class="w-[min(26rem,92vw)]"
    dim-mask
    @update:visible="(v) => (open = v)"
  >
    <p class="pa-leave-msg">文档有未保存的更改。离开前可以保存、直接放弃，或留在此页继续编辑。</p>
    <template #footer>
      <div class="pa-leave-footer">
        <WwDialogFooterButton label="留在此页" cancel @click="emit('cancel')" />
        <WwDialogFooterButton label="不保存离开" @click="emit('discard')" />
        <WwDialogFooterButton label="保存并离开" @click="emit('save')" />
      </div>
    </template>
  </WwGlassDialog>
</template>

<style scoped>
.pa-leave-msg {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ww-ink-muted);
}

.pa-leave-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
}
</style>
