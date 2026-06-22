import { compositeDocument, pixelsToImageData } from '@modules/library/pixel-art/lib/composite'
import type { PixelDocument, SvgExportMode, SvgVectorStrategy } from '@modules/library/pixel-art/domain/types'

export async function exportDocumentPng(doc: PixelDocument): Promise<Blob> {
  const pixels = compositeDocument(doc)
  const canvas = document.createElement('canvas')
  canvas.width = doc.meta.width
  canvas.height = doc.meta.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(pixelsToImageData(pixels, doc.meta.width, doc.meta.height), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG 导出失败'))), 'image/png')
  })
}

export async function exportDocumentJpeg(doc: PixelDocument, quality = 0.92): Promise<Blob> {
  const pixels = compositeDocument(doc)
  const canvas = document.createElement('canvas')
  canvas.width = doc.meta.width
  canvas.height = doc.meta.height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.putImageData(pixelsToImageData(pixels, doc.meta.width, doc.meta.height), 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('JPEG 导出失败'))),
      'image/jpeg',
      quality
    )
  })
}

export async function exportDocumentSvg(
  doc: PixelDocument,
  mode: SvgExportMode,
  vectorStrategy: SvgVectorStrategy = 'merged'
): Promise<Blob> {
  const { width, height } = doc.meta
  if (mode === 'raster') {
    const png = await exportDocumentPng(doc)
    const base64 = await blobToBase64(png)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="data:image/png;base64,${base64}"/>
</svg>`
    return new Blob([svg], { type: 'image/svg+xml' })
  }

  const pixels = compositeDocument(doc)
  const rects: string[] = []
  if (vectorStrategy === 'per-pixel') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const a = pixels[i + 3]!
        if (a === 0) continue
        const fill = rgbaToHex(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, a)
        rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`)
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      let x = 0
      while (x < width) {
        const i = (y * width + x) * 4
        const a = pixels[i + 3]!
        if (a === 0) {
          x++
          continue
        }
        const r = pixels[i]!
        const g = pixels[i + 1]!
        const b = pixels[i + 2]!
        let run = 1
        while (x + run < width) {
          const j = (y * width + x + run) * 4
          if (pixels[j] !== r || pixels[j + 1] !== g || pixels[j + 2] !== b || pixels[j + 3] !== a) break
          run++
        }
        rects.push(
          `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${rgbaToHex(r, g, b, a)}"/>`
        )
        x += run
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${rects.join('\n')}
</svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  if (a < 255) return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
