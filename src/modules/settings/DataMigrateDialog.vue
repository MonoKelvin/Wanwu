<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'

const props = defineProps<{
  visible: boolean
  currentPath: string
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  done: []
}>()

const step = ref<'intro' | 'confirm' | 'migrating'>('intro')
const parentDir = ref('')
const targetPath = ref('')
const overwrite = ref(false)
const error = ref('')

const canConfirm = computed(() => Boolean(parentDir.value && targetPath.value))

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    step.value = 'intro'
    parentDir.value = ''
    targetPath.value = ''
    overwrite.value = false
    error.value = ''
  }
)

function close() {
  if (step.value === 'migrating') return
  emit('update:visible', false)
}

async function pickDirectory() {
  error.value = ''
  const result = await window.wanwu.app.pickDataDirectoryParent()
  if (!result.ok) {
    if (result.error) error.value = result.error
    return
  }
  parentDir.value = result.parentDir
  targetPath.value = result.targetPath
  step.value = 'confirm'
}

async function startMigrate() {
  if (!parentDir.value) return
  step.value = 'migrating'
  error.value = ''
  try {
    const result = await window.wanwu.app.migrateDataDirectory({
      parentDir: parentDir.value,
      overwriteExisting: overwrite.value
    })
    if (!result.ok) {
      step.value = 'confirm'
      error.value = result.error
    }
  } catch (err) {
    step.value = 'confirm'
    error.value = err instanceof Error ? err.message : '迁移失败'
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    header="迁移数据目录"
    modal
    append-to="body"
    class="ww-settings-migrate-dialog ww-rss-dialog w-[min(26rem,92vw)]"
    :closable="step !== 'migrating'"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="step === 'intro'" class="ww-settings-migrate-dialog__body">
      <p class="ww-settings-migrate-dialog__lead">
        将数据复制到新目录，完成后自动重启。
      </p>
      <p class="ww-settings-migrate-dialog__current">
        <span class="ww-settings-migrate-dialog__current-label">当前目录</span>
        <span class="ww-settings-migrate-dialog__path">{{ currentPath }}</span>
      </p>
      <p v-if="error" class="ww-settings-migrate-dialog__error">{{ error }}</p>
    </div>

    <div v-else-if="step === 'confirm'" class="ww-settings-migrate-dialog__body">
      <p class="ww-settings-migrate-dialog__lead">确认将数据迁移至以下位置：</p>
      <p class="ww-settings-migrate-dialog__path is-highlight">{{ targetPath }}</p>
      <label class="ww-settings-migrate-dialog__check">
        <input v-model="overwrite" type="checkbox" />
        <span>目标数据目录已存在且非空时覆盖合并</span>
      </label>
      <p v-if="error" class="ww-settings-migrate-dialog__error">{{ error }}</p>
    </div>

    <div v-else class="ww-settings-migrate-dialog__body is-center">
      <p class="ww-settings-migrate-dialog__lead">正在复制数据，请稍候…</p>
      <p class="text-xs text-ww-ink-faint">完成后将自动重启应用</p>
    </div>

    <template #footer>
      <template v-if="step === 'intro'">
        <WwDialogFooterButton label="取消" cancel @click="close" />
        <WwDialogFooterButton label="选择新位置" icon="folder" @click="pickDirectory" />
      </template>
      <template v-else-if="step === 'confirm'">
        <WwDialogFooterButton label="返回" cancel @click="step = 'intro'" />
        <WwDialogFooterButton label="取消" cancel @click="close" />
        <WwDialogFooterButton
          label="开始迁移"
          icon="arrow-right"
          :disabled="!canConfirm"
          @click="startMigrate"
        />
      </template>
    </template>
  </Dialog>
</template>
