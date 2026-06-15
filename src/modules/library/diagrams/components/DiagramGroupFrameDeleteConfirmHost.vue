<script setup lang="ts">
import Checkbox from 'primevue/checkbox'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import {
  cancelDiagramGroupFrameDeleteConfirm,
  diagramGroupFrameDeleteConfirmState,
  resolveDiagramGroupFrameDeleteConfirm
} from '@modules/library/diagrams/lib/diagramGroupFrameDeleteConfirm'

const state = diagramGroupFrameDeleteConfirmState
</script>

<template>
  <WwGlassDialog
    :visible="state.open"
    :header="state.header"
    width-class="w-[min(28rem,92vw)]"
    dim-mask
    @update:visible="(v) => !v && cancelDiagramGroupFrameDeleteConfirm()"
  >
    <p class="dg-group-delete-confirm__message">{{ state.message }}</p>
    <template #footer>
      <div class="dg-group-delete-confirm__footer">
        <label class="dg-group-delete-confirm__skip">
          <Checkbox v-model="state.skipChecked" binary />
          <span>关闭文档前不再提醒</span>
        </label>
        <div class="dg-group-delete-confirm__actions">
          <WwDialogFooterButton label="取消" cancel @click="cancelDiagramGroupFrameDeleteConfirm()" />
          <WwDialogFooterButton
            label="是"
            danger
            @click="resolveDiagramGroupFrameDeleteConfirm('with-contents')"
          />
          <WwDialogFooterButton
            label="否"
            @click="resolveDiagramGroupFrameDeleteConfirm('frame-only')"
          />
        </div>
      </div>
    </template>
  </WwGlassDialog>
</template>

<style scoped>
.dg-group-delete-confirm__message {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--ww-ink-muted);
}

.dg-group-delete-confirm__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.dg-group-delete-confirm__skip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: var(--ww-ink-muted);
  cursor: pointer;
  user-select: none;
}

.dg-group-delete-confirm__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
}
</style>
