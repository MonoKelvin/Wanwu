<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import MusicNeteaseLoginDialog from '@modules/music/components/MusicNeteaseLoginDialog.vue'
import MusicKugouLoginDialog from '@modules/music/components/MusicKugouLoginDialog.vue'

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ success: [] }>()

const props = withDefaults(
  defineProps<{
    platform?: 'netease' | 'kugou'
  }>(),
  {}
)

const { settings } = storeToRefs(useSettingsStore())

const activePlatform = computed<'netease' | 'kugou'>(() => {
  if (props.platform) return props.platform
  return settings.value.musicPrimarySource === 'kugou' ? 'kugou' : 'netease'
})

function onSuccess() {
  emit('success')
}
</script>

<template>
  <MusicKugouLoginDialog
    v-if="activePlatform === 'kugou'"
    v-model:visible="visible"
    @success="onSuccess"
  />
  <MusicNeteaseLoginDialog v-else v-model:visible="visible" @success="onSuccess" />
</template>
