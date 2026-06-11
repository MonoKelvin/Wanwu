import type { DiagramShapeExtensionRegistry } from '@modules/library/diagrams/domain/shape-extension/DiagramShapeExtensionRegistry'
import UmlClassifierPropertyEditor from '@modules/library/diagrams/extensions/uml/components/UmlClassifierPropertyEditor.vue'
import { UML_CLASSIFIER_KIND } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

export function registerUmlShapeExtensionUi(registry: DiagramShapeExtensionRegistry): void {
  registry.registerPropertyEditor(UML_CLASSIFIER_KIND, {
    kind: UML_CLASSIFIER_KIND,
    order: 'replace-text',
    textSectionTitle: '标题样式',
    component: UmlClassifierPropertyEditor
  })
}
