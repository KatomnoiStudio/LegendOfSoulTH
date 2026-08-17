/**
 * verify-memory-archive.mjs — content-exactness gate for the MEMORY.md index/archive split.
 *
 * "Content", not "byte": line endings are normalised before comparison (see the note at the
 * bottom of this header for why that is the correct call here, not a loosening). The LF
 * convention is asserted separately, and strictly, against the committed blob.
 *
 *   node tools/verify-memory-archive.mjs [--base <git-ref>]
 *
 * NOT WIRED INTO `npm run ci`, and why. Two parser defects were fixed on 2026-08-16 — see
 * `extractItems` — which removed every phantom "body lives in (nowhere)". That left 19 real
 * failures in three groups; 11 of them were the tool's own design, and are now handled:
 *
 *   11x "body differs"  — CLOSED 2026-08-18. Deliberate later edits (the item-211 vocabulary
 *                         sweep, the item-215 queue-leak sweep, the caretaker→system-owner
 *                         rename) measured against a FROZEN pre-split base, so every one was
 *                         a permanent failure by construction. They are now recorded item by
 *                         item in POST_SPLIT_EDITS with the ruling that made each edit, and
 *                         reported as "reworded on record" instead of as drift. Re-anchoring
 *                         the base would have ended them by destroying the migration proof;
 *                         going structural would have ended them by not checking. Anything
 *                         not on the list still fails, and a list entry that stops differing
 *                         fails too — both directions verified by mutation.
 *    7x "no index line" — items 216–222 are archived with no line in MEMORY.md. Real drift,
 *                         and the owner's to reconcile — writing index lines means
 *                         summarising seven items, which `agent-memory-law.md` governs.
 *    1x count mismatch  — a consequence of the seven.
 *
 * 8 failures remain, all of them the seven items and their count. Wiring this into CI today
 * would make CI red on state this tool cannot itself resolve, and no agent should resolve it
 * — the gate goes in once those seven are indexed (audit item B5).
 *
 * Root `MEMORY.md` is an index (one line per item); the item BODIES live in
 * `MEMORY/archive/NNN-MMM.md`. This asserts the move was lossless:
 *
 *   1. every item body in the archive is identical to the same item's body in the
 *      pre-split `MEMORY.md` (read from git, default ref `origin/master`)
 *   2. the item COUNT matches, with no gaps and no duplicates
 *   3. every item has exactly one index line in root `MEMORY.md`, pointing at the
 *      archive file that actually contains it
 *   4. the COMMITTED blobs use LF, never CRLF
 *   5. root `MEMORY.md` is an index, not a body store (line-count ceiling)
 *
 * Exit 0 = pass. Any failure exits 1 and prints what drifted.
 *
 * ── Why line endings are handled the way they are (this bit is load-bearing) ──
 * This repo is developed on Windows with `core.autocrlf=true`, so a clean checkout
 * REWRITES text files to CRLF in the working tree while the committed blob stays LF.
 * An earlier version of this script compared a `git show` read (LF) against a
 * worktree read (CRLF) and reported 0/188 bodies identical plus 387 CRLF failures
 * on a perfectly good tree — a verifier that fails on a clean checkout is a verifier
 * nobody runs. So:
 *   - CONTENT is compared with line endings normalised. A CRLF/LF difference is a
 *     checkout artifact, never a lost item, and must not mask or manufacture drift.
 *   - The EOL CONVENTION is asserted against the COMMITTED blob (`git cat-file`),
 *     which is the only place it is a real property of the repository.
 * Measure blobs with a raw buffer, never a shell pipe: on Git Bash for Windows a
 * `git cat-file blob | grep` pipeline can insert CRs of its own and report CRLF in
 * a file that has none.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARCHIVE_DIR = join(REPO, 'MEMORY', 'archive')
const INDEX_FILE = join(REPO, 'MEMORY.md')
const LINE_CEILING = 400

/**
 * The pre-split baseline is PINNED, not `origin/master`.
 *
 * The split landed in 0cefbb0, so from that commit onward `origin/master:MEMORY.md` IS the
 * index — comparing against a moving master made this tool destroy its own baseline the
 * moment its own work merged (it reported "archive holds 0" and every item "not in
 * origin/master"). 5531ebb is the last commit before the split; that is the only ref where
 * the original 188 bodies still live.
 */
const PRE_SPLIT_BASE = '5531ebb'
const baseFlag = process.argv.indexOf('--base')
const BASE = baseFlag === -1 ? PRE_SPLIT_BASE : process.argv[baseFlag + 1]

const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
  return ok
}

const git = (args, encoding = 'utf8') =>
  execFileSync('git', args, { cwd: REPO, encoding, maxBuffer: 256 * 1024 * 1024 })

/** Line endings are a checkout artifact here — compare content, not CR bytes. */
const normalise = (text) => text.replace(/\r\n/g, '\n')

/**
 * CRLF count of a COMMITTED blob, read as raw bytes (never through a shell pipe).
 * Returns null when the path simply is not committed yet — that is the normal case while
 * the split is staged. Any OTHER git failure is a real problem and is reported, not
 * swallowed: a catch-all here would let a broken git invocation masquerade as "skipped".
 */
function blobCrlfCount(ref, path) {
  try {
    const buf = git(['cat-file', 'blob', `${ref}:${path}`], 'buffer')
    return (buf.toString('latin1').match(/\r\n/g) ?? []).length
  } catch (err) {
    const stderr = String(err?.stderr ?? '')
    if (
      /exists on disk, but not in|does not exist|unknown revision|Not a valid object name/i.test(
        stderr,
      )
    ) {
      return null // not committed yet — nothing to assert
    }
    failures.push(`could not read blob ${ref}:${path} — ${stderr.trim() || err?.message || err}`)
    return null
  }
}

/**
 * Split a markdown blob into item bodies keyed by number.
 *
 * An item start is `NNN. ` or `## NNN. ` at column 0 — and, in an archive file, the number
 * must fall inside the range its own filename declares.
 */
function extractItems(text, source) {
  const lines = normalise(text).split('\n')
  /*
    Two separate defects, both measured 2026-08-16, both making this gate report losses that
    were not real while being unable to see one that was.

    1. TWO ITEM-START FORMS, ONE MATCHED. Items 1–200 were written as a plain `NNN. ` list
       line; 176 onward switched to a markdown heading, `## NNN. `. 193 plain against 31
       heading-form — and every heading-form item read as "body lives in (nowhere)", the
       whole of 201-225.md plus 9 of 176-200.md.

    2. NUMBERED SUB-LISTS INSIDE A BODY READ AS ITEM STARTS. `176-200.md:47` opens a
       sub-list with `1. **Correct code with nothing pinning it.**`, which matched as
       "item 1" and stole that item's identity from `001-025.md`. The filename declares the
       range the file is allowed to contain, so a number outside it is a body line, never a
       start. The index (`MEMORY.md`) carries no range and accepts every number.
  */
  const range = /(\d{3})-(\d{3})\.md$/.exec(source)
  const lo = range ? Number(range[1]) : -Infinity
  const hi = range ? Number(range[2]) : Infinity
  const starts = []
  for (let i = 0; i < lines.length; i++) {
    const m = /^(?:#{1,6}\s+)?(\d+)\. /.exec(lines[i])
    if (!m) continue
    const number = Number(m[1])
    if (number < lo || number > hi) continue
    starts.push({ index: i, number })
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
const originalItems = extractItems(git(['show', `${BASE}:MEMORY.md`]), `${BASE}:MEMORY.md`)

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

/**
 * Two modes, and the tool says which one it is running.
 *
 * HISTORICAL — the base still holds item bodies, so every one of them can be matched against
 * the archive. This is the migration proof and it only works from a pre-split ref.
 *
 * ONGOING — the base is already an index (someone pointed --base at a post-split commit).
 * The pre-split comparison is then meaningless, but the invariants that matter FOREVER still
 * hold: every index line has a body, every body has an index line, numbering is contiguous,
 * blobs are LF, and no body leaked back into the index. Run those and say plainly that the
 * historical half was skipped — never report a pass as if the full check ran.
 */
const HISTORICAL = originalItems.size > 0
console.log(
  `mode                : ${HISTORICAL ? 'HISTORICAL (base has bodies)' : 'ONGOING (base is already an index — pre-split comparison skipped)'}`,
)

if (HISTORICAL) {
  // The archive is allowed to have GROWN — items 189, 190, ... are appended after the split
  // and cannot exist in a pre-split base. The invariant is that nothing was LOST, so this is
  // a subset check, never an equality one. (An equality check here broke the moment the very
  // next item was written, which is not a property a migration proof should have.)
  check(
    archiveItems.size >= originalItems.size,
    `items LOST: base ${BASE} holds ${originalItems.size}, archive holds only ${archiveItems.size}`,
  )
  const added = archiveItems.size - originalItems.size
  if (added > 0)
    console.log(`items added since   : ${added} (${originalItems.size + 1}..${archiveItems.size})`)
}

/**
 * Items whose bodies were DELIBERATELY reworded after the split, with the ruling that did it.
 *
 * The base is pinned (see PRE_SPLIT_BASE) because this tool's job is a migration proof: the
 * archive must hold what the pre-split `MEMORY.md` held. That framing has one consequence
 * nobody chose — **any intentional later edit becomes a permanent failure**, and eleven of
 * them had accumulated, drowning the one group that is real drift.
 *
 * Re-anchoring the base would end the failures by destroying the proof, and loosening the
 * comparison to "structural" would end them by no longer checking the thing. This list is the
 * third option: the divergence stays visible and stays explained, and anything NOT on the list
 * still fails exactly as before. A stale entry is reported too — an item listed here that no
 * longer differs means the list has outlived its reason.
 *
 * Every entry traces to a sweep recorded in the archive itself, not to someone's taste.
 */
const POST_SPLIT_EDITS = new Map([
  [102, 'queue-leak sweep (item 215) — `task #12` removed'],
  [103, 'queue-leak sweep (item 215) — `task #13` removed'],
  [180, 'workflow-vocabulary sweep (item 211) — "belt system" → "local workflow system"'],
  [181, 'workflow-vocabulary sweep (item 211) — "belt-end main" → "main"'],
  [182, 'workflow-vocabulary sweep (item 211) — "belt-end main" → "main"'],
  [183, 'workflow-vocabulary sweep (item 211) — "Belt run 1" → "Run 1"'],
  [184, 'workflow-vocabulary sweep (item 211) — "Belt run 2" → "Run 2"'],
  [185, 'workflow-vocabulary sweep (item 211) — "the belt\'s first" → "the first"'],
  [186, 'workflow-vocabulary sweep (item 211) — "belt inward-reimplement" → "inward reimplement"'],
  [187, 'workflow-vocabulary sweep (item 211) — "belt round-trip" → "review round-trip"'],
  [188, 'role rename (item 211 sweep) — "claude -p caretaker" → "claude -p system owner"'],
])

// --- 3. body comparison (eol-normalised on both sides) — HISTORICAL mode only ---
let identical = 0
const acceptedEdits = []
for (const [number, body] of HISTORICAL ? originalItems : []) {
  const archived = archiveItems.get(number)
  if (archived === undefined) {
    failures.push(`item ${number} missing from the archive`)
    continue
  }
  if (archived === body) {
    identical++
    if (POST_SPLIT_EDITS.has(number)) {
      failures.push(
        `item ${number} is listed in POST_SPLIT_EDITS but its body no longer differs — ` +
          `remove the entry (reason on record: ${POST_SPLIT_EDITS.get(number)})`,
      )
    }
  } else if (POST_SPLIT_EDITS.has(number)) {
    acceptedEdits.push(`item ${number} — ${POST_SPLIT_EDITS.get(number)}`)
  } else {
    const a = Buffer.from(body, 'utf8')
    const b = Buffer.from(archived, 'utf8')
    // findIndex returns -1 when one side is a strict PREFIX of the other (nothing differs
    // within the shorter one) — reporting "-1" and slicing around it would point the reader
    // at the wrong place in the exact situation the tool exists to diagnose. The real
    // divergence is then the first byte past the shorter body.
    const firstDiff = [...a].findIndex((byte, i) => byte !== b[i])
    const at = firstDiff === -1 ? Math.min(a.length, b.length) : firstDiff
    const reason = firstDiff === -1 ? ' — one body is a prefix of the other (truncated)' : ''
    failures.push(
      `item ${number} body differs at byte ${at}${reason} (${a.length}B original vs ${b.length}B archived)\n` +
        `    original: ${JSON.stringify(body.slice(Math.max(0, at - 40), at + 40))}\n` +
        `    archived: ${JSON.stringify(archived.slice(Math.max(0, at - 40), at + 40))}`,
    )
  }
}
if (HISTORICAL) {
  console.log(`bodies identical    : ${identical}/${originalItems.size} (vs ${BASE})`)
  if (acceptedEdits.length > 0) {
    console.log(`reworded on record  : ${acceptedEdits.length} (deliberate, see POST_SPLIT_EDITS)`)
    for (const line of acceptedEdits) console.log(`  · ${line}`)
  }
}

// --- 4. no gaps in the numbering (the archive is the authority once the split has landed) ---
const numbers = [...archiveItems.keys()].toSorted((x, y) => x - y)
const gaps = numbers.filter((n, i) => n !== i + 1)
check(gaps.length === 0, `item numbering is not 1..N contiguous (first offender: ${gaps[0]})`)

// --- 5. the index covers every item and points at the right file ---
const indexText = normalise(readFileSync(INDEX_FILE, 'utf8'))
const indexLines = indexText.split('\n')
const indexed = new Map()
for (const line of indexLines) {
  const m = /^- \*\*(\d+)\.\*\* .* — `(MEMORY\/archive\/\d{3}-\d{3}\.md)`$/.exec(line)
  if (m) indexed.set(Number(m[1]), m[2].split('/').pop())
}
console.log(`index lines         : ${indexed.size}`)
check(
  indexed.size === archiveItems.size,
  `index covers ${indexed.size} items, archive holds ${archiveItems.size}`,
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

// --- 6. eol convention, asserted on the COMMITTED blobs only ---
const owned = [
  'MEMORY.md',
  ...archiveFiles.map((f) => `MEMORY/archive/${f}`),
  'MEMORY/archive/README.md',
]
let checkedBlobs = 0
for (const path of owned) {
  const crlf = blobCrlfCount('HEAD', path)
  if (crlf === null) continue // not committed yet
  checkedBlobs++
  check(crlf === 0, `committed blob HEAD:${path} contains ${crlf} CRLF line endings`)
}
console.log(`blobs eol-checked   : ${checkedBlobs}/${owned.length} (uncommitted files skipped)`)

const leakedBodies = indexLines.filter((l) => /^\d+\. /.test(l))
check(
  leakedBodies.length === 0,
  `MEMORY.md holds ${leakedBodies.length} item body line(s) — it is the index, bodies belong in MEMORY/archive/`,
)

const indexLineCount = indexLines.length - (indexText.endsWith('\n') ? 1 : 0)
console.log(`MEMORY.md lines     : ${indexLineCount} (ceiling ${LINE_CEILING})`)
console.log(`MEMORY.md bytes     : ${Buffer.byteLength(indexText)}`)
check(
  indexLineCount <= LINE_CEILING,
  `MEMORY.md is ${indexLineCount} lines, over the ${LINE_CEILING} ceiling`,
)

if (failures.length > 0) {
  console.error(`\nFAIL — ${failures.length} problem(s):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(
  HISTORICAL
    ? `\nPASS — all ${identical} item bodies are identical to ${BASE}, and the index matches the archive.`
    : `\nPASS (ONGOING checks only) — the index matches the archive, numbering is contiguous, blobs are LF.` +
        `\n       The pre-split body comparison did NOT run: ${BASE} is already an index.` +
        `\n       For the migration proof, run without --base (pinned to ${PRE_SPLIT_BASE}).`,
)
