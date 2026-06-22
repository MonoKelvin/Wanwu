export const LIBRARY_PIXEL_ART_HOME = 'library-pixel-art-home' as const
export const LIBRARY_PIXEL_ART_FOLDER = 'library-pixel-art-folder' as const
export const LIBRARY_PIXEL_ART_EDITOR_ROUTE = 'pixel-art-editor' as const

export function isPixelEditorPath(path: string): boolean {
  return /^\/pixel-art\/edit\/[^/?#]+/.test(path)
}

export function isPixelEditorRoute(
  name: string | symbol | null | undefined,
  path: string
): boolean {
  return name === LIBRARY_PIXEL_ART_EDITOR_ROUTE || isPixelEditorPath(path)
}
