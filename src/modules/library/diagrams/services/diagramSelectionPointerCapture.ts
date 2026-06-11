import type LogicFlow from '@logicflow/core'
import { collectOrderedSelectionIds } from '@modules/library/diagrams/lib/diagramGroupSelection'
import type { DiagramBoxSelectSnapshot } from '@modules/library/diagrams/lib/diagramSelectionInteraction'

export interface DiagramSelectionPointerCapturePorts {
  getLf(): LogicFlow | null
  isMiddlePanning(): boolean
  onPointerUpRefresh(): void
}

/**
 * pointerdown 时冻结选区快照，供修饰键点选与框选加减选使用。
 * 不在 pointerup 推送选区，避免 click 之前把旧选区推给属性面板。
 */
export class DiagramSelectionPointerCapture {
  private selectionSnapshotByPointer = new Map<number, string[]>()
  private selectionFullSnapshotByPointer = new Map<number, DiagramBoxSelectSnapshot>()
  private lastPointerDownSelection: string[] = []

  constructor(private readonly ports: DiagramSelectionPointerCapturePorts) {}

  bind(el: HTMLElement): () => void {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || this.ports.isMiddlePanning()) return
      const lf = this.ports.getLf()
      if (!lf) return
      const ordered = collectOrderedSelectionIds(lf)
      const ids = ordered.nodeIds
      this.lastPointerDownSelection = ids
      this.selectionSnapshotByPointer.set(e.pointerId, ids)
      this.selectionFullSnapshotByPointer.set(e.pointerId, {
        nodeIds: ids,
        edgeIds: ordered.edgeIds
      })
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) {
        queueMicrotask(() => this.ports.onPointerUpRefresh())
      }
      const pointerId = e.pointerId
      window.setTimeout(() => {
        this.selectionSnapshotByPointer.delete(pointerId)
        this.selectionFullSnapshotByPointer.delete(pointerId)
      }, 400)
    }

    el.addEventListener('pointerdown', onPointerDown, true)
    el.addEventListener('pointerup', onPointerUp, true)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown, true)
      el.removeEventListener('pointerup', onPointerUp, true)
      this.selectionSnapshotByPointer.clear()
      this.selectionFullSnapshotByPointer.clear()
      this.lastPointerDownSelection = []
    }
  }

  getFullSnapshot(pointerId: number): DiagramBoxSelectSnapshot | undefined {
    return this.selectionFullSnapshotByPointer.get(pointerId)
  }

  /** 点击修饰键点选时使用的「点击前」选区快照 */
  getClickSelectionSnapshot(
    e: MouseEvent | PointerEvent | null | undefined,
    lastSelectedNodeIds: string[]
  ): string[] {
    const pointerId = e && 'pointerId' in e ? e.pointerId : undefined
    if (pointerId != null) {
      const snap = this.selectionSnapshotByPointer.get(pointerId)
      if (snap) return [...snap]
    }
    if (this.lastPointerDownSelection.length) return [...this.lastPointerDownSelection]
    return [...lastSelectedNodeIds]
  }
}
