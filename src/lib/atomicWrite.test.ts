import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
// @ts-expect-error — tools/ is plain .mjs outside the app's tsconfig; imported for its behaviour,
// not its types. The alternative is duplicating the helper in TS, which is the drift this whole
// change exists to remove.
import { produceFileAtomic, sweepStaleTemps, tempPathFor } from '../../tools/lib/atomic-write.mjs'

// Audit 2026-08-12 §0b.3: three tools overwrote their own target in place, so a process that died
// mid-write left the destination in a state that was neither the old file nor the new one.
//
// The property under test is the one that makes that impossible: the destination is only ever
// touched by a rename, so a failure anywhere before it leaves the previous contents exactly as
// they were. Tested against a real temp directory rather than a mocked fs — a mock would be
// asserting that rename was called, not that the bytes survived.

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'atomic-write-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('sweepStaleTemps', () => {
  it('removes temps a killed run left behind, and nothing else', async () => {
    // The cleanup in produceFileAtomic covers a throw; SIGKILL and power loss skip it, and these
    // temps sit beside their destination — which for build-models is public/models/, a directory
    // Vite copies verbatim into the bundle. Left alone they get committed and shipped.
    await writeFile(join(dir, '.atomic-999-1.tmp'), 'abandoned')
    await writeFile(join(dir, '.atomic-999-2.tmp'), 'abandoned')
    await writeFile(join(dir, 'real-model.glb'), 'keep me')
    await writeFile(join(dir, 'notes.tmp'), 'a temp belonging to something else')

    const swept = await sweepStaleTemps(dir)

    expect(swept).toBe(2)
    // The prefix is what makes this safe to run unattended: an unrelated *.tmp is not ours.
    expect((await readdir(dir)).toSorted()).toEqual(['notes.tmp', 'real-model.glb'])
  })

  it('is a no-op on a directory that does not exist', async () => {
    await expect(sweepStaleTemps(join(dir, 'nope'))).resolves.toBe(0)
  })
})

describe('produceFileAtomic', () => {
  it('hands the producer a temp path, never the destination', async () => {
    const dest = join(dir, 'produced.bin')
    await writeFile(dest, 'previous')
    let sawPath = ''

    await produceFileAtomic(dest, async (temp: string) => {
      sawPath = temp
      // The destination must still hold its old contents while the producer is running — that is
      // the whole guarantee. Asserting it here, mid-write, is the only place it can be observed.
      expect(await readFile(dest, 'utf8')).toBe('previous')
      await writeFile(temp, 'produced')
    })

    expect(sawPath).not.toBe(dest)
    expect(await readFile(dest, 'utf8')).toBe('produced')
    expect(await readdir(dir)).toEqual(['produced.bin'])
  })

  it('leaves the previous file untouched when the producer throws', async () => {
    const dest = join(dir, 'kept.txt')
    await writeFile(dest, 'the good version')

    await expect(
      produceFileAtomic(dest, async (temp: string) => {
        await writeFile(temp, 'half a file')
        throw new Error('killed mid-write')
      }),
    ).rejects.toThrow('killed mid-write')

    // This is the defect, restated as an assertion: before the fix, that half-written content
    // WAS the destination.
    expect(await readFile(dest, 'utf8')).toBe('the good version')
    expect(await readdir(dir)).toEqual(['kept.txt'])
  })

  it('returns whatever the producer returned, so callers keep their metadata', async () => {
    const dest = join(dir, 'meta.bin')

    const result = await produceFileAtomic(dest, async (temp: string) => {
      await writeFile(temp, 'x')
      return { width: 640, height: 512 }
    })

    expect(result).toEqual({ width: 640, height: 512 })
  })

  it('never reuses a temp path, so two writes in flight cannot clobber each other', () => {
    const dest = join(dir, 'anything.bin')

    const paths = [tempPathFor(dest), tempPathFor(dest), tempPathFor(dest)]

    // The design choice this pins: a fixed name like `dest + '.tmp'` would have two in-flight
    // writes sharing one scratch file and renaming it out from under each other.
    expect(new Set(paths).size).toBe(3)
    expect(paths.every((path) => path !== dest)).toBe(true)

    // Deliberately NOT tested: two produceFileAtomic calls racing to the SAME destination. No
    // tool does that — all three iterate sequentially over unique paths — and on Windows the
    // final rename fails with EPERM when the destination is held, which is a platform limit
    // rather than a defect in this helper. Asserting a property nothing relies on would have
    // meant a red suite for a scenario that cannot occur.
  })
})
