/**
 * verify-memory-archive.mjs — byte-exactness gate for the MEMORY.md index/archive split.
 *
 *   node tools/verify-memory-archive.mjs [--base <git-ref>]
 *
 * Root `MEMORY.md` is an index (one line per item); the item BODIES live in
 * `MEMORY/archive/NNN-MMM.md`. This asserts the move was lossless:
 *
 *   1. every item body in the archive is BYTE-IDENTICAL to the same item's body
 *      in the pre-split `MEMORY.md` (read from git, default ref `origin/master`)
 *   2. the item COUNT matches, with no gaps and no duplicates
 *   3. every item has exactly one index line in root `MEMORY.md`, pointing at the
 *      archive file that actually contains it
 *   4. no CRLF in any file this split owns
 *   5. root `MEMORY.md` is an index, not a body store (line-count ceiling)
 *
 * Exit 0 = pass. Any failure exits 1 and prints what drifted.
 */

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVE_DIR = join(REPO, 'MEMORY', 'archive')
const INDEX_FILE = join(REPO, 'MEMORY.md')
const LINE_CEILING = 400

const baseFlag = process.argv.indexOf('--base')
const BASE = baseFlag === -1 ? 'origin/master' : process.argv[baseFlag + 1]

const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
  return ok
}

/** Split a markdown blob into item bodies keyed by number. Items are `NNN. ` at column 0. */
function extractItems(text, source) {
  const lines = text.split('\n')
  const starts = []
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\d+)\. /.exec(lines[i])
    if (m) starts.push({ index: i, number: Number(m[1]) })
  }
  const items = new Map()
  for (let s = 0; s < starts.length; s++) {
    const end = starts[s + 1]?.index ?? lines.length
    const body = lines.slice(starts[s].index, end)
    while (body.length && body[body.length - 1].trim() === '') body.pop()
    const { number } = starts[s]
    if (items.has(number)) failures.push(`duplicate item ${number} in ${source}`)
    items.set(number, body.join('\n'))
  }
  return items
}

// --- 1. the pre-split original, straight from git ---
const original = execFileSync('git', ['show', `${BASE}:MEMORY.md`], {
  cwd: REPO,
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
})
const originalItems = extractItems(original, `${BASE}:MEMORY.md`)

// --- 2. the archive ---
const archiveFiles = readdirSync(ARCHIVE_DIR)
  .filter((f) => /^\d{3}-\d{3}\.md$/.test(f))
  .toSorted()
const archiveItems = new Map()
const owner = new Map()
for (const file of archiveFiles) {
  const text = readFileSync(join(ARCHIVE_DIR, file), 'utf8')
  for (const [number, body] of extractItems(text, file)) {
    if (archiveItems.has(number)) failures.push(`item ${number} appears in two archive files`)
    archiveItems.set(number, body)
    owner.set(number, file)
  }
}

console.log(`base ref            : ${BASE}`)
console.log(`archive files       : ${archiveFiles.length} (${archiveFiles.join(', ')})`)
console.log(`items in original   : ${originalItems.size}`)
console.log(`items in archive    : ${archiveItems.size}`)

check(
  originalItems.size === archiveItems.size,
  `item count drift: original ${originalItems.size} vs archive ${archiveItems.size}`,
)

// --- 3. byte-for-byte body comparison ---
let identical = 0
for (const [number, body] of originalItems) {
  const archived = archiveItems.get(number)
  if (archived === undefined) {
    failures.push(`item ${number} missing from the archive`)
    continue
  }
  const a = Buffer.from(body, 'utf8')
  const b = Buffer.from(archived, 'utf8')
  if (a.equals(b)) {
    identical++
  } else {
    const at = [...a].findIndex((byte, i) => byte !== b[i])
    failures.push(
      `item ${number} body differs at byte ${at} (${a.length}B original vs ${b.length}B archived)\n` +
        `    original: ${JSON.stringify(body.slice(Math.max(0, at - 40), at + 40))}\n` +
        `    archived: ${JSON.stringify(archived.slice(Math.max(0, at - 40), at + 40))}`,
    )
  }
}
for (const number of archiveItems.keys()) {
  if (!originalItems.has(number)) failures.push(`item ${number} is in the archive but not in ${BASE}`)
}
console.log(`bodies byte-identical: ${identical}/${originalItems.size}`)

// --- 4. no gaps in the numbering ---
const numbers = [...originalItems.keys()].toSorted((x, y) => x - y)
const gaps = numbers.filter((n, i) => n !== i + 1)
check(gaps.length === 0, `item numbering is not 1..N contiguous (first offender: ${gaps[0]})`)

// --- 5. the index covers every item and points at the right file ---
const indexText = readFileSync(INDEX_FILE, 'utf8')
const indexLines = indexText.split('\n')
const indexed = new Map()
for (const line of indexLines) {
  const m = /^- \*\*(\d+)\.\*\* .* — `(MEMORY\/archive\/\d{3}-\d{3}\.md)`$/.exec(line)
  if (m) indexed.set(Number(m[1]), m[2].split('/').pop())
}
console.log(`index lines         : ${indexed.size}`)
check(
  indexed.size === originalItems.size,
  `index covers ${indexed.size} items, archive holds ${originalItems.size}`,
)
for (const [number, file] of indexed) {
  check(
    owner.get(number) === file,
    `index line for item ${number} points at ${file}, but its body lives in ${owner.get(number) ?? '(nowhere)'}`,
  )
}
for (const number of numbers) {
  if (!indexed.has(number)) failures.push(`item ${number} has no index line in MEMORY.md`)
}

// --- 6. line-ending + size hygiene on every file the split owns ---
const owned = [INDEX_FILE, ...archiveFiles.map((f) => join(ARCHIVE_DIR, f)), join(ARCHIVE_DIR, 'README.md')]
for (const file of owned) {
  const crlf = (readFileSync(file, 'utf8').match(/\r\n/g) ?? []).length
  check(crlf === 0, `${file} contains ${crlf} CRLF line endings`)
}

const leakedBodies = indexLines.filter((l) => /^\d+\. /.test(l))
check(
  leakedBodies.length === 0,
  `MEMORY.md holds ${leakedBodies.length} item body line(s) — it is the index, bodies belong in MEMORY/archive/`,
)

const indexLineCount = indexLines.length - (indexText.endsWith('\n') ? 1 : 0)
console.log(`MEMORY.md lines     : ${indexLineCount} (ceiling ${LINE_CEILING})`)
console.log(`MEMORY.md bytes     : ${Buffer.byteLength(indexText)} (was ${Buffer.byteLength(original)})`)
check(indexLineCount <= LINE_CEILING, `MEMORY.md is ${indexLineCount} lines, over the ${LINE_CEILING} ceiling`)

if (failures.length > 0) {
  console.error(`\nFAIL — ${failures.length} problem(s):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('\nPASS — every item body is byte-identical to the pre-split MEMORY.md.')
