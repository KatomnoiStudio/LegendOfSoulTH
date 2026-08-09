/**
 * Packages individually rendered Erlang Shen run frames in the AutoSprite ZIP layout.
 *
 * Operator: HetCreep
 * Agent: Codex / Erlang Shen pose-matched run package
 * Created: 2026-08-08T11:18:00+07:00
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT = join(ROOT, 'assets', 'raw', 'characters', 'generated', 'erlang-shen-run-v3', 'alpha')
const OUTPUT = join(ROOT, 'assets', 'raw', 'characters', 'exports', 'erlang-shen-run-v3', 'run_right')
const FRAME_SIZE = 256
const SAFE_CONTENT_SIZE = 240
const FRAME_PADDING = (FRAME_SIZE - SAFE_CONTENT_SIZE) / 2
const FRAME_COUNT = 25
const COLUMNS = 5

const atlas = {
  frames: Object.fromEntries(Array.from({ length: FRAME_COUNT }, (_, index) => [String(index), {
    x: (index % COLUMNS) * FRAME_SIZE,
    y: Math.floor(index / COLUMNS) * FRAME_SIZE,
    w: FRAME_SIZE,
    h: FRAME_SIZE,
    duration: 1,
  }])),
  meta: {
    size: { w: 1280, h: 1280 },
    frame_size: { w: FRAME_SIZE, h: FRAME_SIZE },
    background_mode: 'toonout_tensordock',
    duration_s: 2.042,
  },
}

async function main() {
  await rm(join(ROOT, 'assets', 'raw', 'characters', 'exports', 'erlang-shen-run-v3'), { recursive: true, force: true })
  await mkdir(join(OUTPUT, 'frames'), { recursive: true })

  const composites = []
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const name = `${String(index + 1).padStart(4, '0')}.png`
    const frame = await sharp(join(INPUT, name))
      .ensureAlpha()
      .resize(SAFE_CONTENT_SIZE, SAFE_CONTENT_SIZE, { kernel: sharp.kernel.lanczos3 })
      .extend({ top: FRAME_PADDING, bottom: FRAME_PADDING, left: FRAME_PADDING, right: FRAME_PADDING, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    await sharp(frame).toFile(join(OUTPUT, 'frames', name))
    composites.push({ input: frame, left: (index % COLUMNS) * FRAME_SIZE, top: Math.floor(index / COLUMNS) * FRAME_SIZE })
  }

  await sharp({
    create: { width: 1280, height: 1280, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites).png().toFile(join(OUTPUT, 'spritesheet.png'))
  await writeFile(join(OUTPUT, 'atlas.json'), `${JSON.stringify(atlas, null, 2)}\n`)
}

await main()
