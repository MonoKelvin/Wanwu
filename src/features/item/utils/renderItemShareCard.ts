import type { Item } from '@shared/types/item'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = url
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** 生成物品介绍分享图（PNG data URL） */
export async function renderItemShareCard(item: Item, coverUrl: string | null): Promise<string> {
  const width = 1080
  const height = 1440
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')

  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#f8f8f9')
  bg.addColorStop(0.45, '#ffffff')
  bg.addColorStop(1, '#ececee')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgb(18 18 22 / 0.04)'
  for (let y = 48; y < height; y += 28) {
    for (let x = 48; x < width; x += 28) {
      ctx.beginPath()
      ctx.arc(x, y, 1, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const pad = 72
  let y = pad + 24

  ctx.fillStyle = '#121214'
  ctx.font = '600 28px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('万物 Wanwu', pad, y)

  y += 56
  const imageBoxH = 520
  roundRect(ctx, pad, y, width - pad * 2, imageBoxH, 28)
  ctx.fillStyle = '#f0f0f2'
  ctx.fill()
  ctx.strokeStyle = 'rgb(18 18 22 / 0.08)'
  ctx.lineWidth = 2
  ctx.stroke()

  if (coverUrl) {
    try {
      const img = await loadImage(coverUrl)
      ctx.save()
      roundRect(ctx, pad + 2, y + 2, width - pad * 2 - 4, imageBoxH - 4, 26)
      ctx.clip()
      const scale = Math.max((width - pad * 2) / img.width, imageBoxH / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      const dx = pad + (width - pad * 2 - dw) / 2
      const dy = y + (imageBoxH - dh) / 2
      ctx.drawImage(img, dx, dy, dw, dh)
      ctx.restore()
    } catch {
      ctx.fillStyle = '#888890'
      ctx.font = '500 24px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂无配图', width / 2, y + imageBoxH / 2)
      ctx.textAlign = 'left'
    }
  }

  y += imageBoxH + 48

  if (item.subCategoryName) {
    ctx.fillStyle = '#5a5a62'
    ctx.font = '600 22px system-ui, sans-serif'
    ctx.fillText(item.subCategoryName.toUpperCase(), pad, y)
    y += 40
  }

  ctx.fillStyle = '#121214'
  ctx.font = '700 52px system-ui, sans-serif'
  const title = item.name
  const titleLines = wrapText(ctx, title, width - pad * 2, 2)
  for (const line of titleLines) {
    ctx.fillText(line, pad, y)
    y += 62
  }

  y += 12
  if (item.summary) {
    ctx.fillStyle = '#5a5a62'
    ctx.font = '400 28px system-ui, sans-serif'
    const summaryLines = wrapText(ctx, item.summary, width - pad * 2, 4)
    for (const line of summaryLines) {
      ctx.fillText(line, pad, y)
      y += 40
    }
  }

  if (item.tags?.length) {
    y += 20
    let tx = pad
    ctx.font = '500 22px system-ui, sans-serif'
    for (const tag of item.tags.slice(0, 5)) {
      const tw = ctx.measureText(tag).width + 36
      if (tx + tw > width - pad) break
      roundRect(ctx, tx, y, tw, 40, 20)
      ctx.fillStyle = '#ececee'
      ctx.fill()
      ctx.fillStyle = '#3a3a42'
      ctx.fillText(tag, tx + 18, y + 28)
      tx += tw + 12
    }
  }

  ctx.fillStyle = '#888890'
  ctx.font = '400 20px ui-monospace, monospace'
  ctx.fillText(item.id, pad, height - pad)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#5a5a62'
  ctx.font = '500 22px system-ui, sans-serif'
  ctx.fillText('wanwu.app', width - pad, height - pad)
  ctx.textAlign = 'left'

  return canvas.toDataURL('image/png')
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const chars = Array.from(text)
  const lines: string[] = []
  let line = ''
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length >= maxLines) break
    } else {
      line = test
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && chars.length > line.length) {
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = last.replace(/.$/, '…')
  }
  return lines.length ? lines : [text]
}
