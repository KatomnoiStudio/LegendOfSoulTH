import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const input = join(root, 'assets', 'raw', 'characters', 'erlang-shen-normal-attack-v3-sheet.png')
const rawDir = join(root, 'assets', 'raw', 'characters')
const publicDir = join(root, 'public', 'characters')
const deliveryPrefix = 'erlang-shen-normal-attack-v3-final'
const columns = 4
const rows = 2
const sourceCellWidth = 512
const sourceCellHeight = 512
const outputCellWidth = 640
const outputCellHeight = 512
const scaledCellWidth = 574
const scaledCellHeight = 574

// Fixed-grid contract: normalize the complete source sheet once, then slice exact
// 512x512 source cells. Never inspect alpha bounds, trim, crop, scale, or re-anchor
// an individual character. Every complete source cell receives the same transform.
const normalizedSheet = await sharp(input)
  .resize(columns * sourceCellWidth, rows * sourceCellHeight, {
    fit: 'fill',
    kernel: sharp.kernel.lanczos3,
  })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const rgba = Buffer.alloc(normalizedSheet.info.width * normalizedSheet.info.height * 4)
for (let source = 0, target = 0; source < normalizedSheet.data.length; source += 3, target += 4) {
  const red = normalizedSheet.data[source]
  const green = normalizedSheet.data[source + 1]
  const blue = normalizedSheet.data[source + 2]
  const isMagenta = red > 100 && blue > 100 && red > green * 1.1 && blue > green * 1.1
  rgba[target] = isMagenta ? 0 : red
  rgba[target + 1] = isMagenta ? 0 : green
  rgba[target + 2] = isMagenta ? 0 : blue
  rgba[target + 3] = isMagenta ? 0 : 255
}

const transparentSheet = await sharp(rgba, {
  raw: { width: normalizedSheet.info.width, height: normalizedSheet.info.height, channels: 4 },
}).png().toBuffer()

const frames = []
for (let index = 0; index < columns * rows; index += 1) {
  const column = index % columns
  const row = Math.floor(index / columns)
  const resizedCell = await sharp(transparentSheet)
    .extract({
      left: column * sourceCellWidth,
      top: row * sourceCellHeight,
      width: sourceCellWidth,
      height: sourceCellHeight,
    })
    .resize(scaledCellWidth, scaledCellHeight, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer()
  for (let pixel = 0; pixel < resizedCell.length; pixel += 4) {
    const red = resizedCell[pixel]
    const green = resizedCell[pixel + 1]
    const blue = resizedCell[pixel + 2]
    if (red > 100 && blue > 100 && red > green * 1.1 && blue > green * 1.1) {
      resizedCell[pixel] = 0
      resizedCell[pixel + 1] = 0
      resizedCell[pixel + 2] = 0
      resizedCell[pixel + 3] = 0
    } else if (resizedCell[pixel + 3] === 0) {
      resizedCell[pixel] = 0
      resizedCell[pixel + 1] = 0
      resizedCell[pixel + 2] = 0
    }
  }
  const completeCell = await sharp(resizedCell, {
    raw: { width: scaledCellWidth, height: scaledCellHeight, channels: 4 },
  }).png().toBuffer()
  const rowOffset = 0
  const rowTopCrop = row === 0 ? 35 : 10
  const rowCell = await sharp(completeCell)
    .extract({
      left: 0,
      top: rowTopCrop,
      width: scaledCellWidth,
      height: scaledCellHeight - rowTopCrop,
    })
    .png()
    .toBuffer()
  const paddedFrame = await sharp({
    create: {
      width: outputCellWidth,
      height: Math.max(outputCellHeight + rowOffset, scaledCellHeight - rowTopCrop),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{
      input: rowCell,
      left: Math.floor((outputCellWidth - scaledCellWidth) / 2),
      top: rowOffset,
    }])
    .png()
    .toBuffer()
  const frameRaw = await sharp(paddedFrame)
    .extract({ left: 0, top: 0, width: outputCellWidth, height: outputCellHeight })
    .ensureAlpha()
    .raw()
    .toBuffer()
  for (let pixel = 0; pixel < frameRaw.length; pixel += 4) {
    const red = frameRaw[pixel]
    const green = frameRaw[pixel + 1]
    const blue = frameRaw[pixel + 2]
    const alpha = frameRaw[pixel + 3]
    const isPinkFringe =
      red > 100 && blue > 100 && red > green * 1.1 && blue > green * 1.1
    if (isPinkFringe || alpha === 0) {
      frameRaw[pixel] = 0
      frameRaw[pixel + 1] = 0
      frameRaw[pixel + 2] = 0
      if (isPinkFringe) frameRaw[pixel + 3] = 0
    }
  }
  const generatedFrame = await sharp(frameRaw, {
    raw: { width: outputCellWidth, height: outputCellHeight, channels: 4 },
  }).png().toBuffer()
  // All eight delivered frames are authored attack poses. Idle belongs to the
  // runtime state before/after this one-shot and is never duplicated in the sheet.
  const frame = generatedFrame
  const name = `${deliveryPrefix}-${index}`
  await sharp(frame).toFile(join(rawDir, `${name}.png`))
  await sharp(frame).webp({ lossless: true }).toFile(join(publicDir, `${name}.webp`))
  frames.push({ input: frame, left: column * outputCellWidth, top: row * outputCellHeight })
}

const deliveredSheet = await sharp({
  create: {
    width: columns * outputCellWidth,
    height: rows * outputCellHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(frames)
  .png()
  .toBuffer()

await sharp(deliveredSheet).toFile(join(rawDir, `${deliveryPrefix}-fixed-grid.png`))
await sharp(deliveredSheet).toFile(join(publicDir, `${deliveryPrefix}-fixed-grid.png`))

const previewWidth = outputCellWidth
const previewHeight = outputCellHeight
const previewFrames = await Promise.all(
  frames.map(async ({ input: frameInput }, index) => ({
    input: await sharp(frameInput)
      .resize(previewWidth, previewHeight, { fit: 'fill', kernel: sharp.kernel.nearest })
      .png()
      .toBuffer(),
    left: 0,
    top: index * previewHeight,
  })),
)
const previewPath = join(publicDir, `${deliveryPrefix}-preview.gif`)
await sharp({
  create: {
    width: previewWidth,
    height: previewHeight * frames.length,
    pageHeight: previewHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(previewFrames)
  .gif({ delay: Array(frames.length).fill(110), loop: 0, effort: 7 })
  .toFile(previewPath)
