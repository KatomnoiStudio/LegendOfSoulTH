import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildHanumanCycle } from './lib/hanuman-sprite-pipeline.mjs'

export async function buildHanumanSkill2({ inputPath, outputDir, frameCount = 8, columns = 3 }) {
  return buildHanumanCycle({
    inputPath,
    outputDir,
    frameCount,
    columns,
    animationName: 'skill2',
    framePrefix: 'skill2',
    // Feet plant during the slam, but the ground shockwave pools/glows well
    // beyond the character's own footprint in the release frames (wider than
    // Skill1's falling sparkles), so ground-drift tolerance is loosened further.
    groundDriftTolerance: 60,
    centerDriftTolerance: 2,
    // The crouch-to-glow transition changes apparent body height slightly more
    // than a pure idle breathe cycle.
    heightCvTolerance: 0.09,
  })
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const inputPath = path.resolve(
    argumentValue('--input') ?? 'assets/raw/characters/hanuman-skill2-giant-sheet.png',
  )
  const outputDir = path.resolve(argumentValue('--output') ?? 'public/characters/hanuman-skill2-v1')
  const report = await buildHanumanSkill2({ inputPath, outputDir })
  process.stdout.write(`${JSON.stringify(report.qc)}\n`)
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  await main()
}
