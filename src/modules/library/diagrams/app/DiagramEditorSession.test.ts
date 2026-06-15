import { describe, expect, it, vi, beforeAll } from 'vitest'
import { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { IDiagramEditorPort } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 0
  })
})

function makeSession(): DiagramEditorSession {
  const port = {
    getGraph: () => ({ nodes: [], edges: [] }),
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    getCanvasSettings: () => ({}),
    loadCanvasSettings: vi.fn(),
    loadGraph: vi.fn(),
    resize: vi.fn(),
    applyViewport: vi.fn()
  } as unknown as IDiagramEditorPort
  const repo = {} as IDiagramRepositoryPort
  const session = new DiagramEditorSession(port, repo)
  session.openBlank('test')
  return session
}

const savedMeta = {
  id: 'f1',
  title: 'test',
  folderId: 'folder',
  pageCount: 1,
  updatedAt: new Date().toISOString(),
  pinned: false
}

describe('DiagramEditorSession.markSaved', () => {
  it('keeps dirty when saveGeneration changed during save', () => {
    const session = makeSession()
    session.markActivePageDirty()
    const persistedPatch = session.getWritePatch()
    const saveGenerationAtStart = session.getSaveGeneration()

    session.markActivePageDirty()

    session.markSaved(savedMeta, { persistedPatch, saveGenerationAtStart })

    expect(session.dirty).toBe(true)
  })

  it('clears dirty when generation unchanged', () => {
    const session = makeSession()
    session.markActivePageDirty()
    const persistedPatch = session.getWritePatch()
    const saveGenerationAtStart = session.getSaveGeneration()

    session.markSaved(savedMeta, { persistedPatch, saveGenerationAtStart })

    expect(session.dirty).toBe(false)
  })
})
