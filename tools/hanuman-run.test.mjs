import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import sharp from 'sharp'

const repoRoot = process.cwd()
const outputDir = path.join(repoRoot, 'public', 'characters', 'hanuman-run-erlang-12-v5')

describe('Hanuman Erlang-style run asset', () => {
  test('ships all 12 frames on a shared 640px canvas with no output clipping', async () => {
    const metadata = JSON.parse(
      await readFile(path.join(outputDir, 'pipeline-meta.json'), 'utf8'),
    )

    expect(metadata.rows).toBe(3)
    expect(metadata.cols).toBe(4)
    expect(metadata.frames).toHaveLength(12)
    expect(metadata.qc_summary.frame_count).toBe(12)
    expect(metadata.qc_summary.valid_frame_count).toBe(12)
    expect(metadata.qc_summary.empty_count).toBe(0)
    expect(metadata.qc_summary.body_scale_cv).toBeLessThanOrEqual(0.08)
    expect(metadata.qc_summary.anchor_y_std).toBeLessThanOrEqual(0.06)
    expect(metadata.qc_summary.paste_clamped_count).toBe(0)
    expect(metadata.output_edge_touch_frames ?? []).toHaveLength(0)

    for (let index = 1; index <= 12; index += 1) {
      const file = path.join(outputDir, `run-${index}.png`)
      const image = sharp(file)
      const info = await image.metadata()
      expect(info.width).toBe(640)
      expect(info.height).toBe(640)
      expect(info.hasAlpha).toBe(true)
    }
  })

  test('uses the Erlang 12-frame cadence and the shared feet anchor', async () => {
    const metadata = JSON.parse(
      await readFile(path.join(outputDir, 'pipeline-meta.json'), 'utf8'),
    )

    expect(metadata.duration).toBe(137)
    expect(metadata.frames.every(({ anchor_target: [x, y] }) => x === 320 && y === 570)).toBe(true)
    expect(metadata.frame_labels).toEqual(
      Array.from({ length: 12 }, (_, index) => `run-${index + 1}`),
    )
  })

  test('previews one run frame at a time and preloads all 12 without crossfade', async () => {
    const html = await readFile(path.join(repoRoot, 'public', '_preview-hanuman-run.html'), 'utf8')

    expect(html.match(/id="hanuman-run-stage"/g)).toHaveLength(1)
    expect(html).not.toMatch(/transition\s*:\s*opacity/i)
    expect(html).not.toMatch(/crossfade/i)
    expect(html).toMatch(/Array\.from\(\{\s*length:\s*12\s*\}/)
    expect(html).toMatch(/Promise\.all\(frameUrls\.map\(preloadFrame\)\)/)
    expect(html).toMatch(/await image\.decode\(\)/)
    expect(html).toMatch(/hanuman-run-erlang-12-v5\/run-1\.png\?v=erlang12-v5/)
    expect(html).toMatch(/แกน Y = 587/)
  })
})
