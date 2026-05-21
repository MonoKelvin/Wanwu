<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useFormFieldHighlight } from '@shared/composables/useFormFieldHighlight'

const props = defineProps<{
  visible: boolean
  itemName?: string
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  confirm: [groupId: string]
}>()

const groups = ref<Array<{ id: string; name: string; sortOrder: number }>>([])
const selectedId = ref('')
const creating = ref(false)
const newName = ref('')
const loading = ref(false)
const newInputRef = ref<{ $el?: HTMLElement } | null>(null)
const fields = useFormFieldHighlight()

watch(
  () => props.visible,
  async (open) => {
    if (!open) return
    loading.value = true
    creating.value = false
    newName.value = ''
    fields.clearAll()
    try {
      groups.value = await window.wanwu.user.listFavoriteGroupsForPicker()
      selectedId.value = groups.value[0]?.id ?? ''
    } finally {
      loading.value = false
    }
  }
)

function close() {
  emit('update:visible', false)
}

async function startCreate() {
  creating.value = true
  newName.value = ''
  await nextTick()
  newInputRef.value?.$el?.querySelector('input')?.focus()
}

async function submitCreate() {
  const ok = await fields.validate(
    [{ key: 'newName', valid: () => Boolean(newName.value.trim()) }],
    {
      focusFirst: () => newInputRef.value?.$el?.querySelector('input')?.focus()
    }
  )
  if (!ok) return
  const name = newName.value.trim()
  const created = await window.wanwu.user.createFavoriteGroup(name)
  groups.value = [...groups.value, created].sort((a, b) => a.sortOrder - b.sortOrder)
  selectedId.value = created.id
  creating.value = false
}

function confirm() {
  if (!selectedId.value) return
  emit('confirm', selectedId.value)
  close()
}
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    header="加入收藏"
    width-class="w-[min(24rem,92vw)]"
    @update:visible="emit('update:visible', $event)"
  >
    <p v-if="itemName" class="ww-fav-picker__hint">将「{{ itemName }}」保存到</p>

    <p v-if="loading" class="ww-fav-picker__loading">加载中…</p>

    <ul v-else class="ww-fav-picker__list" role="listbox" aria-label="收藏分组">
      <li v-for="g in groups" :key="g.id">
        <button
          type="button"
          role="option"
          class="ww-fav-picker__option"
          :class="{ 'ww-fav-picker__option--active': selectedId === g.id }"
          :aria-selected="selectedId === g.id"
          @click="selectedId = g.id"
        >
          <span class="ww-fav-picker__option-icon" aria-hidden="true">
            <WwIcon name="folder" size="sm" />
          </span>
          <span class="ww-fav-picker__option-label">{{ g.name }}</span>
          <WwIcon v-if="selectedId === g.id" name="check" size="sm" class="ww-fav-picker__check" />
        </button>
      </li>
    </ul>

    <div
      v-if="creating"
      :key="`newName-${fields.shakeKey('newName')}`"
      :class="fields.fieldWrapClass('newName', 'ww-fav-picker__create')"
    >
      <label class="ww-form-label" for="new-fav-group">
        新分组名称 <span class="text-ww-warn">*</span>
      </label>
      <InputText
        id="new-fav-group"
        ref="newInputRef"
        v-model="newName"
        class="w-full"
        placeholder="例如：想买的、灵感"
        @update:model-value="fields.clearField('newName')"
        @keydown.enter="submitCreate"
      />
      <div class="ww-fav-picker__create-actions">
        <Button label="取消" severity="secondary" text size="small" @click="creating = false" />
        <Button label="创建" size="small" @click="submitCreate" />
      </div>
    </div>

    <button v-else type="button" class="ww-fav-picker__new" @click="startCreate">
      <WwIcon name="folder-plus" size="sm" />
      新建分组
    </button>

    <template #footer>
      <Button label="取消" severity="secondary" text @click="close" />
      <Button label="确定收藏" :disabled="!selectedId || loading" @click="confirm" />
    </template>
  </WwGlassDialog>
</template>
