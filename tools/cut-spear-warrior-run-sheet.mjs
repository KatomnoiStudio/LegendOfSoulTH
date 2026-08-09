/**
 * Extracts the authored 4x4 spear warrior run sheet into 16 clean runtime frames.
 *
 * Operator: HetCreep
 * Agent: Codex / run sprite production
 * Created: 2026-08-08T00:05:00+07:00
 *
 * Usage: node tools/cut-spear-warrior-run-sheet.mjs
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const SOURCE_SHEET = join(WALK_DIR, 'spear-warrior-run-16-sheet-alpha.png')
const GRID_SIZE = 4
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const FEET_BASELINE = 475
const MAX_CONTENT_WIDTH = 331
const MAX_CONTENT_HEIGHT = 322

async function normalizeFrame(frame) {
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

  if (right < left || bottom < top) throw new Error('A spear warrior run frame has no visible pixels')

  const contentWidth = right - left + 1
  const contentHeight = bottom - top + 1
  const scale = Math.min(MAX_CONTENT_WIDTH / contentWidth, MAX_CONTENT_HEIGHT / contentHeight)
  const outputWidth = Math.round(contentWidth * scale)
  const outputHeight = Math.round(contentHeight * scale)
  const content = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .extract({ left, top, width: contentWidth, height: contentHeight })
    .resize({ width: outputWidth, height: outputHeight, kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{
    input: content,
    left: Math.round(CANVAS_WIDTH / 2 - outputWidth / 2),
    top: FEET_BASELINE - outputHeight,
  }])
}

async function main() {
  await mkdir(WALK_DIR, { recursive: true })
  const image = sharp(SOURCE_SHEET)
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height) throw new Error('The run sheet has no dimensions')

  const xEdges = Array.from({ length: GRID_SIZE + 1 }, (_, index) => Math.round((index * metadata.width) / GRID_SIZE))
  const yEdges = Array.from({ length: GRID_SIZE + 1 }, (_, index) => Math.round((index * metadata.height) / GRID_SIZE))

  for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
    const column = index % GRID_SIZE
    const row = Math.floor(index / GRID_SIZE)
    const frame = await normalizeFrame(image.clone().extract({
      left: xEdges[column],
      top: yEdges[row],
      width: xEdges[column + 1] - xEdges[column],
      height: yEdges[row + 1] - yEdges[row],
    }))
    await frame.png().toFile(join(WALK_DIR, `spear-warrior-run-right-${index}.png`))
  }
}

await main()
