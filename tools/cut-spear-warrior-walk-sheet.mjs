/**
 * Extract the 4×4 walk sheet into the 16 right-facing frames used by the game.
 *
 * Operator: HetCreep
 * Agent: Codex / image asset production
 * Created: 2026-08-07T22:18:05+07:00
 * High-resolution rebuild: 2026-08-07T23:24:00+07:00
 * Updated: 2026-08-07T23:11:34+07:00 — rebuild from the padded smooth source poses and normalize every frame.
 *
 * Usage: node tools/cut-spear-warrior-walk-sheet.mjs
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const HIGH_RES_KEYS = [0, 1, 2, 3].map((index) =>
  join(ROOT, 'assets', 'raw', 'characters', 'walk', 'spear-warrior-hq', `key-${index}-alpha.png`),
)
// Matches the canvas and feet baseline used by the established lobby walk kits.
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const FEET_BASELINE = 475
const MAX_CONTENT_WIDTH = 331
const MAX_CONTENT_HEIGHT = 322
// The first row is the only continuous, consistently scaled walk cycle in the source sheet.
// Repeat its four compatible key poses over the 16 runtime slots instead of introducing the
// oversized poses from the later rows, which caused the visible animation hitch.
const SMOOTH_WALK_SOURCE_ORDER = [0, 1, 2, 3]

async function normalizeFrame(frame, maxContentHeight = MAX_CONTENT_HEIGHT) {
  const { data, info } = await frame.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
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

  if (right < left || bottom < top) throw new Error('A spear warrior frame has no visible pixels')

  const contentWidth = right - left + 1
  const contentHeight = bottom - top + 1
  const scale = Math.min(MAX_CONTENT_WIDTH / contentWidth, maxContentHeight / contentHeight)
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
  }).composite([
    {
      input: content,
      left: Math.round(CANVAS_WIDTH / 2 - outputWidth / 2),
      top: FEET_BASELINE - outputHeight,
    },
  ])
}

async function main() {
  await mkdir(WALK_DIR, { recursive: true })

  for (let index = 0; index < 16; index += 1) {
    const sourceIndex = SMOOTH_WALK_SOURCE_ORDER[index % SMOOTH_WALK_SOURCE_ORDER.length]
    const frame = await normalizeFrame(sharp(HIGH_RES_KEYS[sourceIndex]))

    await frame.png().toFile(join(WALK_DIR, `spear-warrior-walk-right-${index}.png`))
  }
}

await main()
