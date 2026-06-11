import type { DiagramShapeKindRegistration } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramPropertySectionPolicy } from '@modules/library/diagrams/domain/shape-extension/interfaces'

/** 由图形 kind 注册项推导属性面板区块策略 */
export function resolveSectionPolicy(
  shapeKindReg: DiagramShapeKindRegistration | null | undefined
): DiagramPropertySectionPolicy | null {
  if (!shapeKindReg) return null
  const explicit = shapeKindReg.propertyPanelPolicy
  const editor = shapeKindReg.propertyEditor
  if (explicit) {
    return {
      extensionOrder: explicit.extensionOrder,
      hideSections: explicit.hideSections,
      textSectionTitle: explicit.textSectionTitle ?? editor?.textSectionTitle
    }
  }
  if (!editor) return null
  const hideContent = editor.order === 'replace-text'
  return {
    extensionOrder:
      editor.order === 'before-common' ? 100 : editor.order === 'after-common' ? 500 : 100,
    hideSections: hideContent ? { 'node-text-content': true } : undefined,
    textSectionTitle: editor.textSectionTitle
  }
}
