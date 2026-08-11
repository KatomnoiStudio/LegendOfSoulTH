import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const GRID_COLUMNS = 6
const GRID_ROWS = 2
// Source pose 3 has an opaque black block over the arm. There is no original
// character detail underneath, so only intact poses are replayed to avoid holes.
const STABLE_SOURCE_POSES = [1, 3]
const OUTPUT_WIDTH = 640
const OUTPUT_HEIGHT = 512
const TARGET_WAIST_X = 320
const TARGET_GROUND_Y = 490
const BACKDROP_CHANNEL_MAX = 64

/**
 * Walk back through the interior poses so the final-to-first transition stays adjacent.
 * Example: [1, 2, 3] becomes [1, 2, 3, 2].
 */
export function buildPingPongOrder(sourceIndices) {
  if (sourceIndices.length < 2) {
    throw new Error('Hanuman idle needs at least two source poses')
  }

  return [...sourceIndices, ...sourceIndices.slice(1, -1).toReversed()]
}

/**
 * Locate the two anchors that matter for a grounded idle:
 * - groundY: the lowest non-transparent source pixel
 * - waistX: the turquoise belt jewel, isolated from face/chest/ankle jewels by its height band
 */
export function analyzeTransparentFrame(data, width, height) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha <= 8) continue

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('Hanuman source pose is empty after background cleanup')
  }

  const subjectHeight = maxY - minY + 1
  const waistBandTop = Math.round(minY + subjectHeight * 0.45)
  const waistBandBottom = Math.round(minY + subjectHeight * 0.66)
  let waistWeight = 0
  let weightedWaistX = 0

  for (let y = waistBandTop; y <= waistBandBottom; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * width + x) * 4
      const red = data[offset]
      const green = data[offset + 1]
      const blue = data[offset + 2]
      const alpha = data[offset + 3]
      const isTurquoiseJewel =
        alpha > 16 &&
        green > 65 &&
        blue > 65 &&
        green > red * 1.12 &&
        blue > red * 1.08 &&
        Math.abs(green - blue) < 110

      if (!isTurquoiseJewel) continue
      weightedWaistX += x * alpha
      waistWeight += alpha
    }
  }

  if (waistWeight === 0) {
    throw new Error('Could not locate Hanuman waist jewel anchor')
  }

  return {
    bbox: { minX, minY, maxX, maxY },
    groundY: maxY,
    waistX: weightedWaistX / waistWeight,
  }
}

/**
 * Remove only the original black backdrop: the near-black region that reaches a cell edge.
 * Dark ink enclosed by the character (eyes, mouth, and linework) remains opaque.
 */
export function removeBorderConnectedNearBlackPixels(data, width, height) {
  const pixelCount = width * height
  const visited = new Uint8Array(pixelCount)
  const protectedInk = new Uint8Array(pixelCount)
  const pending = []
  let removedPixels = 0

  const isNearBlack = (index) => {
    const offset = index * 4
    return (
      data[offset + 3] > 8 &&
      data[offset] <= BACKDROP_CHANNEL_MAX &&
      data[offset + 1] <= BACKDROP_CHANNEL_MAX &&
      data[offset + 2] <= BACKDROP_CHANNEL_MAX
    )
  }
  const isColoredSubject = (index) => {
    const offset = index * 4
    return data[offset + 3] > 8 && !isNearBlack(index)
  }

  // The source was authored on black, so outer black ink can touch the black
  // backdrop. Preserve the original one-pixel ink boundary next to real color;
  // otherwise a backdrop flood erodes the character and creates visible cuts.
  for (let index = 0; index < pixelCount; index += 1) {
    if (!isNearBlack(index)) continue
    const x = index % width
    const y = Math.floor(index / width)
    for (let deltaY = -1; deltaY <= 1 && !protectedInk[index]; deltaY += 1) {
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        if (deltaX === 0 && deltaY === 0) continue
        const nextX = x + deltaX
        const nextY = y + deltaY
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
        if (isColoredSubject(nextY * width + nextX)) {
          protectedInk[index] = 1
          break
        }
      }
    }
  }

  const enqueue = (index) => {
    if (visited[index] || protectedInk[index] || !isNearBlack(index)) return
    visited[index] = 1
    pending.push(index)
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  while (pending.length > 0) {
    const current = pending.pop()
    if (current === undefined) continue
    data[current * 4 + 3] = 0
    removedPixels += 1
    const x = current % width
    const y = Math.floor(current / width)
    for (const [deltaX, deltaY] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nextX = x + deltaX
      const nextY = y + deltaY
      if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
      enqueue(nextY * width + nextX)
    }
  }

  return removedPixels
}

/**
 * Remove the rectangular black residue left from the source sheet's former backdrop.
 * Hanuman's intentional ink lines are thin; a large, isolated near-black component is not.
 */
export function removeLargeNearBlackBackgroundArtifacts(data, width, height) {
  const pixelCount = width * height
  const nearBlack = new Uint8Array(pixelCount)
  const visited = new Uint8Array(pixelCount)
  const components = []

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4
    nearBlack[index] = Number(
      data[offset + 3] > 8 &&
        data[offset] < 24 &&
        data[offset + 1] < 24 &&
        data[offset + 2] < 24,
    )
  }

  for (let start = 0; start < pixelCount; start += 1) {
    if (!nearBlack[start] || visited[start]) continue
    const pending = [start]
    const pixels = []
    visited[start] = 1

    while (pending.length > 0) {
      const current = pending.pop()
      if (current === undefined) continue
      pixels.push(current)
      const x = current % width
      const y = Math.floor(current / width)
      for (const [deltaX, deltaY] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nextX = x + deltaX
        const nextY = y + deltaY
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
        const next = nextY * width + nextX
        if (!nearBlack[next] || visited[next]) continue
        visited[next] = 1
        pending.push(next)
      }
    }

    if (pixels.length >= 128) components.push(pixels)
  }

  for (const component of components) {
    for (const pixel of component) data[pixel * 4 + 3] = 0
  }

  return components.length
}

async function extractStablePose(inputPath, sourceIndex, cellWidth, cellHeight) {
  const column = sourceIndex % GRID_COLUMNS
  const row = Math.floor(sourceIndex / GRID_COLUMNS)
  const { data, info } = await sharp(inputPath)
    .extract({
      left: column * cellWidth,
      top: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const removedBorderBackgroundPixels = removeBorderConnectedNearBlackPixels(
    data,
    info.width,
    info.height,
  )
  // Frames 2 and 4 are the intact source poses. Running component-size cleanup
  // here would mistake their now-preserved connected ink for a backdrop artifact.
  const removedBackgroundArtifacts = 0
  const sourceMetrics = analyzeTransparentFrame(data, info.width, info.height)
  const { minX, minY, maxX, maxY } = sourceMetrics.bbox
  const trimmedWidth = maxX - minX + 1
  const trimmedHeight = maxY - minY + 1
  const relativeWaistX = sourceMetrics.waistX - minX
  const relativeGroundY = sourceMetrics.groundY - minY
  const left = Math.round(TARGET_WAIST_X - relativeWaistX)
  const top = TARGET_GROUND_Y - relativeGroundY
  const trimmed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({ left: minX, top: minY, width: trimmedWidth, height: trimmedHeight })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()
  const frame = await sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()
  const { data: finalData, info: finalInfo } = await sharp(frame)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return {
    frame,
    metrics: analyzeTransparentFrame(finalData, finalInfo.width, finalInfo.height),
    removedBorderBackgroundPixels,
    removedBackgroundArtifacts,
    sourceIndex,
    translation: { x: left - minX, y: top - minY },
  }
}

export async function buildHanumanIdle({ inputPath, outputDir }) {
  const metadata = await sharp(inputPath).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Hanuman pipeline requires a readable source sheet')
  }

  const cellWidth = Math.floor(metadata.width / GRID_COLUMNS)
  const cellHeight = Math.floor(metadata.height / GRID_ROWS)
  // Hold each intact pose twice, then repeat the short cycle for eight preview ticks.
  const baseOrder = [...STABLE_SOURCE_POSES, ...STABLE_SOURCE_POSES]
  const order = baseOrder.flatMap((sourceIndex) => [sourceIndex, sourceIndex])
  const poses = new Map()

  for (const sourceIndex of new Set(order)) {
    poses.set(
      sourceIndex,
      await extractStablePose(inputPath, sourceIndex, cellWidth, cellHeight),
    )
  }

  await mkdir(outputDir, { recursive: true })
  const deliveredMetrics = []
  for (const [outputIndex, sourceIndex] of order.entries()) {
    const pose = poses.get(sourceIndex)
    await writeFile(path.join(outputDir, `idle-${outputIndex}.png`), pose.frame)
    deliveredMetrics.push({
      outputIndex,
      sourceIndex,
      groundY: pose.metrics.groundY,
      waistX: Number(pose.metrics.waistX.toFixed(3)),
      bbox: pose.metrics.bbox,
      translation: pose.translation,
      removedBorderBackgroundPixels: pose.removedBorderBackgroundPixels,
      removedBackgroundArtifacts: pose.removedBackgroundArtifacts,
    })
  }

  const groundValues = new Set(deliveredMetrics.map(({ groundY }) => groundY))
  const waistValues = deliveredMetrics.map(({ waistX }) => waistX)
  const waistDrift = Math.max(...waistValues) - Math.min(...waistValues)
  if (groundValues.size !== 1 || waistDrift > 0.5) {
    throw new Error(
      `Hanuman root QC failed: ground variants=${groundValues.size}, waist drift=${waistDrift}`,
    )
  }

  const report = {
    character: 'hanuman',
    source: path.relative(process.cwd(), inputPath).replaceAll('\\', '/'),
    sourceGrid: { rows: GRID_ROWS, columns: GRID_COLUMNS },
    selectedSourceFrames: STABLE_SOURCE_POSES.map((index) => index + 1),
    playbackSourceFrames: order.map((index) => index + 1),
    outputSize: [OUTPUT_WIDTH, OUTPUT_HEIGHT],
    targetAnchors: { waistX: TARGET_WAIST_X, groundY: TARGET_GROUND_Y },
    resampled: false,
    qc: {
      groundDriftPixels: 0,
      waistDriftPixels: Number(waistDrift.toFixed(3)),
      frameCount: order.length,
      passed: true,
    },
    frames: deliveredMetrics,
  }
  await writeFile(path.join(outputDir, 'qc.json'), `${JSON.stringify(report, null, 2)}\n`)

  return report
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const inputPath = path.resolve(
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-idle-source.png',
  )
  const outputDir = path.resolve(
    argumentValue('--output') ?? 'public/characters/hanuman-idle-v1',
  )
  const report = await buildHanumanIdle({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
