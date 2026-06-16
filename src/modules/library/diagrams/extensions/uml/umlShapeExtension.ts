import type { DiagramShapeExtension } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { umlClassifierCodec } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierCodec'
import { UML_CLASSIFIER_KIND } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'
import { umlClassifierRenderer } from '@modules/library/diagrams/extensions/uml/umlClassifierRenderer'

export const umlShapeExtension: DiagramShapeExtension = {
  id: 'uml',
  label: 'UML',
  kinds: [
    {
      kind: UML_CLASSIFIER_KIND,
      lfTypes: ['dg-uml-class', 'dg-uml-interface'],
      interactionMode: 'node',
      codec: umlClassifierCodec,
      renderer: umlClassifierRenderer,
      propertyPanelPolicy: {
        extensionOrder: 100,
        hideSections: { 'node-text-content': true },
        textSectionTitle: '标题样式'
      }
      // 后续 UML 画布交互（成员双击编辑等）在此注册 canvasInteractionBinders / contextMenuContributor
    }
  ],
  paletteBindings: [
    { paletteId: 'dg-uml-class', kind: UML_CLASSIFIER_KIND },
    {
      paletteId: 'dg-uml-interface',
      kind: UML_CLASSIFIER_KIND,
      defaultOverrides: { classifierKind: 'interface', name: 'IName' }
    },
    {
      paletteId: 'dg-uml-package',
      kind: UML_CLASSIFIER_KIND,
      defaultOverrides: { classifierKind: 'package', name: 'package' }
    },
    {
      paletteId: 'dg-uml-component',
      kind: UML_CLASSIFIER_KIND,
      defaultOverrides: {
        classifierKind: 'component',
        name: 'Component',
        showAttributes: false,
        showOperations: true
      }
    },
    {
      paletteId: 'dg-uml-abstract',
      kind: UML_CLASSIFIER_KIND,
      defaultOverrides: {
        classifierKind: 'abstractClass',
        name: 'AbstractClass',
        showAttributes: true,
        showOperations: true
      }
    },
    {
      paletteId: 'dg-uml-enum',
      kind: UML_CLASSIFIER_KIND,
      defaultOverrides: {
        classifierKind: 'enum',
        name: 'EnumName',
        showAttributes: true,
        showOperations: false
      }
    }
  ]
}
