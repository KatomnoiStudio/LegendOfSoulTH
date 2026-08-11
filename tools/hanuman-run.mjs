import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export async function buildHanumanRun({ inputPath, outputDir, frameCount = 8, columns = 3 }) {
  return buildHanumanCycle({
    inputPath,
    outputDir,
    frameCount,
    columns,
    animationName: 'run',
    framePrefix: 'run',
    // Sprint has an airborne moment between strides (feet leave the ground
    // entirely on some frames), so ground drift is loosest of the three cycles.
    groundDriftTolerance: 40,
    centerDriftTolerance: 2,
  })
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const inputPath = path.resolve(
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-run-v1-sheet.png',
  )
  const outputDir = path.resolve(argumentValue('--output') ?? 'public/characters/hanuman-run-v1')
  const report = await buildHanumanRun({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
