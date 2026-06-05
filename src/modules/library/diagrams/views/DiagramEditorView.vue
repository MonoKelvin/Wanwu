<script setup lang="ts">
defineOptions({ name: 'DiagramEditorView' })

import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import '@logicflow/core/es/index.css'
import '@logicflow/extension/es/index.css'
import DiagramEditorChrome from '@modules/library/diagrams/components/DiagramEditorChrome.vue'
import DiagramEditorActions from '@modules/library/diagrams/components/DiagramEditorActions.vue'
import DiagramShapePalette from '@modules/library/diagrams/components/DiagramShapePalette.vue'
import DiagramPropertyPanel from '@modules/library/diagrams/components/DiagramPropertyPanel.vue'
import DiagramPageTabs from '@modules/library/diagrams/components/DiagramPageTabs.vue'
import { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { DiagramRepositoryIpcAdapter } from '@modules/library/diagrams/infrastructure/DiagramRepositoryIpcAdapter'
import { createDiagramCommandBus } from '@modules/library/diagrams/app/commandBus/createDiagramCommandBus'
import { provideDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramAutosave } from '@modules/library/diagrams/composables/useDiagramAutosave'
import { useDiagramShortcuts } from '@modules/library/diagrams/composables/useDiagramShortcuts'
import { useDiagramIpcBridge } from '@modules/library/diagrams/composables/useDiagramIpcBridge'
import { pushShellRoute } from '@app/composables/shellNavigation'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const canvasRef = ref<HTMLElement | null>(null)
const sessionRef = shallowRef<DiagramEditorSession | null>(null)
const portRef = shallowRef<LogicFlowDiagramAdapter | null>(null)
const selectedNodeId = ref<string | null>(null)
const selectedText = ref('')
const loading = ref(true)

const repo = new DiagramRepositoryIpcAdapter()
const bus = createDiagramCommandBus({
  getSession: () => sessionRef.value,
  repo
})
provideDiagramCommandBus(bus)
useDiagramShortcuts(bus)
useDiagramIpcBridge(bus)
useDiagramAutosave({ bus, session: sessionRef })

bus.onResult((cmd, result) => {
  if (cmd.type !== 'document.save' || !result.ok || !isNewDraft.value) return
  const data = result.data as { meta?: { id: string } } | undefined
  const id = data?.meta?.id ?? (data as { fileId?: string } | undefined)?.fileId
  if (id) {
    void router.replace({ name: 'library-diagrams-editor', params: { fileId: id } })
  }
})

const fileId = computed(() => route.params.fileId as string)
const templateQuery = computed(() => route.query.template as string | undefined)
const isNewDraft = computed(() => fileId.value === 'new' || fileId.value === 'draft')

const pages = computed(() => sessionRef.value?.pages ?? [])
const activePageId = computed(() => sessionRef.value?.activePageId ?? null)
const title = computed(() => sessionRef.value?.content?.meta.title ?? '未命名流程图')
const dirty = computed(() => sessionRef.value?.dirty ?? false)

function resolvedTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

async function openDocument() {
  const payload: Record<string, string> = {}
  if (!isNewDraft.value) {
    payload.fileId = fileId.value
  } else if (templateQuery.value) {
    payload.templateId = templateQuery.value
  }
  const result = await bus.dispatch({ type: 'document.open', payload })
  if (!result.ok) {
    toast.add({ severity: 'error', summary: '打开失败', detail: result.message, life: 4000 })
    await pushShellRoute(router, { name: 'library-diagrams-home' })
  }
}

onMounted(async () => {
  const port = new LogicFlowDiagramAdapter()
  const session = new DiagramEditorSession(port, repo)
  sessionRef.value = session
  portRef.value = port

  if (canvasRef.value) {
    port.mount(canvasRef.value)
    port.setTheme(resolvedTheme())
    port.onSelectionChange((nodeId, text) => {
      selectedNodeId.value = nodeId
      selectedText.value = text
    })
    port.onGraphChange(() => {
      if (sessionRef.value) sessionRef.value.dirty = true
    })
  }

  await openDocument()
  loading.value = false
})

watch(
  () => document.documentElement.dataset.theme,
  () => portRef.value?.setTheme(resolvedTheme())
)

onBeforeRouteLeave(async () => {
  if (sessionRef.value?.dirty) {
    const result = await bus.dispatch({ type: 'document.save' })
    if (!result.ok && result.code === 'CONFLICT') {
      toast.add({ severity: 'warn', summary: '保存冲突', detail: result.message, life: 5000 })
    }
  }
})

onBeforeUnmount(() => {
  sessionRef.value?.flushActivePage()
  portRef.value?.destroy()
  sessionRef.value = null
  portRef.value = null
})

async function goBack() {
  if (sessionRef.value?.dirty) {
    const result = await bus.dispatch({ type: 'document.save' })
    if (!result.ok && result.code !== 'CONFLICT') return
  }
  await pushShellRoute(router, { name: 'library-diagrams-home' })
}
</script>

<template>
  <div class="dg-editor-root dg-fade-in flex min-h-0 flex-1 flex-col">
    <div class="dg-editor-stage">
      <div class="dg-canvas-wrap">
        <div
          ref="canvasRef"
          class="dg-canvas-frame"
          :class="{ 'dg-canvas-frame--loading': loading }"
        />
        <div v-if="loading" class="dg-canvas-wrap__overlay">加载画布…</div>
      </div>
      <DiagramEditorChrome :title="title" :dirty="dirty" @back="goBack" />
      <div v-show="!loading" class="dg-float-stack dg-float-stack--right">
        <DiagramEditorActions />
        <DiagramPropertyPanel
          :selected-node-id="selectedNodeId"
          :selected-text="selectedText"
        />
      </div>
      <DiagramShapePalette v-show="!loading" />
      <DiagramPageTabs v-show="!loading" :pages="pages" :active-page-id="activePageId" />
    </div>
  </div>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
