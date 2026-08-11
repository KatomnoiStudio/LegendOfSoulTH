import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const FRAME_CELL = 256
const OUTPUT_SIZE = 640
// Same anchor convention as the accepted Hanuman Idle V2 pipeline (tools/hanuman-idle.mjs)
// so every animation drops into the same rig position without a visual pop.
const TARGET_ANCHOR_X = 320
const TARGET_ANCHOR_Y = 570
const ALPHA_THRESHOLD = 8
const MIN_COMPONENT_AREA = 64

export function findBoundingBox(data, width, height) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha <= ALPHA_THRESHOLD) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error('Hanuman sprite frame is empty after alpha trim')
  }

  return { minX, minY, maxX, maxY }
}

/** Drop small stray-alpha specks (antialiasing dust) that would otherwise skew the bbox. */
export function stripSmallAlphaComponents(data, width, height) {
  const pixelCount = width * height
  const isOpaque = new Uint8Array(pixelCount)
  for (let index = 0; index < pixelCount; index += 1) {
    isOpaque[index] = data[index * 4 + 3] > ALPHA_THRESHOLD ? 1 : 0
  }

  const visited = new Uint8Array(pixelCount)
  for (let start = 0; start < pixelCount; start += 1) {
    if (!isOpaque[start] || visited[start]) continue
    const pending = [start]
    const pixels = []
    visited[start] = 1
    while (pending.length > 0) {
      const current = pending.pop()
      pixels.push(current)
      const x = current % width
      const y = Math.floor(current / width)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const next = ny * width + nx
        if (!isOpaque[next] || visited[next]) continue
        visited[next] = 1
        pending.push(next)
      }
    }
    if (pixels.length < MIN_COMPONENT_AREA) {
      for (const pixel of pixels) data[pixel * 4 + 3] = 0
    }
  }
}

async function extractFrame(inputPath, frameIndex, columns) {
  const column = frameIndex % columns
  const row = Math.floor(frameIndex / columns)
  const { data, info } = await sharp(inputPath)
    .extract({ left: column * FRAME_CELL, top: row * FRAME_CELL, width: FRAME_CELL, height: FRAME_CELL })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  stripSmallAlphaComponents(data, info.width, info.height)
  const bbox = findBoundingBox(data, info.width, info.height)
  const trimmedWidth = bbox.maxX - bbox.minX + 1
  const trimmedHeight = bbox.maxY - bbox.minY + 1

  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: bbox.minX, top: bbox.minY, width: trimmedWidth, height: trimmedHeight })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()

  // Center on the feet band, not the full bbox: a held weapon (or a swinging arm)
  // skews the silhouette's horizontal midpoint away from the body, differently
  // per frame. Feet position is what the eye actually anchors to.
  const feetBandTop = bbox.minY + Math.round((bbox.maxY - bbox.minY) * 0.85)
  let feetWeight = 0
  let feetWeightedX = 0
  for (let y = feetBandTop; y <= bbox.maxY; y += 1) {
    for (let x = bbox.minX; x <= bbox.maxX; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3]
      if (alpha <= ALPHA_THRESHOLD) continue
      feetWeightedX += x * alpha
      feetWeight += alpha
    }
  }
  const centerX = feetWeight > 0 ? feetWeightedX / feetWeight : bbox.minX + trimmedWidth / 2
  const left = Math.round(TARGET_ANCHOR_X - centerX)
  const top = TARGET_ANCHOR_Y - bbox.maxY

  const frame = await sharp({
    create: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()

  const { data: finalData, info: finalInfo } = await sharp(frame).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const finalBbox = findBoundingBox(finalData, finalInfo.width, finalInfo.height)
  const outputEdgeTouch =
    finalBbox.minX <= 0 || finalBbox.minY <= 0 || finalBbox.maxX >= OUTPUT_SIZE - 1 || finalBbox.maxY >= OUTPUT_SIZE - 1
  const sourceEdgeTouch =
    bbox.minX <= 0 || bbox.minY <= 0 || bbox.maxX >= FRAME_CELL - 1 || bbox.maxY >= FRAME_CELL - 1

  // `left` was solved so the feet-band anchor lands exactly on TARGET_ANCHOR_X;
  // report that placement (not the weapon/arm-swayed full bbox) as the QC signal.
  const feetAnchorX = centerX + left

  return {
    frame,
    frameIndex,
    groundY: finalBbox.maxY,
    centerX: feetAnchorX,
    bodyHeight: finalBbox.maxY - finalBbox.minY + 1,
    sourceEdgeTouch,
    outputEdgeTouch,
  }
}

/**
 * Shared extractor for every Hanuman AutoSprite animation sheet (attack, walk, ...).
 * Sheets are always laid out as a square grid of FRAME_CELL-px cells; frames are
 * trimmed, feet-anchored to the shared rig anchor, and written as 640x640 PNGs.
 *
 * groundDriftTolerance/centerDriftTolerance are looser for animations with real
 * footwork (attack, walk) than tools/hanuman-idle.mjs's gentle-breathing cycle.
 */
export async function buildHanumanCycle({
  inputPath,
  outputDir,
  animationName,
  framePrefix,
  frameCount = 8,
  columns = 3,
  groundDriftTolerance = 16,
  centerDriftTolerance = 2,
  heightCvTolerance = 0.08,
}) {
  await mkdir(outputDir, { recursive: true })
  const results = []
  for (let index = 0; index < frameCount; index += 1) {
    results.push(await extractFrame(inputPath, index, columns))
  }

  for (const result of results) {
    await writeFile(path.join(outputDir, `${framePrefix}-${result.frameIndex}.png`), result.frame)
  }

  const groundValues = results.map((r) => r.groundY)
  const groundDrift = Math.max(...groundValues) - Math.min(...groundValues)
  const centerValues = results.map((r) => r.centerX)
  const centerDrift = Math.max(...centerValues) - Math.min(...centerValues)
  const heights = results.map((r) => r.bodyHeight)
  const heightMean = heights.reduce((a, b) => a + b, 0) / heights.length
  const heightCv =
    Math.sqrt(heights.reduce((sum, h) => sum + (h - heightMean) ** 2, 0) / heights.length) / heightMean

  const report = {
    character: 'hanuman',
    animation: animationName,
    source: path.relative(process.cwd(), inputPath).replaceAll('\\', '/'),
    frameCount,
    outputSize: [OUTPUT_SIZE, OUTPUT_SIZE],
    targetAnchor: { x: TARGET_ANCHOR_X, y: TARGET_ANCHOR_Y },
    qc: {
      groundDriftPixels: Number(groundDrift.toFixed(3)),
      centerDriftPixels: Number(centerDrift.toFixed(3)),
      bodyHeightCv: Number(heightCv.toFixed(6)),
      sourceEdgeTouchFrames: results.filter((r) => r.sourceEdgeTouch).map((r) => r.frameIndex),
      outputEdgeTouchFrames: results.filter((r) => r.outputEdgeTouch).map((r) => r.frameIndex),
    },
    frames: results.map(({ frame: _frame, ...rest }) => rest),
  }

  const passed =
    groundDrift <= groundDriftTolerance &&
    centerDrift <= centerDriftTolerance &&
    heightCv <= heightCvTolerance &&
    report.qc.outputEdgeTouchFrames.length === 0
  report.qc.passed = passed

  await writeFile(path.join(outputDir, 'qc.json'), `${JSON.stringify(report, null, 2)}\n`)
  if (!passed) {
    throw new Error(`Hanuman ${animationName} QC failed: ${JSON.stringify(report.qc)}`)
  }
  return report
}
