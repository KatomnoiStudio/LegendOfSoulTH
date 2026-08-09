import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = join(ROOT, 'assets', 'raw', 'characters', 'generated', 'erlang-shen-idle-v4', 'alpha')
const OUTPUT_DIR = join(ROOT, 'assets', 'raw', 'characters')
const FRAME_COUNT = 25
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 512
const RENDER_HEIGHT = 408

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const { data, info } = await sharp(join(SOURCE_DIR, `${String(index + 1).padStart(4, '0')}.png`)).ensureAlpha().resize({ height: RENDER_HEIGHT, kernel: sharp.kernel.lanczos3 }).png().toBuffer({ resolveWithObject: true })
    await sharp({ create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: data, left: Math.floor((CANVAS_WIDTH - info.width) / 2), top: CANVAS_HEIGHT - RENDER_HEIGHT }])
      .png()
      .toFile(join(OUTPUT_DIR, `erlang-shen-v3-idle-${index}.png`))
  }
}

await main()
