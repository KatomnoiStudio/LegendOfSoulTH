/**
 * Normalizes Erlang Shen's 18-frame attack candidate to a common root pivot and foot baseline.
 *
 * Operator: HetCreep
 * Agent: Codex / Erlang Shen attack preparation
 * Created: 2026-08-08T14:35:00+07:00
 */
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT_DIR = join(ROOT, 'assets', 'raw', 'characters', 'generated', 'erlang-shen-attack-v1')
const SOURCE_DIR = join(ROOT_DIR, 'alpha')
const FRAME_DIR = join(ROOT_DIR, 'frames')
const FRAME_COUNT = 18
const CANVAS_WIDTH = 768
const CANVAS_HEIGHT = 512
const CHARACTER_HEIGHT = 370
const FOOT_BASELINE = 480
const ALPHA_THRESHOLD = 16
const SHEET_COLUMNS = 6
const SHEET_ROWS = 3

async function bounds(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue
    left = Math.min(left, x)
    top = Math.min(top, y)
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }
  if (right < left || bottom < top) throw new Error(`No visible sprite pixels: ${source}`)
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

async function main() {
  const tiles = []
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const name = `${String(index + 1).padStart(4, '0')}.png`
    const crop = await bounds(join(SOURCE_DIR, name))
    const { data: sprite, info } = await sharp(join(SOURCE_DIR, name))
      .extract(crop)
      .ensureAlpha()
      .resize({ height: CHARACTER_HEIGHT, kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer({ resolveWithObject: true })
    const output = join(FRAME_DIR, name)
    await sharp({ create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: sprite, left: Math.round((CANVAS_WIDTH - info.width) / 2), top: FOOT_BASELINE - info.height + 1 }])
      .png()
      .toFile(output)
    tiles.push({ input: output, left: (index % SHEET_COLUMNS) * CANVAS_WIDTH, top: Math.floor(index / SHEET_COLUMNS) * CANVAS_HEIGHT })
  }
  await sharp({ create: { width: SHEET_COLUMNS * CANVAS_WIDTH, height: SHEET_ROWS * CANVAS_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(tiles)
    .png()
    .toFile(join(ROOT_DIR, 'erlang-shen-attack-v1-sheet.png'))
}

await main()
