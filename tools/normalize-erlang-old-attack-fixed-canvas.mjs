import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rawDir = join(root, 'assets', 'raw', 'characters')
const publicDir = join(root, 'public', 'characters')

for (let index = 0; index < 18; index += 1) {
  const source = join(rawDir, `erlang-shen-attack-v1-${index}.png`)
  // Every source frame is 768x512. Apply the same fixed 640x512 crop to all frames.
  // No alpha-bound trim, per-frame scale, or automatic re-anchoring is allowed.
  const frame = await sharp(source)
    .extract({ left: 64, top: 0, width: 640, height: 512 })
    .png()
    .toBuffer()
  await sharp(frame).toFile(source)
  await sharp(frame)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(publicDir, `erlang-shen-attack-v1-${index}.webp`))
}
