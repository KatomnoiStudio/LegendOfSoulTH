/**
 * Builds a 60-frame seamless walk loop from the authored 16-frame spear warrior cycle.
 *
 * Operator: HetCreep
 * Agent: Codex / sprite retiming pipeline
 * Created: 2026-08-07T23:55:00+07:00
 *
 * Usage: node tools/retime-spear-warrior-walk.mjs
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const PREVIEW_DIR = join(ROOT, 'public', 'previews')
const SOURCE_FRAME_COUNT = 16
const OUTPUT_FRAME_COUNT = 60
const FRAME_WIDTH = 640
const FRAME_HEIGHT = 512
const CHANNELS = 4
const FOOT_BASELINE = 474
const SHEET_COLUMNS = 10

function sourcePath(index) {
  return join(WALK_DIR, `spear-warrior-walk-right-${index}.png`)
}

function outputPath(index) {
  return join(WALK_DIR, `spear-warrior-walk-smooth-right-${index}.png`)
}

function interpolateFrames(first, second, progress) {
  const output = Buffer.allocUnsafe(first.length)
  for (let offset = 0; offset < first.length; offset += CHANNELS) {
    const alphaA = first[offset + 3] / 255
    const alphaB = second[offset + 3] / 255
    const alpha = alphaA + (alphaB - alphaA) * progress

    for (let channel = 0; channel < 3; channel += 1) {
      const premultipliedA = first[offset + channel] * alphaA
      const premultipliedB = second[offset + channel] * alphaB
      output[offset + channel] = alpha === 0
        ? 0
        : Math.round((premultipliedA + (premultipliedB - premultipliedA) * progress) / alpha)
    }
    output[offset + 3] = Math.round(alpha * 255)
  }
  return output
}

async function getBaseline(data) {
  let bottom = -1
  for (let pixel = 0; pixel < FRAME_WIDTH * FRAME_HEIGHT; pixel += 1) {
    if (data[pixel * CHANNELS + 3] > 4) bottom = Math.floor(pixel / FRAME_WIDTH)
  }
  return bottom
}

async function main() {
  await mkdir(WALK_DIR, { recursive: true })
  await mkdir(PREVIEW_DIR, { recursive: true })

  const sources = await Promise.all(
    Array.from({ length: SOURCE_FRAME_COUNT }, async (_, index) => {
      const { data, info } = await sharp(sourcePath(index)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      if (info.width !== FRAME_WIDTH || info.height !== FRAME_HEIGHT || info.channels !== CHANNELS) {
        throw new Error(`Unexpected source frame dimensions for ${sourcePath(index)}`)
      }
      const baseline = await getBaseline(data)
      if (baseline !== FOOT_BASELINE) throw new Error(`Unstable foot baseline in source frame ${index}: ${baseline}`)
      return data
    }),
  )

  const outputFrames = Array.from({ length: OUTPUT_FRAME_COUNT }, (_, outputIndex) => {
    const sourcePosition = (outputIndex * SOURCE_FRAME_COUNT) / OUTPUT_FRAME_COUNT
    const firstIndex = Math.floor(sourcePosition) % SOURCE_FRAME_COUNT
    const secondIndex = (firstIndex + 1) % SOURCE_FRAME_COUNT
    return interpolateFrames(sources[firstIndex], sources[secondIndex], sourcePosition - Math.floor(sourcePosition))
  })

  for (const [index, frame] of outputFrames.entries()) {
    const baseline = await getBaseline(frame)
    if (baseline !== FOOT_BASELINE) throw new Error(`Unstable foot baseline in output frame ${index}: ${baseline}`)
    await sharp(frame, { raw: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: CHANNELS } })
      .png()
      .toFile(outputPath(index))
  }

  const animationStack = Buffer.concat(outputFrames)
  const sheetRows = Math.ceil(OUTPUT_FRAME_COUNT / SHEET_COLUMNS)
  await sharp({
    create: {
      width: FRAME_WIDTH * SHEET_COLUMNS,
      height: FRAME_HEIGHT * sheetRows,
      channels: CHANNELS,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(outputFrames.map((input, index) => ({
      input,
      raw: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: CHANNELS },
      left: (index % SHEET_COLUMNS) * FRAME_WIDTH,
      top: Math.floor(index / SHEET_COLUMNS) * FRAME_HEIGHT,
    })))
    .png()
    .toFile(join(WALK_DIR, 'spear-warrior-walk-smooth-60-sheet.png'))

  await sharp(animationStack, {
    raw: {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT * OUTPUT_FRAME_COUNT,
      channels: CHANNELS,
      pageHeight: FRAME_HEIGHT,
    },
  })
    .gif({ loop: 0, delay: 33, effort: 8, dither: 0.8 })
    .toFile(join(PREVIEW_DIR, 'spear-warrior-walk-smooth-60.gif'))
}

await main()
