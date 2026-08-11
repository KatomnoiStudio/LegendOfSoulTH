import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import sharp from 'sharp'
import {
  analyzeTransparentFrame,
  buildPingPongOrder,
  removeBorderConnectedNearBlackPixels,
} from './hanuman-idle.mjs'

const repoRoot = process.cwd()
const outputDir = path.join(repoRoot, 'public', 'characters', 'hanuman-idle-v1')
const holefreeOutputDir = path.join(
  repoRoot,
  'public',
  'characters',
  'hanuman-idle-holefree-v2',
)

describe('Hanuman idle asset pipeline', () => {
  test('removes only the black backdrop connected to a cell edge and preserves an enclosed eye detail', () => {
    const width = 12
    const height = 12
    const data = Buffer.alloc(width * height * 4)

    for (let index = 0; index < width * height; index += 1) {
      data[index * 4 + 3] = 255
    }
    for (let y = 3; y <= 8; y += 1) {
      for (let x = 3; x <= 8; x += 1) {
        const offset = (y * width + x) * 4
        data[offset] = 240
        data[offset + 1] = 220
        data[offset + 2] = 180
      }
    }
    const eyeOffset = (5 * width + 5) * 4
    data[eyeOffset] = 46
    data[eyeOffset + 1] = 45
    data[eyeOffset + 2] = 45
    const gridOffset = 6 * 4
    data[gridOffset] = 46
    data[gridOffset + 1] = 45
    data[gridOffset + 2] = 45

    removeBorderConnectedNearBlackPixels(data, width, height)

    expect(data[3]).toBe(0)
    expect(data[gridOffset + 3]).toBe(0)
    expect(data[eyeOffset + 3]).toBe(255)
    expect(data.slice(eyeOffset, eyeOffset + 3)).toEqual(Buffer.from([46, 45, 45]))
  })

  test('preserves original dark outline pixels that touch the colored character', () => {
    const width = 9
    const height = 9
    const data = Buffer.alloc(width * height * 4)

    for (let index = 0; index < width * height; index += 1) {
      data[index * 4 + 3] = 255
    }
    for (let y = 3; y <= 5; y += 1) {
      for (let x = 3; x <= 5; x += 1) {
        const offset = (y * width + x) * 4
        data[offset] = 238
        data[offset + 1] = 214
        data[offset + 2] = 172
      }
    }
    const outlineOffset = (4 * width + 2) * 4

    removeBorderConnectedNearBlackPixels(data, width, height)

    expect(data[3]).toBe(0)
    expect(data[outlineOffset + 3]).toBe(255)
    expect(data.slice(outlineOffset, outlineOffset + 3)).toEqual(Buffer.from([0, 0, 0]))
  })

  test('uses the three most consistent top-row poses as a seamless ping-pong loop', () => {
    expect(buildPingPongOrder([1, 2, 3])).toEqual([1, 2, 3, 2])
  })

  test('keeps the waist root and ground line fixed while replaying only clean source poses', async () => {
    const frames = await Promise.all(
      Array.from({ length: 8 }, async (_, index) => {
        const file = path.join(outputDir, `idle-${index}.png`)
        const { data, info } = await sharp(file)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })

        return {
          data,
          hash: createHash('sha256').update(data).digest('hex'),
          info,
          metrics: analyzeTransparentFrame(data, info.width, info.height),
        }
      }),
    )

    expect(frames.every(({ info }) => info.width === 640 && info.height === 512)).toBe(true)
    expect(new Set(frames.map(({ metrics }) => metrics.groundY)).size).toBe(1)
    expect(
      frames.some(({ data, info }) => {
        for (let x = 0; x < info.width; x += 1) {
          const topAlpha = data[(x * 4) + 3]
          const bottomAlpha = data[((info.height - 1) * info.width + x) * 4 + 3]
          if (topAlpha > 8 || bottomAlpha > 8) return true
        }
        for (let y = 0; y < info.height; y += 1) {
          const leftAlpha = data[(y * info.width) * 4 + 3]
          const rightAlpha = data[(y * info.width + info.width - 1) * 4 + 3]
          if (leftAlpha > 8 || rightAlpha > 8) return true
        }
        return false
      }),
    ).toBe(false)

    const waistXs = frames.map(({ metrics }) => metrics.waistX)
    expect(Math.max(...waistXs) - Math.min(...waistXs)).toBeLessThanOrEqual(0.5)

    // Each clean source pose is held for two ticks, then the short cycle repeats.
    expect(frames[0].hash).toBe(frames[1].hash)
    expect(frames[2].hash).toBe(frames[3].hash)
    expect(frames[4].hash).toBe(frames[5].hash)
    expect(frames[6].hash).toBe(frames[7].hash)
    expect(frames[0].hash).toBe(frames[4].hash)
    expect(frames[2].hash).toBe(frames[6].hash)
    expect(new Set(frames.map(({ hash }) => hash)).size).toBe(2)

    const qc = JSON.parse(await readFile(path.join(outputDir, 'qc.json'), 'utf8'))
    expect(qc.playbackSourceFrames).toEqual([2, 2, 4, 4, 2, 2, 4, 4])
    expect(qc.frames.every(({ removedBackgroundArtifacts }) => removedBackgroundArtifacts === 0)).toBe(
      true,
    )
  })

  test('previews one animation image at a time, so adjacent poses can never crossfade', async () => {
    const html = await readFile(
      path.join(repoRoot, 'public', '_preview-hanuman-idle.html'),
      'utf8',
    )

    expect(html.match(/id="hanuman-idle-stage"/g)).toHaveLength(1)
    expect(html).not.toMatch(/transition\s*:\s*opacity/i)
    expect(html).not.toMatch(/crossfade/i)
    expect(html).toMatch(/Promise\.all\(frameUrls\.map\(preloadFrame\)\)/)
    expect(html).toMatch(/await image\.decode\(\)/)
  })

  test('cache-busts regenerated frames so the preview cannot display the damaged alpha set', async () => {
    const html = await readFile(
      path.join(repoRoot, 'public', '_preview-hanuman-idle.html'),
      'utf8',
    )

    expect(html).toMatch(/characters\/hanuman-idle-holefree-v2\/idle-1\.png\?v=holefree-v2/)
  })

  test('ships four complete V2 poses on one square canvas with idle-grade ground stability', async () => {
    const frames = await Promise.all(
      Array.from({ length: 4 }, async (_, index) => {
        const file = path.join(holefreeOutputDir, `idle-${index + 1}.png`)
        const { data, info } = await sharp(file)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        return { info, metrics: analyzeTransparentFrame(data, info.width, info.height) }
      }),
    )

    expect(frames.every(({ info }) => info.width === 640 && info.height === 640)).toBe(true)
    const groundYs = frames.map(({ metrics }) => metrics.groundY)
    expect(Math.max(...groundYs) - Math.min(...groundYs)).toBeLessThanOrEqual(1)
    expect(
      frames.every(({ metrics }) => {
        const { minX, minY, maxX, maxY } = metrics.bbox
        return minX > 0 && minY > 0 && maxX < 639 && maxY < 639
      }),
    ).toBe(true)
  })

  test('previews V2 on its matching square canvas and honest feet guide', async () => {
    const html = await readFile(
      path.join(repoRoot, 'public', '_preview-hanuman-idle.html'),
      'utf8',
    )

    expect(html).toMatch(/aspect-ratio:\s*1\s*\/\s*1/)
    expect(html).toMatch(/แกน Y = 587/)
    expect(html).toMatch(/Root drift: Y ≤ 1px/)
  })

  test('shows transparent frames over a light checkerboard instead of a black backdrop', async () => {
    const html = await readFile(
      path.join(repoRoot, 'public', '_preview-hanuman-idle.html'),
      'utf8',
    )

    expect(html).toMatch(/repeating-conic-gradient\(/)
    expect(html).toMatch(/#eaf4f0/)
    expect(html).toMatch(/#cde4dc/)
  })

  test('draws a visible Y-axis at the feet line without a black preview-frame shadow', async () => {
    const html = await readFile(
      path.join(repoRoot, 'public', '_preview-hanuman-idle.html'),
      'utf8',
    )

    expect(html).toMatch(/class="y-axis"/)
    expect(html).toMatch(/แกน Y = 587/)
    expect(html).not.toMatch(/box-shadow:\s*0 24px 70px rgb\(0 0 0/)
  })

  test('uses clean source poses without destructive post-removal of dark character pixels', async () => {
    const qc = JSON.parse(await readFile(path.join(outputDir, 'qc.json'), 'utf8'))

    expect(qc.selectedSourceFrames).toEqual([2, 4])
    expect(qc.frames.every(({ removedBackgroundArtifacts }) => removedBackgroundArtifacts === 0)).toBe(
      true,
    )
  })
})
