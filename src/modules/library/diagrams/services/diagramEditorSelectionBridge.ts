import type LogicFlow from '@logicflow/core'
import { collectOrderedSelectionIds } from '@modules/library/diagrams/lib/diagramGroupSelection'
import {
  clearElementGroupId,
  isGroupFrameType
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  composeDiagramEditorSelection,
  emptyDiagramEditorSelection,
  resolveSelectionCapabilities
} from '@modules/library/diagrams/domain/selection'
import type {
  DiagramCanvasSettings,
  DiagramEditorSelection
} from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  pruneStaleSelectionInGraph,
  reconcileCollapsedBoxSelection,
  resolvePrimaryNodeId,
  sanitizeSelectionIds,
  type DiagramBoxSelectRestoreContext
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import { DiagramSelectionPublishScheduler } from '@modules/library/diagrams/services/diagramSelectionPublishScheduler'

export interface DiagramEditorSelectionBridgePorts {
  getLf(): LogicFlow | null
  getCanvasSettings(): DiagramCanvasSettings
  isFormatPainterActive(): boolean
  resolveClipboardTargets(
    nodeIds: string[],
    edgeIds: string[]
  ): { nodeIds: string[]; edgeIds: string[] }
  onSelectionPublished(selection: DiagramEditorSelection): void
  onRefreshGroupFrames(): void
  onAfterUserSelectionPublished(): void
  onAfterSyncFromGraph(): void
  onMaybeInvalidateFormatPainter(): void
  shouldReconcileBoxCollapse(): boolean
  getBoxSelectReconcileContext(): Omit<
    DiagramBoxSelectRestoreContext,
    'liveNodeIds' | 'liveEdgeIds'
  >
  onFlushMultiSelectOverlay(): void
  onClearBoxSelectSnapshotsIfAllowed(): void
}

/**
 * 编辑器选区桥接：LF 选区读写、快照推送、组合/拆组后提交与 deferred 同步。
 * 适配层仅保留画布命令与 LF 事件绑定，选区时序集中于此。
 */
export class DiagramEditorSelectionBridge {
  private selectedNodeId: string | null = null
  private selectedEdgeId: string | null = null
  private lastSelectedNodeIds: string[] = []
  private lastSelectedEdgeIds: string[] = []
  private suppressSelectionSyncDuringMutation = false
  private pendingDeferredSelectionSync = false
  private ignoreIncidentalSelectionSyncUntil = 0
  private skipSelectionReconcileOnce = false
  private postMutationCommitRaf: number | null = null
  private selectionSyncRetryRaf: number | null = null
  private selectionSyncMicrotaskQueued = false
  private publishSelectionRaf: number | null = null
  private readonly selectionPublishScheduler = new DiagramSelectionPublishScheduler()

  constructor(private readonly ports: DiagramEditorSelectionBridgePorts) {}

  getLastSelectedNodeIds(): string[] {
    return this.lastSelectedNodeIds
  }

  getLastSelectedEdgeIds(): string[] {
    return this.lastSelectedEdgeIds
  }

  getPrimaryNodeId(): string | null {
    return this.selectedNodeId
  }

  getPrimaryEdgeId(): string | null {
    return this.selectedEdgeId
  }

  setPrimarySelection(nodeId: string | null, edgeId: string | null): void {
    this.selectedNodeId = nodeId
    this.selectedEdgeId = edgeId
  }

  beginMutationSuppress(): void {
    this.suppressSelectionSyncDuringMutation = true
  }

  endMutationSuppress(): void {
    this.suppressSelectionSyncDuringMutation = false
  }

  isMutationSuppressActive(): boolean {
    return this.suppressSelectionSyncDuringMutation
  }

  cancelPendingSync(): void {
    this.pendingDeferredSelectionSync = false
    this.selectionSyncMicrotaskQueued = false
    if (this.selectionSyncRetryRaf != null) {
      cancelAnimationFrame(this.selectionSyncRetryRaf)
      this.selectionSyncRetryRaf = null
    }
    if (this.publishSelectionRaf != null) {
      cancelAnimationFrame(this.publishSelectionRaf)
      this.publishSelectionRaf = null
    }
    this.selectionPublishScheduler.cancelScheduled()
  }

  cancelPostMutationCommits(): void {
    if (this.postMutationCommitRaf != null) {
      cancelAnimationFrame(this.postMutationCommitRaf)
      this.postMutationCommitRaf = null
    }
    this.selectionPublishScheduler.cancelScheduled()
  }

  collectLiveSelectedIds(): { nodeIds: string[]; edgeIds: string[] } {
    const lf = this.ports.getLf()
    if (!lf) return { nodeIds: [], edgeIds: [] }
    const raw = collectOrderedSelectionIds(lf)
    return sanitizeSelectionIds(lf, raw.nodeIds, raw.edgeIds)
  }

  readLiveSelection(): {
    selectedNodeIds: string[]
    selectedEdgeIds: string[]
    primaryNodeId: string | null
    primaryEdgeId: string | null
  } {
    const lf = this.ports.getLf()
    if (!lf) {
      return {
        selectedNodeIds: [],
        selectedEdgeIds: [],
        primaryNodeId: null,
        primaryEdgeId: null
      }
    }
    const raw = this.collectLiveSelectedIds()
    const { nodeIds: selectedNodeIds, edgeIds: selectedEdgeIds } = sanitizeSelectionIds(
      lf,
      raw.nodeIds,
      raw.edgeIds
    )
    return {
      selectedNodeIds,
      selectedEdgeIds,
      primaryNodeId: resolvePrimaryNodeId(lf, selectedNodeIds),
      primaryEdgeId: selectedEdgeIds[0] ?? null
    }
  }

  getSelection(): DiagramEditorSelection {
    const lf = this.ports.getLf()
    if (!lf) {
      return emptyDiagramEditorSelection(
        { ...this.ports.getCanvasSettings() },
        this.ports.isFormatPainterActive()
      )
    }
    const live = this.readLiveSelection()
    return this.composeSelectionFromIds(live.selectedNodeIds, live.selectedEdgeIds)
  }

  composeSelectionFromIds(nodeIds: string[], edgeIds: string[]): DiagramEditorSelection {
    const lf = this.ports.getLf()
    if (!lf) {
      return emptyDiagramEditorSelection(
        { ...this.ports.getCanvasSettings() },
        this.ports.isFormatPainterActive()
      )
    }
    return composeDiagramEditorSelection({
      lf,
      nodeIds,
      edgeIds,
      canvas: { ...this.ports.getCanvasSettings() },
      formatPainterActive: this.ports.isFormatPainterActive(),
      capabilities: resolveSelectionCapabilities(lf, nodeIds, edgeIds, {
        resolveClipboardTargets: (ids, eids) =>
          this.ports.resolveClipboardTargets([...ids], [...eids])
      })
    })
  }

  /** 从 LF 当前选区推送快照到属性面板（组合变更抑制期间默认跳过，force 可强制） */
  publishSelection(options: { force?: boolean } = {}): void {
    if (!options.force && this.suppressSelectionSyncDuringMutation) return
    this.pushSelectionSnapshot()
  }

  /** 拖拽单选图元时 rAF 合并推送，避免每帧刷新属性面板 */
  schedulePublishSelection(): void {
    if (this.publishSelectionRaf != null) {
      cancelAnimationFrame(this.publishSelectionRaf)
    }
    this.publishSelectionRaf = requestAnimationFrame(() => {
      this.publishSelectionRaf = null
      this.publishSelection()
    })
  }

  /** 属性变更后刷新选区快照（仅当选中集包含目标时推送，避免覆盖用户已切换的选区） */
  publishSelectionIfSelected(options: { nodeId?: string; edgeId?: string }): void {
    const live = this.readLiveSelection()
    if (options.nodeId && live.selectedNodeIds.includes(options.nodeId)) {
      this.publishSelection()
      return
    }
    if (options.edgeId && live.selectedEdgeIds.includes(options.edgeId)) {
      this.publishSelection()
    }
  }

  syncFromGraph(forceEmit = false): void {
    const lf = this.ports.getLf()
    if (!lf || (this.suppressSelectionSyncDuringMutation && !forceEmit)) return
    if (!forceEmit && performance.now() < this.ignoreIncidentalSelectionSyncUntil) return

    this.scrubOrphanGroupIds()
    if (this.skipSelectionReconcileOnce) {
      this.skipSelectionReconcileOnce = false
    } else if (this.ports.shouldReconcileBoxCollapse()) {
      this.reconcileBoxSelectCollapse()
    }

    const raw = this.collectLiveSelectedIds()
    if (
      raw.nodeIds.some((id) => !lf.getNodeModelById(id)) ||
      raw.edgeIds.some((id) => !lf.getEdgeModelById(id))
    ) {
      pruneStaleSelectionInGraph(lf, raw.nodeIds, raw.edgeIds)
    }

    const live = this.readLiveSelection()
    this.lastSelectedNodeIds = live.selectedNodeIds
    this.lastSelectedEdgeIds = live.selectedEdgeIds
    this.selectedNodeId = live.primaryNodeId
    this.selectedEdgeId = live.primaryEdgeId
    this.ports.onRefreshGroupFrames()
    this.ports.onMaybeInvalidateFormatPainter()
    this.publishSelection({ force: forceEmit })
    this.ports.onAfterSyncFromGraph()
  }

  afterUserSelectionChange(): void {
    this.ignoreIncidentalSelectionSyncUntil = 0
    this.cancelPostMutationCommits()
    this.cancelPendingSync()
    this.ports.onClearBoxSelectSnapshotsIfAllowed()
    this.selectionPublishScheduler.bumpEpoch()

    const publish = () => {
      if (!this.ports.getLf()) return
      this.publishSelection()
    }

    this.selectionPublishScheduler.scheduleUserSelectionPublish(publish, () => {
      this.ports.onAfterUserSelectionPublished()
    })
  }

  afterSelectionMutation(): void {
    this.afterUserSelectionChange()
  }

  scheduleDeferredSync(forceEmit = false): void {
    if (this.suppressSelectionSyncDuringMutation && !forceEmit) {
      this.pendingDeferredSelectionSync = true
      return
    }

    const run = () => {
      if (this.suppressSelectionSyncDuringMutation && !forceEmit) return
      this.syncFromGraph(forceEmit)
    }

    if (!this.selectionSyncMicrotaskQueued) {
      this.selectionSyncMicrotaskQueued = true
      queueMicrotask(() => {
        this.selectionSyncMicrotaskQueued = false
        run()
      })
    }

    if (this.selectionSyncRetryRaf != null) {
      cancelAnimationFrame(this.selectionSyncRetryRaf)
    }
    this.selectionSyncRetryRaf = requestAnimationFrame(() => {
      this.selectionSyncRetryRaf = null
      run()
      requestAnimationFrame(() => run())
    })
  }

  flushPendingDeferredSync(): void {
    if (!this.pendingDeferredSelectionSync) return
    this.pendingDeferredSelectionSync = false
    this.scheduleDeferredSync(true)
  }

  notifyEditorSelection(): void {
    this.cancelPendingSync()
    const live = this.readLiveSelection()
    this.schedulePostMutationCommit(live.selectedNodeIds, live.selectedEdgeIds)
    this.flushPendingDeferredSync()
  }

  commitForIds(
    nodeIds: string[],
    edgeIds: string[],
    options: { applyToGraph?: boolean } = {}
  ): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const applyToGraph = options.applyToGraph !== false
    const { nodeIds: nodes, edgeIds: edges } = sanitizeSelectionIds(lf, nodeIds, edgeIds)

    if (applyToGraph) {
      this.skipSelectionReconcileOnce = true
      lf.clearSelectElements()
      let append = false
      for (const id of nodes) {
        lf.selectElementById(id, append)
        append = true
      }
      for (const id of edges) {
        lf.selectElementById(id, true)
      }
    }

    this.scrubOrphanGroupIds()
    this.lastSelectedNodeIds = nodes
    this.lastSelectedEdgeIds = edges
    this.selectedNodeId = resolvePrimaryNodeId(lf, nodes)
    this.selectedEdgeId = edges[0] ?? null
    this.ports.onRefreshGroupFrames()
    this.ports.onFlushMultiSelectOverlay()

    if (!applyToGraph) {
      const live = this.readLiveSelection()
      if (
        live.selectedNodeIds.join(',') !== nodes.join(',') ||
        live.selectedEdgeIds.join(',') !== edges.join(',')
      ) {
        return
      }
    }

    this.pushSelectionSnapshot()
    if (applyToGraph) {
      this.ignoreIncidentalSelectionSyncUntil = performance.now() + 80
    }
  }

  schedulePostMutationCommit(nodeIds: string[], edgeIds: string[]): void {
    this.cancelPostMutationCommits()
    this.commitForIds(nodeIds, edgeIds)
    this.postMutationCommitRaf = requestAnimationFrame(() => {
      this.postMutationCommitRaf = null
      if (!this.ports.getLf()) return
      const live = this.readLiveSelection()
      if (
        live.selectedNodeIds.join(',') !== nodeIds.join(',') ||
        live.selectedEdgeIds.join(',') !== edgeIds.join(',')
      ) {
        return
      }
      this.commitForIds(live.selectedNodeIds, live.selectedEdgeIds, { applyToGraph: false })
    })
  }

  scrubOrphanGroupLinks(): void {
    this.scrubOrphanGroupIds()
  }

  bindPointerUpSync(
    el: HTMLElement,
    options: {
      shouldSkip: () => boolean
      isMiddlePanning: () => boolean
    }
  ): () => void {
    return this.selectionPublishScheduler.bindPointerUpSync(el, {
      shouldSkip: () => options.shouldSkip() || options.isMiddlePanning(),
      getLiveSelectionKey: () => {
        const live = this.readLiveSelection()
        return `${live.selectedNodeIds.join(',')}|${live.selectedEdgeIds.join(',')}`
      },
      getLastSelectionKey: () =>
        `${this.lastSelectedNodeIds.join(',')}|${this.lastSelectedEdgeIds.join(',')}`,
      publishIfChanged: () => this.publishSelection()
    })
  }

  private pushSelectionSnapshot(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    this.scrubOrphanGroupIds()
    const live = this.readLiveSelection()
    this.lastSelectedNodeIds = live.selectedNodeIds
    this.lastSelectedEdgeIds = live.selectedEdgeIds
    this.selectedNodeId = live.primaryNodeId
    this.selectedEdgeId = live.primaryEdgeId
    this.ports.onRefreshGroupFrames()
    this.ports.onMaybeInvalidateFormatPainter()
    this.ports.onSelectionPublished(
      this.composeSelectionFromIds(live.selectedNodeIds, live.selectedEdgeIds)
    )
  }

  private scrubOrphanGroupIds(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    for (const node of lf.graphModel.nodes) {
      const gid = node.properties?.dgGroupId
      if (typeof gid !== 'string' || !gid) continue
      const group = lf.getNodeModelById(gid)
      if (!group || !isGroupFrameType(group.type)) {
        clearElementGroupId(lf, node.id)
      }
    }
    for (const edge of lf.graphModel.edges) {
      const gid = edge.properties?.dgGroupId
      if (typeof gid !== 'string' || !gid) continue
      const group = lf.getNodeModelById(gid)
      if (!group || !isGroupFrameType(group.type)) {
        clearElementGroupId(lf, edge.id)
      }
    }
  }

  private reconcileBoxSelectCollapse(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const raw = collectOrderedSelectionIds(lf)
    const live = sanitizeSelectionIds(lf, raw.nodeIds, raw.edgeIds)
    reconcileCollapsedBoxSelection(lf, {
      liveNodeIds: live.nodeIds,
      liveEdgeIds: live.edgeIds,
      ...this.ports.getBoxSelectReconcileContext()
    })
  }
}
