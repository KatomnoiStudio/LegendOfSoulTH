import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sheetPath = join(root, 'tmp', 'erlang-attack-fixed-grid-alpha.png')
const rawDir = join(root, 'assets', 'raw', 'characters')
const publicDir = join(root, 'public', 'characters')
const cellSize = 512
// Match the accepted Attack 1 / Attack 3 standing-equivalent model height.
// This is one shared whole-cell scale for all eight frames, never a per-frame trim.
const modelScale = 526 / cellSize
const displayCellSize = Math.round(cellSize * modelScale)
const runtimeWidth = 640

async function removeMagentaResidue(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    const alpha = data[offset + 3]
    if (alpha === 0 || (red > 180 && green < 100 && blue > 150)) {
      data[offset] = 0
      data[offset + 1] = 0
      data[offset + 2] = 0
      data[offset + 3] = 0
    }
  }
  return sharp(data, { raw: info }).png().toBuffer()
}

// Fixed-grid contract: resize the complete 2x4 sheet once, then cut eight exact
// 512x512 cells. Every complete cell then receives one shared model scale and one
// row-wide baseline offset. Never trim, crop to alpha bounds, scale, or re-anchor
// individual frames.
const fixedSheet = await sharp(sheetPath)
  .ensureAlpha()
  .resize(4 * cellSize, 2 * cellSize, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer()

for (let index = 0; index < 8; index += 1) {
  const column = index % 4
  const row = Math.floor(index / 4)
  const cell = await sharp(fixedSheet)
    .extract({
      left: column * cellSize,
      top: row * cellSize,
      width: cellSize,
      height: cellSize,
    })
    .resize(displayCellSize, displayCellSize, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer()
  const rowOffset = row === 0 ? 1 : 78
  const paddedFrame = await sharp({
    create: {
      width: runtimeWidth,
      height: cellSize + displayCellSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: cell, left: Math.round((runtimeWidth - displayCellSize) / 2), top: rowOffset },
    ])
    .png()
    .toBuffer()
  const runtimeFrame = await sharp(paddedFrame)
    .extract({ left: 0, top: 0, width: runtimeWidth, height: cellSize })
    .png()
    .toBuffer()
  const cleanedFrame = await removeMagentaResidue(runtimeFrame)
  const name = `erlang-shen-normal-attack-v2-${index}`
  await sharp(cleanedFrame).toFile(join(rawDir, `${name}.png`))
  await sharp(cleanedFrame)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(publicDir, `${name}.webp`))
}
