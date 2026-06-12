<script setup lang="ts">
import { computed } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'

const { ctx, actions, imageBusy } = useDiagramPropertySectionView()
const node = computed(() => ctx.value.selectedNode!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">图片</p>
    <div v-if="node.imageAsset?.url" class="dg-prop-image-preview">
      <img :src="node.imageAsset.url" alt="" class="dg-prop-image-preview__img" />
    </div>
    <div class="dg-prop-image-actions">
      <WwButton
        label="选择图片"
        icon="image"
        size="small"
        severity="secondary"
        :loading="imageBusy"
        @click="actions.pickNodeImage()"
      />
      <WwButton
        v-if="node.imageAsset?.url"
        label="移除"
        size="small"
        severity="secondary"
        text
        @click="actions.clearNodeImage()"
      />
    </div>
    <p v-if="!ctx.fileId" class="dg-hint dg-prop-image-hint">保存文档后可插入内嵌图片</p>
  </section>
</template>
