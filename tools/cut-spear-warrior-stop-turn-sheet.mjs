import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'assets', 'raw', 'characters', 'turnaround')
const SOURCE = join(OUT, 'spear-warrior-stop-turn-alpha.png')
const WIDTH = 640
const HEIGHT = 512
const BASELINE = 475

async function main() {
  await mkdir(OUT, { recursive: true })
  const image = sharp(SOURCE)
  const meta = await image.metadata()
  if (!meta.width || !meta.height) throw new Error('Turn sheet has no dimensions')
  for (let index = 0; index < 4; index += 1) {
    const column = index % 2
    const row = Math.floor(index / 2)
    const crop = image.clone().extract({
      left: Math.round((column * meta.width) / 2),
      top: Math.round((row * meta.height) / 2),
      width: Math.round(((column + 1) * meta.width) / 2) - Math.round((column * meta.width) / 2),
      height: Math.round(((row + 1) * meta.height) / 2) - Math.round((row * meta.height) / 2),
    })
    const { data, info } = await crop.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let left = info.width
    let top = info.height
    let right = -1
    let bottom = -1
    for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] <= 4) continue
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y)
    }
    if (right < left || bottom < top) throw new Error(`Turn frame ${index} has no visible pixels`)
    const content = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize({ width: 331, height: 252, fit: 'inside' })
      .png().toBuffer()
    const contentMeta = await sharp(content).metadata()
    await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: content, left: Math.round((WIDTH - contentMeta.width) / 2), top: BASELINE - contentMeta.height }])
      .png()
      .toFile(join(OUT, `spear-warrior-stop-turn-key-${index}.png`))
  }
}

await main()
