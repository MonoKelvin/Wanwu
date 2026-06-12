import {
  computed,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
  type Ref
} from 'vue'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'
import type { DiagramPropertyContext } from '@modules/library/diagrams/domain/property-panel/types'

export interface DiagramPropertySectionViewApi {
  readonly ctx: ComputedRef<DiagramPropertyContext>
  readonly canvas: ComputedRef<DiagramPropertyContext['selection']['canvas']>
}

const sectionViewKey = Symbol('diagramPropertySectionView') as InjectionKey<
  Ref<DiagramPropertyContext>
>

/** 由 DiagramPropertySectionSlot 注入当前 Section 的只读属性快照 */
export function provideDiagramPropertySectionView(context: Ref<DiagramPropertyContext>): void {
  provide(sectionViewKey, context)
}

/**
 * Section 展示层：读 Host 传入的 propertyContext 快照；actions / imageBusy 仍走组合根 provide。
 */
export function useDiagramPropertySectionView() {
  const viewCtx = inject(sectionViewKey)
  if (!viewCtx) {
    throw new Error('useDiagramPropertySectionView 需在 DiagramPropertySectionSlot 内使用')
  }

  const { actions, imageBusy } = useDiagramPropertyContext()
  const ctx = computed(() => viewCtx.value)
  const canvas = computed(() => viewCtx.value.selection.canvas)

  return { ctx, canvas, actions, imageBusy }
}
