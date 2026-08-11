import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export async function buildHanumanAttack3({ inputPath, outputDir, frameCount = 8, columns = 3 }) {
  return buildHanumanCycle({
    inputPath,
    outputDir,
    frameCount,
    columns,
    animationName: 'attack3',
    framePrefix: 'attack3',
    // Jump-slam legitimately leaves the ground for several frames and crouches
    // into a much shorter silhouette on landing (unlike run's steady stride
    // height) — looser than tools/hanuman-run.mjs's already-loose 40px.
    groundDriftTolerance: 80,
    centerDriftTolerance: 2,
    heightCvTolerance: 0.12,
  })
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const inputPath = path.resolve(
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-attack3-jumpslam-sheet.png',
  )
  const outputDir = path.resolve(argumentValue('--output') ?? 'public/characters/hanuman-attack3-v1')
  const report = await buildHanumanAttack3({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
