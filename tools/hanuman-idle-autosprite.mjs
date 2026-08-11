import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export async function buildHanumanIdleAutosprite({ inputPath, outputDir, frameCount = 8, columns = 3 }) {
  return buildHanumanCycle({
    inputPath,
    outputDir,
    frameCount,
    columns,
    animationName: 'idle-autosprite',
    framePrefix: 'idle',
    // Gentle breathing cycle, tightest tolerances of the four AutoSprite animations
    // (mirrors tools/hanuman-idle.mjs's near-zero drift expectation for the original
    // hand-built Idle V2).
    groundDriftTolerance: 6,
    centerDriftTolerance: 2,
  })
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const inputPath = path.resolve(
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-idle-autosprite-v1-sheet.png',
  )
  const outputDir = path.resolve(argumentValue('--output') ?? 'public/characters/hanuman-idle-autosprite-v1')
  const report = await buildHanumanIdleAutosprite({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
