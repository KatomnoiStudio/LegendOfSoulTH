/**
 * Prepares the Codex-created Erlang Shen V3 source assets for the runtime canvas.
 *
 * Operator: HetCreep
 * Agent: Codex / Erlang Shen V3 runtime integration
 * Created: 2026-08-08T11:33:00+07:00
 */
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHARACTER_DIR = join(ROOT, 'assets', 'raw', 'characters')
const WALK_DIR = join(CHARACTER_DIR, 'walk')
const RUN_SOURCE_DIR = join(CHARACTER_DIR, 'exports', 'erlang-shen-run-v3', 'run_right', 'frames')
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const RUN_RENDER_SIZE = 408
const RUN_OFFSET = (CANVAS_WIDTH - RUN_RENDER_SIZE) / 2

async function transparentCanvas() {
  return sharp({ create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
}

async function main() {
  for (let index = 0; index < 25; index += 1) {
    const source = join(RUN_SOURCE_DIR, `${String(index + 1).padStart(4, '0')}.png`)
    const frame = await sharp(source).ensureAlpha().resize(RUN_RENDER_SIZE, RUN_RENDER_SIZE, { kernel: sharp.kernel.lanczos3 }).png().toBuffer()
    await (await transparentCanvas()).composite([{ input: frame, left: RUN_OFFSET, top: 16 }]).png().toFile(join(WALK_DIR, `erlang-shen-v3-run-right-${index}.png`))
  }
}

await main()
