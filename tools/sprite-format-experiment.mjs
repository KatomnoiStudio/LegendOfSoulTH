#!/usr/bin/env node
/**
 * Single-variable image-format experiment over this game's shipped sprite corpus.
 *
 * Produces every number in `docs/SPRITE-FORMAT-EXPERIMENT-2026-08-12.md` except the browser-support
 * rows, which are cited to caniuse and MDN there because no script can measure them.
 *
 * That claim is load-bearing: the document's whole argument is that every figure in it can be
 * re-derived on someone else's machine. An earlier draft of this header made the claim while three
 * of the document's tables came from throwaway probes that were never folded in — §4's distinct
 * colour count, §6's PNG-options table, and §8's per-group bytes-per-pixel table. They are all
 * emitted below now. Do not re-narrow this comment to make it true; add the measurement instead.
 *
 *   node tools/sprite-format-experiment.mjs
 *
 * Read-only: every encode goes to a memory buffer. Nothing under `public/` is written or touched.
 *
 * The experiment is split into two tracks on purpose. Track A varies ONE thing — the file
 * extension — and asks every format for its lossless mode, so all of them must return the same
 * pixels; that is checked per frame with SHA-256 over the decoded RGBA rather than assumed.
 * Track B is a different question (what giving up losslessness buys and costs) and PNG cannot
 * enter it, because PNG has no lossy mode. Putting a lossless PNG beside a lossy WebP and calling
 * the gap a format win is the confound this file is shaped to avoid.
 */
import sharp from 'sharp'
import { readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'characters').replace(
  /\\/g,
  '/',
)

/**
 * The design lock's alpha threshold, and the same one `src/game/spriteContract.test.ts:35` uses.
 * It is not a knob for this experiment — changing it would change what "the foot line" means.
 */
const ALPHA_THRESHOLD = 8

/** Decodes per timing sample. Median is reported, so an odd count avoids interpolation. */
const DECODE_SAMPLES = 5

/**
 * Track A — lossless only. The ONE variable is the extension.
 *
 * PNG deliberately carries no `effort` option. sharp's `effort` switches on palette quantisation,
 * which silently makes the PNG lossy — it produced a file 4.3x smaller by discarding 99.1% of the
 * colours and reported nothing. That trap is measured as its own row in Track B instead.
 */
const TRACK_A = [
  ['.png', (s) => s.png({ compressionLevel: 9, palette: false })],
  ['.webp', (s) => s.webp({ lossless: true, effort: 6 })],
  ['.avif', (s) => s.avif({ lossless: true, effort: 4 })],
  ['.tiff', (s) => s.tiff({ compression: 'deflate' })],
]

/** Track B — `.png 256c` is here because it is what "just use a PNG" means in practice. */
const TRACK_B = [
  ['.webp q90', (s) => s.webp({ quality: 90, alphaQuality: 100, effort: 6 })],
  ['.webp q80', (s) => s.webp({ quality: 80, alphaQuality: 100, effort: 6 })],
  ['.avif q65', (s) => s.avif({ quality: 65, effort: 4 })],
  ['.avif q50', (s) => s.avif({ quality: 50, effort: 4 })],
  ['.png 256c', (s) => s.png({ compressionLevel: 9, palette: true, effort: 10 })],
]

/** Formats that cannot carry 8-bit alpha are disqualified on capability, before any byte counts. */
const DISQUALIFY_PROBE = [
  ['.jpeg', (s) => s.jpeg({ quality: 100 })],
  ['.gif', (s) => s.gif()],
  ['.jxl', (s) => s.jxl({ lossless: true })],
  ['.heif', (s) => s.heif({ lossless: true, compression: 'av1' })],
]

/**
 * sharp's PNG `effort` option silently switches on palette quantisation, which makes the PNG lossy
 * while still calling itself a PNG. This is the demonstration behind §6 of the document, kept in
 * the script because it is the single easiest way to get this whole comparison wrong.
 */
const PNG_OPTION_PROBE = [
  ['png() defaults', {}],
  ['compressionLevel: 9', { compressionLevel: 9 }],
  ['palette: false', { compressionLevel: 9, palette: false }],
  ['compressionLevel: 9, effort: 10', { compressionLevel: 9, effort: 10 }],
  ['palette: true', { palette: true }],
]

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name).replace(/\\/g, '/')
    if (entry.isDirectory()) out.push(...walk(p))
    else if (entry.name.endsWith('.webp')) out.push(p)
  }
  return out
}

/**
 * Foot line and character height by alpha scan — a port of `measureFrame()` in
 * `src/game/spriteContract.test.ts:186-209`, kept deliberately identical so this experiment
 * measures what the renderer measures rather than something close to it.
 */
function measureAlpha(alpha, width, height) {
  let top = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (alpha[row + x] > ALPHA_THRESHOLD) {
        if (top < 0) top = y
        bottom = y
        break
      }
    }
  }
  return top < 0 ? null : { charHeight: bottom - top + 1, footLine: bottom }
}

async function medianDecodeMs(buffer) {
  const times = []
  for (let i = 0; i < DECODE_SAMPLES; i++) {
    const started = process.hrtime.bigint()
    await sharp(buffer).ensureAlpha().raw().toBuffer()
    times.push(Number(process.hrtime.bigint() - started) / 1e6)
  }
  const sorted = times.toSorted((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** One frame per (canvas size x sprite group), so every distinct sheet is represented once. */
async function pickSample(files) {
  const seen = new Set()
  const sample = []
  for (const file of files) {
    const meta = await sharp(file).metadata()
    const group = file.slice(ROOT.length + 1).replace(/-?\d+(-alpha)?\.webp$/, '')
    const key = `${meta.width}x${meta.height}|${group}`
    if (seen.has(key)) continue
    seen.add(key)
    sample.push({ file, width: meta.width, height: meta.height })
  }
  return sample
}

async function main() {
  const files = walk(ROOT).toSorted()
  if (files.length === 0) throw new Error(`no .webp frames under ${ROOT}`)

  const shippedBytes = files.reduce((n, f) => n + statSync(f).size, 0)
  console.log(
    `sharp ${sharp.versions.sharp ?? ''}  libvips ${sharp.versions.vips}  node ${process.versions.node}`,
  )
  console.log(
    `corpus: ${files.length} frames, ${(shippedBytes / 1048576).toFixed(2)} MiB under public/characters`,
  )

  // --- how is the shipped corpus actually encoded? ---
  let lossless = 0
  const perGroup = {}
  for (const file of files) {
    const meta = await sharp(file).metadata()
    if (meta.isLossless) lossless++
    const group = file.slice(ROOT.length + 1).replace(/-?\d+(-alpha)?\.webp$/, '')
    perGroup[group] ??= { frames: 0, bytes: 0, px: 0 }
    perGroup[group].frames++
    perGroup[group].bytes += statSync(file).size
    perGroup[group].px += meta.width * meta.height
  }
  const bppList = Object.values(perGroup).map((g) => g.bytes / g.px)
  console.log(
    `  shipped encoding: ${lossless} lossless / ${files.length - lossless} lossy` +
      `   bytes/px across ${Object.keys(perGroup).length} groups: ` +
      `${Math.min(...bppList).toFixed(3)} to ${Math.max(...bppList).toFixed(3)} ` +
      `(${(Math.max(...bppList) / Math.min(...bppList)).toFixed(1)}x spread)`,
  )

  // The spread above is the interesting number, so show what it is a spread OF. Nobody chose these
  // quality settings; each batch of art got whatever its tool did that day.
  // Every group, not a top-N: the document cites rows from the middle of this list, and a reader
  // checking it should not have to take a truncated table on trust.
  console.log('\n  all groups by bytes/px, heaviest first:')
  const ranked = Object.entries(perGroup).toSorted(
    (a, b) => b[1].bytes / b[1].px - a[1].bytes / a[1].px,
  )
  for (const [group, g] of ranked)
    console.log(
      `    ${group.slice(0, 38).padEnd(39)} ${String(g.frames).padStart(3)} frames ` +
        `${(g.bytes / g.px).toFixed(3).padStart(7)} bytes/px ${(g.bytes / 1048576).toFixed(2).padStart(6)} MiB`,
    )

  const sample = await pickSample(files)
  console.log(`\nsample: ${sample.length} frames, one per (canvas size x sprite group)\n`)

  // --- which extensions may even enter? ---
  console.log('=== capability probe: a format that cannot carry 8-bit alpha is disqualified ===')
  const probeSrc = sample[0].file
  const { data: probeRef } = await sharp(probeSrc)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const probeRefHash = createHash('sha256').update(probeRef).digest('hex')
  for (const [ext, encode] of DISQUALIFY_PROBE) {
    let buffer
    try {
      buffer = await encode(sharp(probeSrc)).toBuffer()
    } catch (error) {
      console.log(
        `  ${ext.padEnd(7)} not built into this libvips: ${String(error.message).slice(0, 60)}`,
      )
      continue
    }
    const { data } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let maxAlpha = 0
    if (data.length === probeRef.length)
      for (let p = 3; p < data.length; p += 4) {
        const d = Math.abs(data[p] - probeRef[p])
        if (d > maxAlpha) maxAlpha = d
      }
    console.log(
      `  ${ext.padEnd(7)} max alpha delta ${String(maxAlpha).padStart(3)}` +
        `  ${maxAlpha === 0 ? 'carries alpha exactly' : 'DISQUALIFIED — alpha is not preserved'}`,
    )
  }

  // --- the palette trap, and how much colour a sprite sheet actually holds ---
  const distinctColours = new Set()
  for (let p = 0; p < probeRef.length; p += 4)
    distinctColours.add(
      (probeRef[p] << 24) | (probeRef[p + 1] << 16) | (probeRef[p + 2] << 8) | probeRef[p + 3],
    )
  console.log(
    `\n=== the PNG palette trap, on ${probeSrc.slice(ROOT.length + 1)} ===\n` +
      `  this sheet holds ${distinctColours.size.toLocaleString()} distinct RGBA values;` +
      ` a PNG palette holds at most 256`,
  )
  console.log('  png options                        bytes   pixels identical   colours out')
  for (const [label, options] of PNG_OPTION_PROBE) {
    const buffer = await sharp(probeSrc).png(options).toBuffer()
    const { data } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = new Set()
    for (let p = 0; p < data.length; p += 4)
      out.add((data[p] << 24) | (data[p + 1] << 16) | (data[p + 2] << 8) | data[p + 3])
    const identical = createHash('sha256').update(data).digest('hex') === probeRefHash
    console.log(
      `  ${label.padEnd(33)} ${String(buffer.length).padStart(7)} ${(identical ? 'yes' : 'NO').padStart(18)} ${String(out.size).padStart(13)}`,
    )
  }

  // --- pre-flight: drop any format this libvips cannot encode, BEFORE the long loop ---
  // The capability probe above handles its own failures; the measurement loop used to call encode()
  // bare, so a build without AVIF died on frame 1 of 37 after the probe had already passed. Failing
  // here instead costs one frame and still produces every table the build can produce.
  const trackA = []
  const trackB = []
  for (const [defs, out] of [
    [TRACK_A, trackA],
    [TRACK_B, trackB],
  ])
    for (const entry of defs) {
      try {
        await entry[1](sharp(probeSrc)).toBuffer()
        out.push(entry)
      } catch (error) {
        console.log(
          `\n  DROPPED ${entry[0]} — this libvips cannot encode it: ${String(error.message).slice(0, 70)}`,
        )
      }
    }
  if (!trackA.some(([name]) => name === '.webp'))
    throw new Error('lossless .webp is the baseline every ratio is against and it did not encode')

  // --- the measurement ---
  const rows = []
  for (const [index, frame] of sample.entries()) {
    const { data: ref } = await sharp(frame.file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const refHash = createHash('sha256').update(ref).digest('hex')
    const refAlpha = new Uint8Array(frame.width * frame.height)
    for (let p = 0; p < refAlpha.length; p++) refAlpha[p] = ref[p * 4 + 3]
    const base = measureAlpha(refAlpha, frame.width, frame.height)

    const record = {
      file: frame.file.slice(ROOT.length + 1),
      px: frame.width * frame.height,
      variants: {},
    }
    for (const [name, encode] of [...trackA, ...trackB]) {
      const buffer = await encode(sharp(frame.file)).toBuffer()
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const alpha = new Uint8Array(info.width * info.height)
      let maxAlpha = 0
      let maxRgb = 0
      for (let p = 0; p < alpha.length; p++) {
        alpha[p] = data[p * 4 + 3]
        const da = Math.abs(data[p * 4 + 3] - ref[p * 4 + 3])
        if (da > maxAlpha) maxAlpha = da
        // RGB compared only where the ORIGINAL was opaque. The colour stored under a fully
        // transparent pixel is undefined, every codec invents its own, and no renderer samples
        // it — counting it would fail a format for something no player can ever see.
        if (ref[p * 4 + 3] > ALPHA_THRESHOLD)
          for (let c = 0; c < 3; c++) {
            const d = Math.abs(data[p * 4 + c] - ref[p * 4 + c])
            if (d > maxRgb) maxRgb = d
          }
      }
      const measured = measureAlpha(alpha, info.width, info.height)
      record.variants[name] = {
        bytes: buffer.length,
        decodeMs: await medianDecodeMs(buffer),
        pixelExact: createHash('sha256').update(data).digest('hex') === refHash,
        visuallyExact: maxAlpha === 0 && maxRgb === 0,
        maxAlphaDelta: maxAlpha,
        movedGeometry:
          !measured ||
          measured.charHeight !== base.charHeight ||
          measured.footLine !== base.footLine,
      }
    }
    rows.push(record)
    process.stdout.write(`\r  measuring ${index + 1}/${sample.length}   `)
  }
  process.stdout.write('\r'.padEnd(40) + '\r')

  const totalOf = (name) => rows.reduce((n, r) => n + r.variants[name].bytes, 0)
  const meanBytes = (name) => totalOf(name) / rows.length
  const meanDecode = (name) => rows.reduce((n, r) => n + r.variants[name].decodeMs, 0) / rows.length

  function printTrack(title, defs, baseline) {
    console.log(`\n=== ${title} ===`)
    console.log(
      'ext          total KiB   vs .webp   decode(med)   pixel-exact  visually-exact  maxAlphaD   geometry moved',
    )
    for (const [name] of defs) {
      const variants = rows.map((r) => r.variants[name])
      const medians = variants.map((v) => v.decodeMs).toSorted((a, b) => a - b)
      console.log(
        `${name.padEnd(12)} ${(totalOf(name) / 1024).toFixed(0).padStart(9)} ${(totalOf(name) / totalOf(baseline)).toFixed(2).padStart(9)}x ` +
          `${medians[Math.floor(medians.length / 2)].toFixed(2).padStart(10)} ms ` +
          `${`${variants.filter((v) => v.pixelExact).length}/${variants.length}`.padStart(12)} ` +
          `${`${variants.filter((v) => v.visuallyExact).length}/${variants.length}`.padStart(15)} ` +
          `${String(Math.max(...variants.map((v) => v.maxAlphaDelta))).padStart(9)} ` +
          `${`${variants.filter((v) => v.movedGeometry).length}/${variants.length}`.padStart(16)}`,
      )
    }
  }

  printTrack('TRACK A — lossless only. ONE variable: the extension.', trackA, '.webp')
  printTrack(
    'TRACK B — a different question: what giving up lossless buys, and costs',
    trackB,
    '.webp',
  )

  // --- where PNG's byte cost and its decode saving cancel ---
  const extraBytes = meanBytes('.png') - meanBytes('.webp')
  const savedMs = meanDecode('.webp') - meanDecode('.png')
  const breakEvenMbit = ((extraBytes / savedMs) * 1000 * 8) / 1e6
  console.log(`\n=== .png against .webp, both lossless, per frame ===`)
  console.log(`  png costs  +${(extraBytes / 1024).toFixed(1)} KiB`)
  console.log(`  png saves  -${savedMs.toFixed(2)} ms of decode`)
  console.log(
    `  BREAK-EVEN ${breakEvenMbit.toFixed(0)} Mbit/s — below it .webp wins, above it .png wins`,
  )
  console.log(
    `  (decode measured with libvips on this machine, NOT in a browser — see the doc's limits section)`,
  )

  console.log('\n--- modelled: one character entering the adventure scene, 80 frames ---')
  console.log('link                                  .webp      .png    winner')
  for (const [label, mbit] of [
    ['3G, 1.6 Mbit/s', 1.6],
    ['4G, 15 Mbit/s', 15],
    ['home broadband, 100 Mbit/s', 100],
    ['fibre, 500 Mbit/s', 500],
    ['fully cached, no transfer', Infinity],
  ]) {
    const seconds = (name) =>
      (mbit === Infinity ? 0 : (meanBytes(name) * 80) / ((mbit * 1e6) / 8)) +
      (meanDecode(name) * 80) / 1000
    const w = seconds('.webp')
    const p = seconds('.png')
    console.log(
      `${label.padEnd(34)} ${w.toFixed(2).padStart(7)} s ${p.toFixed(2).padStart(8)} s    ` +
        `${w < p ? '.webp' : '.png'} by ${Math.abs(w - p).toFixed(2)} s`,
    )
  }

  const px = rows.reduce((n, r) => n + r.px, 0)
  console.log(`\n=== what the GPU holds ===`)
  console.log(
    `  decoded RGBA is 4 bytes/pixel in every row above: ${((px * 4) / 1048576).toFixed(1)} MiB of texture,` +
      ` identical for all ${trackA.length + trackB.length} encodings. The extension does not touch VRAM.`,
  )
}

await main()
