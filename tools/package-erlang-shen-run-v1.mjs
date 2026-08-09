/**
 * Packages the Codex-created Erlang Shen run sheet into the AutoSprite-compatible layout.
 *
 * Operator: HetCreep
 * Agent: Codex / Erlang Shen run package
 * Created: 2026-08-08T10:52:00+07:00
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'assets', 'raw', 'characters', 'erlang-shen-run-v1-alpha.png')
const OUTPUT = join(ROOT, 'assets', 'raw', 'characters', 'exports', 'erlang-shen-run-v1', 'run_right')
const FRAME_SIZE = 256
const COLUMNS = 5
const ROWS = 5

const atlas = {
  frames: Object.fromEntries(
    Array.from({ length: COLUMNS * ROWS }, (_, index) => [String(index), {
      x: (index % COLUMNS) * FRAME_SIZE,
      y: Math.floor(index / COLUMNS) * FRAME_SIZE,
      w: FRAME_SIZE,
      h: FRAME_SIZE,
      duration: 1,
    }]),
  ),
  meta: {
    size: { w: COLUMNS * FRAME_SIZE, h: ROWS * FRAME_SIZE },
    frame_size: { w: FRAME_SIZE, h: FRAME_SIZE },
    background_mode: 'toonout_tensordock',
    duration_s: 2.042,
  },
}

async function main() {
  await rm(join(ROOT, 'assets', 'raw', 'characters', 'exports', 'erlang-shen-run-v1'), { recursive: true, force: true })
  await mkdir(join(OUTPUT, 'frames'), { recursive: true })

  const sheet = sharp(SOURCE).ensureAlpha()
  const metadata = await sheet.metadata()
  if (metadata.width !== metadata.height) {
    throw new Error('Expected a square source spritesheet')
  }

  await sheet.resize(COLUMNS * FRAME_SIZE, ROWS * FRAME_SIZE, { kernel: sharp.kernel.lanczos3 }).png().toFile(join(OUTPUT, 'spritesheet.png'))
  for (let index = 0; index < COLUMNS * ROWS; index += 1) {
    await sharp(SOURCE)
      .resize(COLUMNS * FRAME_SIZE, ROWS * FRAME_SIZE, { kernel: sharp.kernel.lanczos3 })
      .extract({
        left: (index % COLUMNS) * FRAME_SIZE,
        top: Math.floor(index / COLUMNS) * FRAME_SIZE,
        width: FRAME_SIZE,
        height: FRAME_SIZE,
      })
      .png()
      .toFile(join(OUTPUT, 'frames', `${String(index + 1).padStart(4, '0')}.png`))
  }
  await writeFile(join(OUTPUT, 'atlas.json'), `${JSON.stringify(atlas, null, 2)}\n`)
}

await main()
