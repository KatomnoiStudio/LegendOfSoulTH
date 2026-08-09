import { join, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'assets', 'raw', 'characters', 'turnaround')
const WIDTH = 640
const HEIGHT = 512
const CHANNELS = 4

function blend(first, second, progress) {
  const output = Buffer.allocUnsafe(first.length)
  for (let offset = 0; offset < first.length; offset += CHANNELS) {
    const a = first[offset + 3] / 255
    const b = second[offset + 3] / 255
    const alpha = a + (b - a) * progress
    for (let channel = 0; channel < 3; channel += 1) {
      output[offset + channel] = alpha === 0 ? 0 : Math.round(((first[offset + channel] * a) + ((second[offset + channel] * b - first[offset + channel] * a) * progress)) / alpha)
    }
    output[offset + 3] = Math.round(alpha * 255)
  }
  return output
}

const keys = await Promise.all(Array.from({ length: 4 }, async (_, index) => {
  const { data } = await sharp(join(DIR, `spear-warrior-stop-turn-key-${index}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return data
}))

for (let index = 0; index < 24; index += 1) {
  const position = index / 23 * 3
  const first = Math.floor(position)
  const second = Math.min(3, first + 1)
  const frame = blend(keys[first], keys[second], position - first)
  await sharp(frame, { raw: { width: WIDTH, height: HEIGHT, channels: CHANNELS } }).png().toFile(join(DIR, `spear-warrior-stop-turn-${index}.png`))
}
