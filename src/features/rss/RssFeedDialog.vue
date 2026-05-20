<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import WwSelect from '@shared/components/WwSelect'
import Message from 'primevue/message'
import type { RssFeed, RssFeedInput, RssGroup } from '@shared/types/rss'
import { DEFAULT_RSS_DISPLAY, RSS_DEFAULT_GROUP_ID } from '@shared/types/rss'

const props = defineProps<{
  visible: boolean
  groups: RssGroup[]
  feed?: RssFeed | null
  defaultGroupId?: string
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  save: [
    payload: {
      id?: string
      title?: string
      url?: string
      groupId?: string
      display?: RssFeed['display']
    }
  ]
}>()

const title = ref('')
const url = ref('')
const groupId = ref('')
const display = ref({ ...DEFAULT_RSS_DISPLAY })
const formError = ref('')

const isSystemEdit = computed(() => Boolean(props.feed?.isDefault))
const isCreate = computed(() => !props.feed)
const dialogTitle = computed(() => {
  if (isCreate.value) return '添加订阅'
  return isSystemEdit.value ? '编辑系统订阅' : '编辑订阅'
})

const groupOptions = ref<{ label: string; value: string }[]>([])

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    formError.value = ''
    groupOptions.value = props.groups
      .filter((g) => !g.isRecycleBin && g.id !== RSS_DEFAULT_GROUP_ID)
      .map((g) => ({ label: g.name, value: g.id }))
    if (props.feed) {
      title.value = props.feed.title
      url.value = props.feed.url
      groupId.value = props.feed.groupId
      display.value = { ...props.feed.display }
    } else {
      title.value = ''
      url.value = ''
      groupId.value = props.defaultGroupId ?? groupOptions.value[0]?.value ?? ''
      display.value = { ...DEFAULT_RSS_DISPLAY }
    }
  }
)

function close() {
  emit('update:visible', false)
}

function submit() {
  formError.value = ''
  if (isSystemEdit.value && props.feed) {
    if (!groupId.value) {
      formError.value = '请选择分组'
      return
    }
    emit('save', {
      id: props.feed.id,
      groupId: groupId.value,
      display: { ...display.value }
    })
    close()
    return
  }

  if (!title.value.trim()) {
    formError.value = '请填写订阅名称'
    return
  }
  if (!url.value.trim()) {
    formError.value = '请填写 Feed 地址'
    return
  }
  if (!/^https?:\/\/.+/i.test(url.value.trim())) {
    formError.value = '请输入以 http:// 或 https:// 开头的地址'
    return
  }

  emit('save', {
    ...(props.feed ? { id: props.feed.id } : {}),
    title: title.value.trim(),
    url: url.value.trim(),
    groupId: groupId.value,
    display: { ...display.value }
  })
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="dialogTitle"
    modal
    class="ww-rss-dialog w-[min(24rem,92vw)]"
    @update:visible="emit('update:visible', $event)"
  >
    <Message v-if="formError" severity="error" :closable="false" class="mb-3 text-sm">
      {{ formError }}
    </Message>

    <div v-if="isSystemEdit && feed" class="mb-3 rounded-md bg-ww-inset px-3 py-2 text-xs text-ww-ink-muted">
      <p class="m-0 font-medium text-ww-ink">{{ feed.title }}</p>
      <p class="m-0 mt-1 break-all font-mono text-[0.6875rem] opacity-80">{{ feed.url }}</p>
      <p class="m-0 mt-1.5 text-ww-ink-faint">系统预置订阅不可修改名称与链接</p>
    </div>

    <div class="space-y-3">
      <template v-if="!isSystemEdit">
        <div>
          <label class="ww-form-label">标题 <span class="text-ww-warn">*</span></label>
          <InputText v-model="title" class="w-full" placeholder="订阅名称（必填）" />
        </div>
        <div>
          <label class="ww-form-label">Feed 地址 <span class="text-ww-warn">*</span></label>
          <InputText v-model="url" class="w-full font-mono text-xs" placeholder="https://example.com/feed.xml" />
        </div>
      </template>

      <div>
        <label class="ww-form-label">分组</label>
        <WwSelect
          v-model="groupId"
          size="block"
          :options="groupOptions"
          option-label="label"
          option-value="value"
        />
      </div>

      <fieldset class="ww-rss-display-fieldset">
        <legend class="ww-form-label mb-2">条目展示</legend>
        <div class="grid grid-cols-2 gap-2">
          <label class="flex items-center gap-2 text-xs text-ww-ink-muted">
            <Checkbox v-model="display.showTitle" binary /> 标题
          </label>
          <label class="flex items-center gap-2 text-xs text-ww-ink-muted">
            <Checkbox v-model="display.showSummary" binary /> 摘要
          </label>
          <label class="flex items-center gap-2 text-xs text-ww-ink-muted">
            <Checkbox v-model="display.showTime" binary /> 时间
          </label>
          <label class="flex items-center gap-2 text-xs text-ww-ink-muted">
            <Checkbox v-model="display.showHost" binary /> 来源域名
          </label>
          <label class="flex items-center gap-2 text-xs text-ww-ink-muted">
            <Checkbox v-model="display.showOpen" binary /> 打开按钮
          </label>
          <label class="flex items-center gap-2 text-xs text-ww-ink-muted">
            <Checkbox v-model="display.showCopy" binary /> 复制按钮
          </label>
        </div>
      </fieldset>
    </div>

    <template #footer>
      <Button label="取消" severity="secondary" text @click="close" />
      <Button label="保存" @click="submit" />
    </template>
  </Dialog>
</template>
