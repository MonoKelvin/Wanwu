export type {
  NotePlaceholderHint,
  NotePlaceholderTimeSlot,
  NotePlaceholderWeatherTag,
  PickNotePlaceholderContext
} from '@modules/library/notes/lib/notePlaceholderTypes'

export { NOTE_PLACEHOLDER_HINTS } from '@modules/library/notes/lib/notePlaceholderHints'

export {
  pickNotePlaceholder,
  registerNotePlaceholderHints,
  clearRuntimeNotePlaceholderHints,
  resolveNotePlaceholderTimeSlot
} from '@modules/library/notes/lib/pickNotePlaceholder'
