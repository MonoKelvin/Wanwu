<script setup lang="ts">
import Checkbox from 'primevue/checkbox'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import { useDismissibleConfirm } from '@shared/composables/useDismissibleConfirm'

const { state, accept, reject } = useDismissibleConfirm()
</script>

<template>
  <WwGlassDialog
    :visible="state.open"
    :header="state.header"
    width-class="w-[min(24rem,92vw)]"
    dim-mask
    @update:visible="(v) => !v && reject()"
  >
    <p class="ww-dismiss-confirm__message">{{ state.message }}</p>
    <label class="ww-dismiss-confirm__skip">
      <Checkbox v-model="state.skipChecked" binary />
      <span>下次不再提醒</span>
    </label>
    <template #footer>
      <WwDialogFooterButton :label="state.rejectLabel" cancel @click="reject" />
      <WwDialogFooterButton
        :label="state.acceptLabel"
        :danger="state.danger"
        @click="accept"
      />
    </template>
  </WwGlassDialog>
</template>
