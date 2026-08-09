/**
 * Locks Erlang Shen V6's torso and lower body while retaining upper secondary motion.
 *
 * Operator: HetCreep
 * Agent: Codex / Erlang Shen V6 idle composition
 * Created: 2026-08-08T13:50:00+07:00
 */
import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT_DIR = join(ROOT, 'assets', 'raw', 'characters', 'generated', 'erlang-shen-idle-v6')
const SOURCE_DIR = join(ROOT_DIR, 'normalised')
const FRAME_DIR = join(ROOT_DIR, 'frames')
const FRAME_COUNT = 25
const FRAME_WIDTH = 640
const FRAME_HEIGHT = 512
const MOTION_HEIGHT = 300
const SHEET_COLUMNS = 5
const SHEET_ROWS = 5

async function main() {
  const baseline = await sharp(join(SOURCE_DIR, '0001.png')).png().toBuffer()
  const tiles = []

  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const name = `${String(index + 1).padStart(4, '0')}.png`
    const upperMotion = await sharp(join(SOURCE_DIR, name))
      .extract({ left: 0, top: 0, width: FRAME_WIDTH, height: MOTION_HEIGHT })
      .png()
      .toBuffer()
    const output = join(FRAME_DIR, name)
    await sharp(baseline).composite([{ input: upperMotion, left: 0, top: 0 }]).png().toFile(output)
    tiles.push({ input: output, left: (index % SHEET_COLUMNS) * FRAME_WIDTH, top: Math.floor(index / SHEET_COLUMNS) * FRAME_HEIGHT })
  }

  await sharp({
    create: {
      width: SHEET_COLUMNS * FRAME_WIDTH,
      height: SHEET_ROWS * FRAME_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(tiles)
    .png()
    .toFile(join(ROOT_DIR, 'erlang-shen-idle-v6-sheet.png'))
}

await main()
