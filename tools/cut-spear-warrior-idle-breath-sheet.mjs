/**
 * Extracts the 4x4 full-body spear warrior breathing idle sheet into sixteen runtime frames.
 *
 * Operator: HetCreep
 * Agent: Codex / full-body idle integration
 * Updated: 2026-08-08T09:24:00+07:00
 *
 * Usage: node tools/cut-spear-warrior-idle-breath-sheet.mjs
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHARACTER_DIR = join(ROOT, 'assets', 'raw', 'characters')
const SOURCE_SHEET = join(CHARACTER_DIR, 'spear-warrior-idle-fullbody-16-alpha.png')
const COLUMNS = 4
const ROWS = 4
const CELL_BOTTOM_GUARD = 8
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const FEET_BASELINE = 475
const MAX_CONTENT_WIDTH = 500
// Must match the walk frames: one scale and one anchored foot baseline for every motion.
const MAX_CONTENT_HEIGHT = 322
const FOOT_PIVOT_X = 342

async function getVisibleBounds(frame) {
  const { data, info } = await frame.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] <= 4) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) throw new Error('An idle breathing frame has no visible pixels')
  return { left, top, right, bottom }
}

async function getFootAnchor(frame) {
  const { data, info } = await frame.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let bottom = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 32) bottom = y
    }
  }
  let right = -1
  for (let y = Math.max(0, bottom - 32); y <= bottom; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 32) right = Math.max(right, x)
    }
  }
  if (right < 0) throw new Error('An idle breathing frame has no opaque foot pixels')
  return { x: right, y: bottom }
}

async function normalizeFrame(frameBuffer, commonBounds, footAnchor) {
  const commonWidth = commonBounds.right - commonBounds.left + 1
  const commonHeight = commonBounds.bottom - commonBounds.top + 1
  const scale = Math.min(MAX_CONTENT_WIDTH / commonWidth, MAX_CONTENT_HEIGHT / commonHeight)
  const outputWidth = Math.round(commonWidth * scale)
  const outputHeight = Math.round(commonHeight * scale)
  const content = await sharp(frameBuffer)
    .ensureAlpha()
    .extract({ left: commonBounds.left, top: commonBounds.top, width: commonWidth, height: commonHeight })
    .resize({ width: outputWidth, height: outputHeight, kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer()

  // The right boot is the fixed animation pivot. All body movement remains relative to it.
  const footOffsetX = Math.round(((footAnchor.x - commonBounds.left) / commonWidth) * outputWidth)
  const footOffsetY = Math.round(((footAnchor.y - commonBounds.top + 1) / commonHeight) * outputHeight)

  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{
    input: content,
    left: FOOT_PIVOT_X - footOffsetX,
    top: FEET_BASELINE - footOffsetY,
  }])
}

async function main() {
  await mkdir(CHARACTER_DIR, { recursive: true })
  const image = sharp(SOURCE_SHEET)
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) throw new Error('The idle breathing sheet has no dimensions')

  const xEdges = Array.from({ length: COLUMNS + 1 }, (_, index) => Math.round((index * metadata.width) / COLUMNS))
  const yEdges = Array.from({ length: ROWS + 1 }, (_, index) => Math.round((index * metadata.height) / ROWS))

  const cells = []
  for (let index = 0; index < COLUMNS * ROWS; index += 1) {
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    const rectangle = {
      left: xEdges[column],
      top: yEdges[row],
      width: xEdges[column + 1] - xEdges[column],
      // The supplied grid has no divider line; reserve a small lower gutter so the
      // crown/feather from the next row cannot enter this actor's feet area.
      height: yEdges[row + 1] - yEdges[row] - CELL_BOTTOM_GUARD,
    }
    // Materialize the cell before the second crop. Sharp's pipeline permits one pending
    // extract operation, so reusing a chained image here would target the full sheet.
    const frameBuffer = await image.clone().extract(rectangle).png().toBuffer()
    const bounds = await getVisibleBounds(sharp(frameBuffer))
    const footAnchor = await getFootAnchor(sharp(frameBuffer))
    cells.push({ frameBuffer, bounds, footAnchor })
  }

  const commonBounds = cells.reduce(
    (all, cell) => ({
      left: Math.min(all.left, cell.bounds.left),
      top: Math.min(all.top, cell.bounds.top),
      right: Math.max(all.right, cell.bounds.right),
      bottom: Math.max(all.bottom, cell.bounds.bottom),
    }),
    { left: Number.POSITIVE_INFINITY, top: Number.POSITIVE_INFINITY, right: -1, bottom: -1 },
  )

  for (const [index, cell] of cells.entries()) {
    const rendered = await (await normalizeFrame(cell.frameBuffer, commonBounds, cell.footAnchor)).png().toBuffer()
    const renderedFootAnchor = await getFootAnchor(sharp(rendered))
    const correctionX = FOOT_PIVOT_X - renderedFootAnchor.x
    const correctionY = (FEET_BASELINE - 1) - renderedFootAnchor.y
    const frame = correctionX === 0 && correctionY === 0
      ? sharp(rendered)
      : sharp({
          create: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        }).composite([{ input: rendered, left: correctionX, top: correctionY }])
    // The source sheet has occasional pixels from the next grid row below the boots.
    // Hard-clip below the shared ground line so a stray feather can never move the actor.
    await frame
      .extract({ left: 0, top: 0, width: CANVAS_WIDTH, height: FEET_BASELINE })
      .extend({
        bottom: CANVAS_HEIGHT - FEET_BASELINE,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(join(CHARACTER_DIR, `spear-warrior-idle-${index}.png`))
  }

}

await main()
