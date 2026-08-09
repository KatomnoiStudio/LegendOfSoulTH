import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rawDir = join(root, 'assets', 'raw', 'characters')
const publicDir = join(root, 'public', 'characters')
const bodySheets = ['a', 'b', 'c', 'd'].map((phase) => join(rawDir, `erlang-shen-skill-1-sheet-${phase}.png`))
const strikeSheet = join(rawDir, 'erlang-shen-skill-1-strike-sheet.png')
const frame8ReplacementSheet = join(rawDir, 'erlang-shen-skill-1-frame-8-replacement-sheet.png')
const OUT_W = 640
const OUT_H = 512
// Fixed-grid row calibration: one translation applies to all three complete
// cells in a row. There is no per-frame trim, crop, scale, or re-anchoring.
const BODY_ROW_Y_OFFSETS = [
  [2, 1],
  [1, 6],
  [1, 13],
  [1, 10],
]

function removeMagenta(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const magenta = r > 95 && b > 95 && r > g * 1.12 && b > g * 1.12
    if (magenta || data[i + 3] === 0) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      if (magenta) data[i + 3] = 0
    }
  }
  return data
}

function removeDetachedEdgeSpill(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  for (let seed = 0; seed < visited.length; seed += 1) {
    if (visited[seed] || data[seed * 4 + 3] === 0) continue
    let head = 0
    let tail = 1
    let touchesCenter = false
    queue[0] = seed
    visited[seed] = 1
    while (head < tail) {
      const point = queue[head++]
      const x = point % width
      const y = Math.floor(point / width)
      if (x >= 88 && x < width - 88) touchesCenter = true
      const neighbors = [point - 1, point + 1, point - width, point + width]
      for (const next of neighbors) {
        if (next < 0 || next >= visited.length || visited[next] || data[next * 4 + 3] === 0) continue
        const nx = next % width
        const ny = Math.floor(next / width)
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue
        visited[next] = 1
        queue[tail++] = next
      }
    }
    if (!touchesCenter) {
      for (let index = 0; index < tail; index += 1) data.fill(0, queue[index] * 4, queue[index] * 4 + 4)
    }
  }
  return data
}

async function keyedSheet(path, width, height) {
  const normalized = await sharp(path).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer()
  return sharp(removeMagenta(normalized), { raw: { width, height, channels: 4 } }).png().toBuffer()
}

async function writeFrame(buffer, prefix, index) {
  const name = `${prefix}-${index}`
  await sharp(buffer).png().toFile(join(rawDir, `${name}.png`))
  await sharp(buffer).webp({ lossless: true }).toFile(join(publicDir, `${name}.webp`))
}

const bodyFrames = []
const frame8Replacement = await keyedSheet(frame8ReplacementSheet, 1536, 1024)
for (let phase = 0; phase < bodySheets.length; phase += 1) {
  // Fixed Grid: every complete 1536x1024 sheet is cut into exact 512x512 cells (3x2).
  // Every cell receives one shared 90% transform; no alpha-bound trim/crop exists here.
  const sheet = await keyedSheet(bodySheets[phase], 1536, 1024)
  for (let local = 0; local < 6; local += 1) {
    const row = Math.floor(local / 3)
    const index = phase * 6 + local
    const sourceSheet = index === 8 ? frame8Replacement : sheet
    const sourceColumn = index === 8 ? 2 : local % 3
    const sourceRow = index === 8 ? 0 : row
    const cellRaw = await sharp(sourceSheet).extract({
      left: sourceColumn * 512,
      top: sourceRow * 512,
      width: 512,
      height: 512,
    }).ensureAlpha().raw().toBuffer()
    // Remove detached components that exist only in the outer edge bands (neighbor-slot spill).
    // This never moves, crops, scales, or re-anchors the retained fixed-grid cell.
    removeDetachedEdgeSpill(cellRaw, 512, 512)
    // The same narrow safety gutter is applied to every complete cell.
    for (let y = 0; y < 512; y += 1) {
      for (let x = 0; x < 512; x += 1) {
        if (x >= 8 && x < 504) continue
        const pixel = (y * 512 + x) * 4
        cellRaw.fill(0, pixel, pixel + 4)
      }
    }
    const cell = await sharp(cellRaw, { raw: { width: 512, height: 512, channels: 4 } })
      .resize(461, 461, { fit: 'fill' }).png().toBuffer()
    const composed = await sharp({ create: { width: OUT_W, height: OUT_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: cell, left: 89, top: 50 + BODY_ROW_Y_OFFSETS[phase][row] }]).ensureAlpha().raw().toBuffer()
    // Lanczos interpolation can recreate a thin key-color fringe, so key the
    // complete fixed-grid result once more without moving or resizing content.
    const frame = await sharp(removeMagenta(composed), {
      raw: { width: OUT_W, height: OUT_H, channels: 4 },
    }).png().toBuffer()
    await writeFrame(frame, 'erlang-shen-skill-1', index)
    bodyFrames.push({ input: frame, left: (local % 3) * OUT_W, top: Math.floor(local / 3) * OUT_H })
  }
  await sharp({ create: { width: OUT_W * 3, height: OUT_H * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(bodyFrames.slice(phase * 6, phase * 6 + 6)).png()
    .toFile(join(publicDir, `erlang-shen-skill-1-preview-${phase + 1}.png`))
}

const fullPreviewFrames = bodyFrames.map(({ input }, index) => ({
  input,
  left: (index % 6) * OUT_W,
  top: Math.floor(index / 6) * OUT_H,
}))
await sharp({ create: { width: OUT_W * 6, height: OUT_H * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(fullPreviewFrames).png().toFile(join(publicDir, 'erlang-shen-skill-1-preview-all-24.png'))

const animatedPages = bodyFrames.map(({ input }, index) => ({ input, left: 0, top: index * OUT_H }))
await sharp({
  create: {
    width: OUT_W,
    height: OUT_H * bodyFrames.length,
    pageHeight: OUT_H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(animatedPages)
  .gif({ delay: Array(bodyFrames.length).fill(50), loop: 0, effort: 7 })
  .toFile(join(publicDir, 'erlang-shen-skill-1-preview-24-frames.gif'))

const strike = await keyedSheet(strikeSheet, 1776, 888)
const strikeFrames = []
for (let index = 0; index < 8; index += 1) {
  const cell = await sharp(strike).extract({
    left: (index % 4) * 444,
    top: Math.floor(index / 4) * 444,
    width: 444,
    height: 444,
  }).resize(512, 512, { fit: 'fill' }).png().toBuffer()
  const frame = await sharp({ create: { width: OUT_W, height: OUT_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cell, left: 64, top: 0 }]).png().toBuffer()
  await writeFrame(frame, 'erlang-shen-skill-1-strike', index)
  strikeFrames.push({ input: frame, left: (index % 4) * OUT_W, top: Math.floor(index / 4) * OUT_H })
}

await sharp({ create: { width: OUT_W * 4, height: OUT_H * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(strikeFrames).png().toFile(join(publicDir, 'erlang-shen-skill-1-strike-preview.png'))

console.log('Imported 24 body frames and 8 strike frames with fixed-grid transforms.')
