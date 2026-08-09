/**
 * Locks Erlang Shen's visual height and foot baseline across idle and run frames.
 *
 * Operator: HetCreep
 * Agent: Codex / Erlang Shen sprite normalization
 * Created: 2026-08-08T12:55:00+07:00
 */
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHARACTER_DIR = join(ROOT, 'assets', 'raw', 'characters')
const IDLE_SOURCE_DIR = join(CHARACTER_DIR, 'generated', 'erlang-shen-idle-v4', 'alpha')
const RUN_SOURCE_DIR = join(CHARACTER_DIR, 'exports', 'erlang-shen-run-v3', 'run_right', 'frames')
const WALK_DIR = join(CHARACTER_DIR, 'walk')
const FRAME_COUNT = 25
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const CHARACTER_HEIGHT = 370
const FOOT_BASELINE = 480
const ALPHA_THRESHOLD = 16
const IDLE_LOWER_BODY_TOP = 371

async function findBounds(source) {
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

async function normaliseFrame(source, destination) {
  const bounds = await findBounds(source)
  const { data: sprite, info } = await sharp(source)
    .extract(bounds)
    .ensureAlpha()
    .resize({ height: CHARACTER_HEIGHT, kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer({ resolveWithObject: true })
  const left = Math.round((CANVAS_WIDTH - info.width) / 2)
  const top = FOOT_BASELINE - info.height + 1

  await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: sprite, left, top }])
    .png()
    .toFile(destination)
}

async function lockIdleLowerBody() {
  const baseline = await sharp(join(CHARACTER_DIR, 'erlang-shen-v3-idle-0.png')).png().toBuffer()

  for (let index = 1; index < FRAME_COUNT; index += 1) {
    const destination = join(CHARACTER_DIR, `erlang-shen-v3-idle-${index}.png`)
    const upperMotion = await sharp(destination)
      .extract({ left: 0, top: 0, width: CANVAS_WIDTH, height: IDLE_LOWER_BODY_TOP })
      .png()
      .toBuffer()
    await sharp(baseline).composite([{ input: upperMotion, left: 0, top: 0 }]).png().toFile(destination)
  }
}

async function main() {
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const frame = String(index + 1).padStart(4, '0')
    await normaliseFrame(join(IDLE_SOURCE_DIR, `${frame}.png`), join(CHARACTER_DIR, `erlang-shen-v3-idle-${index}.png`))
    await normaliseFrame(join(RUN_SOURCE_DIR, `${frame}.png`), join(WALK_DIR, `erlang-shen-v3-run-right-${index}.png`))
  }
  await lockIdleLowerBody()
}

await main()
