/**
 * Prepares the independent Erlang Shen V6 idle renders on a shared foot baseline.
 *
 * Operator: HetCreep
 * Agent: Codex / Erlang Shen V6 idle preparation
 * Created: 2026-08-08T13:45:00+07:00
 */
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = join(ROOT, 'assets', 'raw', 'characters', 'generated', 'erlang-shen-idle-v6', 'alpha')
const OUTPUT_DIR = join(ROOT, 'assets', 'raw', 'characters', 'generated', 'erlang-shen-idle-v6', 'normalised')
const FRAME_COUNT = 25
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const CHARACTER_HEIGHT = 370
const FOOT_BASELINE = 480
const ALPHA_THRESHOLD = 16

async function bounds(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < left || bottom < top) throw new Error(`No visible sprite pixels: ${source}`)
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

async function main() {
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const source = join(SOURCE_DIR, `${String(index + 1).padStart(4, '0')}.png`)
    const crop = await bounds(source)
    const { data: sprite, info } = await sharp(source)
      .extract(crop)
      .ensureAlpha()
      .resize({ height: CHARACTER_HEIGHT, kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer({ resolveWithObject: true })
    await sharp({ create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: sprite, left: Math.round((CANVAS_WIDTH - info.width) / 2), top: FOOT_BASELINE - info.height + 1 }])
      .png()
      .toFile(join(OUTPUT_DIR, `${String(index + 1).padStart(4, '0')}.png`))
  }
}

await main()
