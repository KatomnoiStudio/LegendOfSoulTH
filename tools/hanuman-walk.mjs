import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export async function buildHanumanWalk({ inputPath, outputDir, frameCount = 8, columns = 3 }) {
  return buildHanumanCycle({
    inputPath,
    outputDir,
    frameCount,
    columns,
    animationName: 'walk',
    framePrefix: 'walk',
    // A walk cycle has real footwork (stride length varies frame to frame) but no
    // held weapon skewing the silhouette, so this sits between the idle and attack
    // pipelines' tolerances.
    groundDriftTolerance: 16,
    centerDriftTolerance: 2,
  })
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const inputPath = path.resolve(
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-walk-sheet-v1.png',
  )
  const outputDir = path.resolve(argumentValue('--output') ?? 'public/characters/hanuman-walk-v1')
  const report = await buildHanumanWalk({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
