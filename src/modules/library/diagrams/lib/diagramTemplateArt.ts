import archArt from '../assets/templates/arch.svg?raw'
import blankArt from '../assets/templates/blank.svg?raw'
import bpmnArt from '../assets/templates/bpmn.svg?raw'
import decisionArt from '../assets/templates/decision.svg?raw'
import flowArt from '../assets/templates/flow.svg?raw'
import orgArt from '../assets/templates/org.svg?raw'
import stepsArt from '../assets/templates/steps.svg?raw'
import umlArt from '../assets/templates/uml.svg?raw'
import useCaseArt from '../assets/templates/use-case.svg?raw'

export type DiagramTemplateArtVariant =
  | 'blank'
  | 'flow'
  | 'decision'
  | 'steps'
  | 'org'
  | 'uml'
  | 'use-case'
  | 'arch'
  | 'bpmn'

export const DIAGRAM_TEMPLATE_ART: Record<DiagramTemplateArtVariant, string> = {
  blank: blankArt,
  flow: flowArt,
  decision: decisionArt,
  steps: stepsArt,
  org: orgArt,
  uml: umlArt,
  'use-case': useCaseArt,
  arch: archArt,
  bpmn: bpmnArt
}

export function diagramTemplateArtMarkup(variant: DiagramTemplateArtVariant): string {
  return DIAGRAM_TEMPLATE_ART[variant]
}
