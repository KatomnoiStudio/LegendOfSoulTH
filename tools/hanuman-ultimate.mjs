import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export async function buildHanumanUltimate({ inputPath, outputDir, frameCount = 8, columns = 3 }) {
  return buildHanumanCycle({
    inputPath,
    outputDir,
    frameCount,
    columns,
    animationName: 'ultimate',
    framePrefix: 'ultimate',
    // The screen-filling fire explosion (frames 3-4) is the biggest effect of
    // any animation so far and legitimately fills most of the 256px source
    // cell, so this needs the loosest tolerances in the whole roster.
    groundDriftTolerance: 90,
    centerDriftTolerance: 3,
    heightCvTolerance: 0.15,
  })
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const inputPath = path.resolve(
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-ultimate-sheet.png',
  )
  const outputDir = path.resolve(argumentValue('--output') ?? 'public/characters/hanuman-ultimate-v1')
  const report = await buildHanumanUltimate({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
