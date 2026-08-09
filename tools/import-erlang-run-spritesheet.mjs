/**
 * Imports the supplied 5x5 Erlang run sheet without re-centering individual frames.
 *
 * Operator: HetCreep
 * Agent: Codex / imported Erlang run integration
 * Created: 2026-08-08T10:20:00+07:00
 */
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const SOURCE_SHEET = join(WALK_DIR, 'spear-warrior-erlang-run-25-sheet-alpha.png')
const COLUMNS = 5
const ROWS = 5
const CELL_SIZE = 256
const SOURCE_SCALE_SIZE = 896
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const FRAME_TOP = 16
const CROP_LEFT = 128
const CROP_TOP = 150

async function main() {
  const metadata = await sharp(SOURCE_SHEET).metadata()
  if (metadata.width !== COLUMNS * CELL_SIZE || metadata.height !== ROWS * CELL_SIZE) {
    throw new Error('Unexpected Erlang run sheet dimensions')
  }

  for (let index = 0; index < COLUMNS * ROWS; index += 1) {
    const column = index % COLUMNS
    const row = Math.floor(index / COLUMNS)
    const cell = await sharp(SOURCE_SHEET)
      .extract({ left: column * CELL_SIZE, top: row * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE })
      .resize({ width: SOURCE_SCALE_SIZE, height: SOURCE_SCALE_SIZE, kernel: sharp.kernel.lanczos3 })
      .extract({ left: CROP_LEFT, top: CROP_TOP, width: CANVAS_WIDTH, height: CANVAS_HEIGHT - FRAME_TOP })
      .png()
      .toBuffer()
    await sharp({
      create: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: cell, left: 0, top: FRAME_TOP }])
      .png()
      .toFile(join(WALK_DIR, `spear-warrior-run-right-${index}.png`))
  }
}

await main()
