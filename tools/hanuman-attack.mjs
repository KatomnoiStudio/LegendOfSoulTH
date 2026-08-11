import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export { findBoundingBox, stripSmallAlphaComponents, buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export async function buildHanumanAttack({ inputPath, outputDir, frameCount = 8, columns = 3 }) {
  return buildHanumanCycle({
    inputPath,
    outputDir,
    frameCount,
    columns,
    animationName: 'attack1',
    framePrefix: 'attack1',
    // Attack footwork naturally widens/narrows stance frame to frame (unlike a
    // gentle idle breathe cycle), so tolerances are looser than tools/hanuman-idle.mjs.
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
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-attack1-sheet-v1.png',
  )
  const outputDir = path.resolve(argumentValue('--output') ?? 'public/characters/hanuman-attack1-v1')
  const report = await buildHanumanAttack({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
