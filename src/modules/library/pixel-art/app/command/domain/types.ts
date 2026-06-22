export const PixelCmd = {
  File: {
    Save: 'Pixel.File.Save',
    SaveAs: 'Pixel.File.SaveAs',
    Export: 'Pixel.File.Export',
    Close: 'Pixel.File.Close'
  },
  Document: {
    DrawStroke: 'Pixel.Document.DrawStroke',
    Fill: 'Pixel.Document.Fill',
    DrawShape: 'Pixel.Document.DrawShape',
    GradientFill: 'Pixel.Document.GradientFill',
    PickColor: 'Pixel.Document.PickColor',
    SetForeground: 'Pixel.Document.SetForeground',
    SetBackground: 'Pixel.Document.SetBackground',
    Undo: 'Pixel.Document.Undo',
    Redo: 'Pixel.Document.Redo',
    SetZoom: 'Pixel.Document.SetZoom',
    SetPan: 'Pixel.Document.SetPan',
    SetGrid: 'Pixel.Document.SetGrid',
    SetCheckerboard: 'Pixel.Document.SetCheckerboard'
  },
  Layer: {
    Add: 'Pixel.Layer.Add',
    Delete: 'Pixel.Layer.Delete',
    Rename: 'Pixel.Layer.Rename',
    Reorder: 'Pixel.Layer.Reorder',
    SetVisible: 'Pixel.Layer.SetVisible',
    SetLocked: 'Pixel.Layer.SetLocked',
    SetActive: 'Pixel.Layer.SetActive',
    MergeVisible: 'Pixel.Layer.MergeVisible'
  },
  Catalog: {
    File: {
      Create: 'Pixel.Catalog.File.Create',
      Rename: 'Pixel.Catalog.File.Rename',
      Move: 'Pixel.Catalog.File.Move',
      SoftDelete: 'Pixel.Catalog.File.SoftDelete',
      Restore: 'Pixel.Catalog.File.Restore',
      Purge: 'Pixel.Catalog.File.Purge'
    },
    Folder: {
      Create: 'Pixel.Catalog.Folder.Create',
      Rename: 'Pixel.Catalog.Folder.Rename',
      Delete: 'Pixel.Catalog.Folder.Delete'
    }
  }
} as const

export type PixelCommandType = typeof PixelCmd[keyof typeof PixelCmd] extends infer T
  ? T extends Record<string, string>
    ? T[keyof T]
    : T extends Record<string, Record<string, string>>
      ? T[keyof T][keyof T[keyof T]]
      : never
  : never

export interface PixelCommandEnvelope {
  type: string
  payload?: Record<string, unknown>
}

export interface PixelCommandResult {
  ok: boolean
  code?: string
  message?: string
  data?: unknown
}

export interface PixelCommandContext {
  sessionId: string | null
  fileId: string | null
}
