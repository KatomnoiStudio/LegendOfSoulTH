/**
 * Re-times the supplied 16-frame full-body idle into a seamless 60-frame loop.
 *
 * Operator: HetCreep
 * Agent: Codex / full-body idle retiming
 * Created: 2026-08-08T09:30:00+07:00
 *
 * Usage: node tools/retime-spear-warrior-idle.mjs
 */
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHARACTER_DIR = join(ROOT, 'assets', 'raw', 'characters')
const SOURCE_FRAME_COUNT = 16
const OUTPUT_FRAME_COUNT = 60
const FRAME_WIDTH = 640
const FRAME_HEIGHT = 512
const CHANNELS = 4
const FOOT_BASELINE = 474
const FOOT_PIVOT_X = 342

function sourcePath(index) {
  return join(CHARACTER_DIR, `spear-warrior-idle-${index}.png`)
}

function outputPath(index) {
  return join(CHARACTER_DIR, `spear-warrior-idle-smooth-${index}.png`)
}

function baseline(data) {
  let bottom = -1
  for (let pixel = 0; pixel < FRAME_WIDTH * FRAME_HEIGHT; pixel += 1) {
    if (data[pixel * CHANNELS + 3] > 32) bottom = Math.floor(pixel / FRAME_WIDTH)
  }
  return bottom
}

function footAnchor(data) {
  const bottom = baseline(data)
  let right = -1
  for (let y = Math.max(0, bottom - 32); y <= bottom; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      if (data[(y * FRAME_WIDTH + x) * CHANNELS + 3] > 32) right = Math.max(right, x)
    }
  }
  if (right < 0) throw new Error('Retimed idle frame has no opaque foot pixels')
  return { x: right, y: bottom }
}

function shift(data, horizontalOffset, verticalOffset) {
  const output = Buffer.alloc(data.length)
  const rowSize = FRAME_WIDTH * CHANNELS
  const sourceX = Math.max(0, -horizontalOffset)
  const sourceY = Math.max(0, -verticalOffset)
  const destinationX = Math.max(0, horizontalOffset)
  const destinationY = Math.max(0, verticalOffset)
  const copyWidth = FRAME_WIDTH - Math.abs(horizontalOffset)
  const copyHeight = FRAME_HEIGHT - Math.abs(verticalOffset)
  for (let row = 0; row < copyHeight; row += 1) {
    const sourceOffset = (sourceY + row) * rowSize + sourceX * CHANNELS
    const destinationOffset = (destinationY + row) * rowSize + destinationX * CHANNELS
    data.copy(output, destinationOffset, sourceOffset, sourceOffset + copyWidth * CHANNELS)
  }
  return output
}

async function main() {
  const sourceFrames = await Promise.all(Array.from({ length: SOURCE_FRAME_COUNT }, async (_, index) => {
    const { data, info } = await sharp(sourcePath(index)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    if (info.width !== FRAME_WIDTH || info.height !== FRAME_HEIGHT || info.channels !== CHANNELS) {
      throw new Error(`Unexpected idle frame dimensions: ${sourcePath(index)}`)
    }
    if (baseline(data) !== FOOT_BASELINE) throw new Error(`Unstable foot baseline in idle frame ${index}`)
    return data
  }))

  for (let index = 0; index < OUTPUT_FRAME_COUNT; index += 1) {
    const position = (index * SOURCE_FRAME_COUNT) / OUTPUT_FRAME_COUNT
    // Do not cross-fade two illustrated poses: that creates double hands, cloth, and hair.
    // Re-time by holding the nearest authored pose for a 60Hz presentation instead.
    const sourceIndex = Math.round(position) % SOURCE_FRAME_COUNT
    let frame = Buffer.from(sourceFrames[sourceIndex])
    const anchor = footAnchor(frame)
    const horizontalCorrection = FOOT_PIVOT_X - anchor.x
    const verticalCorrection = FOOT_BASELINE - anchor.y
    if (Math.abs(horizontalCorrection) > 16 || Math.abs(verticalCorrection) > 1) {
      throw new Error(`Unstable foot anchor in retimed idle frame ${index}`)
    }
    if (horizontalCorrection !== 0 || verticalCorrection !== 0) {
      frame = shift(frame, horizontalCorrection, verticalCorrection)
    }
    const lockedAnchor = footAnchor(frame)
    if (lockedAnchor.x !== FOOT_PIVOT_X || lockedAnchor.y !== FOOT_BASELINE) {
      throw new Error(`Failed to lock foot anchor in retimed idle frame ${index}`)
    }
    await sharp(frame, { raw: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: CHANNELS } })
      .png()
      .toFile(outputPath(index))
  }
}

await main()
