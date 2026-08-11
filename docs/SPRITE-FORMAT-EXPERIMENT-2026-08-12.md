# What's wrong with a PNG?

**A single-variable format experiment on a shipping 2.5D sprite engine.**
Legend of Soul TH · measured 2026-08-12 at commit `b924b6f` · 359 shipped frames, 37-frame sample.

Someone replied to an article with exactly those four words. No argument attached, no claim to
rebut — just the question. It is a fair one, it has never been answered here with a number, and it
turns out to have a real answer, so this is the experiment rather than a reply.

The reproduction script is in this repository at `tools/sprite-format-experiment.mjs`. Every figure
below came out of it. Run it on your own corpus and your own machine; if your numbers differ from
these, your numbers are the ones that apply to your project.

---

## The short answer

**Nothing is wrong with a PNG above roughly a hundred megabits a second.** Below that, on the same pixels, it costs
this engine up to 34 seconds per character.

PNG is not a bad format here. It is a **different point on the same curve**: it is 1.82× the bytes
of a lossless WebP and it decodes 2.7× faster. Those two facts cancel out at a specific connection
speed, and that speed is the whole answer. Which side of it you live on decides the format.

There is a second answer that has nothing to do with bytes, and it is the one that actually governs
this codebase. It is in [§5](#5-the-axis-that-decides-it-here-alpha-moves-the-feet).

---

## 1. What was held constant

The most common way to get this comparison wrong is to compare a **lossless PNG** against a **lossy
WebP** and call the difference a format win. It isn't; it's a comparison of two different questions.
So the experiment is split.

**Track A — one variable: the file extension.** Same source pixels, same encoder (libvips via
sharp), same machine, same 37 frames. Every format is asked for its **lossless** mode. Because they
are all lossless, they must all hand back the same pixels — and that is _checked_, per frame, by
SHA-256 over the decoded RGBA buffer, not assumed.

**Track B — a different question:** what does giving up losslessness buy, and what does it cost?
PNG has no lossy mode, so PNG cannot enter Track B at all. What _can_ enter, and does, is
**PNG quantised to a 256-colour palette** — because that is what a shipped PNG sprite set usually
turns out to be once it has been through an optimiser.

Formats that cannot carry an 8-bit alpha channel were disqualified before any byte was counted,
by capability rather than by size. Measured on a real sprite, not recalled from memory:

| candidate     | verdict                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `.jpeg`       | disqualified — max alpha delta **255**. No alpha channel at all.                                     |
| `.gif`        | disqualified — max alpha delta **127**. 1-bit alpha only; a soft edge becomes a hard one.            |
| `.jxl`        | not tested — `jxlsave_buffer` is not compiled into this libvips build.                               |
| `.heif` (AV1) | byte-identical to `.avif` — it is the same codec in a different container. Folded into the AVIF row. |

---

## 2. Track A — lossless only, one variable

37 frames, one per (canvas size × sprite group), out of the 359 the game ships.

| ext     |         total | vs `.webp` | decode (median) | pixels identical | max alpha delta | foot line moved |
| ------- | ------------: | ---------: | --------------: | ---------------: | --------------: | --------------: |
| `.webp` | **3 843 KiB** |      1.00× |         9.42 ms |   37/37 visually |               0 |            0/37 |
| `.avif` |     4 844 KiB |      1.26× |    **28.50 ms** |      37/37 exact |               0 |            0/37 |
| `.tiff` |     6 422 KiB |      1.67× |         3.83 ms |      37/37 exact |               0 |            0/37 |
| `.png`  | **7 012 KiB** |  **1.82×** |     **3.54 ms** |      37/37 exact |               0 |            0/37 |

Three things worth stating plainly, including the one that favours PNG:

**PNG is the largest of every format that qualifies.** Not "bigger than WebP" — bigger than all of
them, including TIFF with plain deflate.

**PNG is also the fastest to decode, by a wide margin.** 3.54 ms against WebP's 9.42 ms — 2.7×
quicker, and quicker than every other format measured. That is a genuine advantage and it is not a
small one; §3 is about what it is worth.

**AVIF is dominated in lossless mode.** It is 1.26× WebP's size _and_ 3.0× its decode time — worse
on both axes at once, so there is no connection speed at which lossless AVIF is the right answer
here. Its case is in Track B, not this one.

> **On the "37/37 visually" in the WebP row.** Lossless WebP returns a different SHA-256 to the
> source on 34 of 37 frames while every alpha value and every visible colour matches exactly. The
> difference is entirely in the RGB stored _underneath fully transparent pixels_ — a value no
> renderer samples and every codec is free to invent. The experiment reports both numbers rather
> than picking the flattering one.

---

## 3. Where the two effects cancel

PNG costs bytes and saves decode time. That is not a rhetorical draw — there is a connection speed
where the two cancel exactly, and it falls out of the numbers above.

```
per frame, lossless .png against lossless .webp
  png costs   +85.7 KiB
  png saves    -6.87 ms of decode

  break-even = 85.7 KiB / 6.87 ms = 12.5 KiB/ms = 102 Mbit/s
```

**Below that speed the extra bytes cost more time than the slower decode, and WebP wins.
Above it, transfer is nearly free, decode dominates, and PNG wins.**

> **The crossing is a band, not a point, and the band is wide.** The byte figures are exact —
> every total in this document came back identical to the byte on all three runs. The decode
> figures did not. Three runs on the same machine gave 5.99, 6.23 and 6.87 ms of saving, putting
> the crossing at **117, 113 and 102 Mbit/s**.
>
> So the honest figure is "somewhere around a hundred megabits", with about ±10% of slop in it, and
> any crisper number — including one quoted out of this document — deserves suspicion. What does
> survive all three runs unchanged is the shape: WebP wins by tens of seconds on mobile, the two
> are a coin-flip on home broadband, and PNG wins on fibre and on a warm cache. That is the part
> worth carrying away.

Modelled on one character entering the adventure scene — 80 frames, at the sample's mean frame
size for each format:

| connection                 | `.webp` |  `.png` | winner                          |
| -------------------------- | ------: | ------: | ------------------------------- |
| 3G, 1.6 Mbit/s             | 43.41 s | 77.94 s | **`.webp` by 34.54 s**          |
| 4G, 15 Mbit/s              |  5.40 s |  8.60 s | `.webp` by 3.19 s               |
| home broadband, 100 Mbit/s |  1.55 s |  1.56 s | `.webp` by 0.01 s — a dead heat |
| fibre, 500 Mbit/s          |  1.00 s |  0.56 s | **`.png` by 0.44 s**            |
| fully cached, no transfer  |  0.87 s |  0.32 s | **`.png` by 0.55 s**            |

So the answer to the four words is not "PNG is wrong." It is: **this game's players are on the left
half of that table, and the format follows the players.** On a fibre line, or on a repeat visit
where every byte is already cached and only decode remains, the answer flips and the file should be
a PNG. Nothing about the format changed; the connection did.

---

## 4. Track B — what losslessness costs, and the trap

Same 37 frames. `.png 256c` is a PNG quantised to a 256-colour palette.

| ext         |     total | vs `.webp` lossless |   decode | max alpha delta | foot line moved |
| ----------- | --------: | ------------------: | -------: | --------------: | --------------: |
| `.webp q90` | 1 225 KiB |               0.32× | 10.97 ms |           **0** |        **0/37** |
| `.webp q80` |   892 KiB |               0.23× | 10.81 ms |           **0** |        **0/37** |
| `.avif q65` |   740 KiB |               0.19× | 16.48 ms |              18 |            1/37 |
| `.avif q50` |   519 KiB |               0.14× | 16.75 ms |              33 |        **5/37** |
| `.png 256c` | 1 846 KiB |               0.48× |  3.54 ms |          **74** |            1/37 |

The last row is the one to look at. **Quantised PNG is 1.51× the size of lossy WebP at q90 while
damaging the alpha channel by up to 74 levels** — larger _and_ less faithful, at the same time.
It is the worst trade in the table.

That row matters more than it looks, because it is the PNG most projects actually ship. Nobody
serves a 7 MiB lossless PNG set; it goes through a palette optimiser first, and the optimiser is
where the losslessness quietly goes. On a sprite sheet holding **27 244 distinct RGBA values** (§6), a
256-entry palette is not a compression setting. It is a lossy pass wearing a lossless file
extension — and §6 is the same trap, met from the other direction, in this experiment's own code.

---

## 5. The axis that decides it here: alpha moves the feet

Everything above is generic. This part is not, and it is why this engine's answer is not
transferable to yours without re-measuring.

This renderer does not read a hand-authored anchor point. It finds the character's **foot line by
scanning the alpha channel** — lowest row with alpha > 8 — and derives sprite height, world size,
and ground-shadow placement from it. The instrument is `measureFrame()` in
`src/game/spriteContract.test.ts:186-209`, and the threshold comes from the project's sprite design
standard.

Version 0.19.0 of this game spent an entire release getting that number to land at **356.0000
across all ten sprite families**, inside a 2.16 px band, after shipping for months with the ground
shadow rendering at the characters' knees.

So the alpha channel here is not a transparency mask. It is **load-bearing geometry**. Re-run the
same instrument on each candidate encoding and the ranking changes completely:

| encoding                                                     | max alpha delta | frames whose foot line or height moved |
| ------------------------------------------------------------ | --------------: | -------------------------------------: |
| `.png`, `.webp`, `.avif`, `.tiff` — all lossless             |               0 |                                 0 / 37 |
| `.webp q90`, `.webp q80` — lossy colour, `alphaQuality: 100` |           **0** |                             **0 / 37** |
| `.png 256c`                                                  |              74 |                                 1 / 37 |
| `.avif q65`                                                  |              18 |                                 1 / 37 |
| `.avif q50`                                                  |              33 |                             **5 / 37** |

**AVIF at q50 is the smallest file in the entire experiment — 0.14× — and it silently moves the
declared foot line on 13.5% of frames.** A character would float above their own shadow, in a way
no visual diff would flag and no test would catch unless somebody had written that test first.

And the row that resolves the whole thing: **lossy WebP with `alphaQuality: 100` perturbs the alpha
channel by exactly zero** while cutting the file to 0.32×. It is lossy in colour and exact in the
one channel this engine measures geometry from. That is not a general property of WebP being good;
it is a property of _this_ renderer's constraint meeting _that_ encoder flag.

---

## 6. A trap I walked into while running this

The first version of this experiment reported `erlang-shen-attack-v1-0` as 34 KiB of PNG against
36 KiB of WebP and concluded PNG was _smaller_. The true lossless PNG of that frame is **151 031
bytes** — 4.3× what was reported, and by far the largest of the four. The first answer was wrong by
more than the margin it claimed to have found, and it was wrong in PNG's favour.

sharp's PNG encoder takes an `effort` option. Setting it **silently switches on palette
quantisation**. Measured on `erlang-shen-attack-v1-0.webp`, a sheet holding **27 244 distinct RGBA
values** — a PNG palette holds at most 256:

| png options                                |   bytes | pixels identical | colours out |
| ------------------------------------------ | ------: | ---------------: | ----------: |
| `png()` defaults                           | 150 950 |          **yes** |      27 244 |
| `png({ compressionLevel: 9 })`             | 151 031 |          **yes** |      27 244 |
| `png({ palette: false })`                  | 151 031 |          **yes** |      27 244 |
| `png({ compressionLevel: 9, effort: 10 })` |  34 962 |           **no** |         256 |
| `png({ palette: true })`                   |  35 765 |           **no** |         256 |

A knob whose name means "try harder" gave a file 4.3× smaller by throwing away 99.1% of the
colours, and reported nothing. Across the whole sample that costs up to **74 levels of alpha** —
the `.png 256c` row in §4. That is the same failure mode as §4, met from the other direction: the
measurement was wrong in PNG's _favour_, and only a pixel-identity check caught it.

Which is the actual moral of the whole exercise. Not that one extension beats another — that
**image assets have no compiler.** A wrong sprite still renders. It ships, it looks fine, and it is
found months later by a person squinting at a screen saying something looks off.

---

## 7. What this does not show

- **Decode times are libvips 8.18.3 on one Windows machine, not a browser.** Browsers use different
  decoders, may decode off the main thread, and may hardware-accelerate. The crossing is derived
  from these decode numbers and moves with a browser's real decode cost. It is a measured figure
  with an environment attached, not a constant — and on this machine alone it wandered from 102 to
  117 Mbit/s across three runs, which is the honest width of it.
- **The byte columns reproduce exactly; the decode columns do not.** Every total in §2 and §4 came
  back identical to the byte on all three runs. Decode medians moved by up to 15%. If your re-run
  disagrees on bytes, something real differs; if it disagrees on decode, that is the machine, and
  this document's own three runs disagree with each other by more than most people would guess.
- **37 frames, not 359.** One frame per (canvas size × sprite group), so every distinct sheet in
  the game is represented once — but a group's heaviest frame is not.
- **Encoder settings are one reasonable choice each**, not a per-format optimisation contest. A
  tuned `pngcrush`/`oxipng` pass would shave PNG further; a tuned AVIF effort setting would trade
  more encode time for fewer bytes. Both would move the numbers and neither would move the ranking
  by an order of magnitude.
- **No GPU measurement is needed, and none is given.** Decoded RGBA is 4 bytes per pixel in every
  row of every table above — the 37-frame sample is **50.5 MiB of texture, identical for all nine
  encodings**. The file extension does not touch VRAM. Any argument about format and memory is
  about _transfer and decode_, never about what the GPU holds.
- **Browser support was read, not assumed, and the sources disagree.** caniuse gives AVIF as
  Chrome 85 / Edge 121 / Firefox 93 / Safari 16.4 / iOS Safari 16.0; MDN gives Safari 16.1. Either
  way AVIF sits inside this project's own build floor (`vite.config.ts:53` targets
  `chrome111, edge111, firefox114, safari16.4, ios16.4`), so support is not what rules it out here
  — decode time and the alpha drift are.

---

## 8. What the experiment found about this repository, incidentally

The 359 shipped frames are **all lossy WebP** — zero lossless. Nobody chose that, and nobody chose
the quality either: **bytes per pixel ranges from 0.056 to 0.338 across sprite groups, a 6× spread
on the same content type through the same engine.**

| group                 | frames | bytes/px |    total |
| --------------------- | -----: | -------: | -------: |
| `erlang-shen-skill-1` |     16 |    0.338 | 1.69 MiB |
| `pigsy-idle`          |     24 |    0.324 | 1.10 MiB |
| `erlang-shen-v6-idle` |     25 |    0.115 | 0.90 MiB |
| `walk/pigsy-walk-up`  |      8 |    0.057 | 0.14 MiB |

Two Erlang Shen sheets, same character, same canvas, differ by 2.9×. Each batch got whatever its
tool happened to do that day. **That is a larger and cheaper win than any format change in this
document** — and it is not a format problem at all.

---

## Environment and reproduction

```
sharp        0.35.3
libvips      8.18.3   (aom 3.14.1 for AVIF; jxlsave not built)
Node         24.18.0
OS           Windows 11
corpus       public/characters/**/*.webp — 359 frames, 13.11 MiB
sample       37 frames, one per (canvas size x sprite group)
commit       b924b6f
runs         3 — every table above is the third; the other two agreed on bytes
             to the byte and disagreed on decode by up to 15%
```

```bash
node tools/sprite-format-experiment.mjs
```

Read-only. It encodes to memory buffers and writes nothing into `public/`. The whole run takes
around twenty minutes, most of it in the AVIF encoder and in decoding each candidate five times
to take a median.

Every number in this document came out of that script except the browser-support rows, which came
from caniuse and MDN and are cited as disagreeing above.
