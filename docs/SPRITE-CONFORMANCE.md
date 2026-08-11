# SPRITE CONFORMANCE RECORD

**This repository, measured against `docs/SPRITE-DESIGN-LOCK.md`. Last measured 2026-08-11 against
master `ac1cc3b`.**

The design lock states the rules and carries no project data. This file states what this project ships,
where each value came from, and every place the project currently fails its own lock. Rule IDs (`L1`,
`A3`, `E1`, `B` …) refer to that document.

**Two labels are used throughout and never mixed:**

- **MEASURED-LIVE** — read off the running product in a browser, on production, in a real session.
- **COMPUTED** — derived from files or from other numbers. Correct arithmetic is not an observation.

---

## Frame inventory

Byte-level scan of every `.webp` under `public/characters`.

**Seven canvas sizes ship. An earlier reading assumed two, and several conclusions rested on that.**

| canvas      |   files | notes                               |
| ----------- | ------: | ----------------------------------- |
| 640 × 512   |     233 |                                     |
| 396 × 376   |      96 | the re-cropped set                  |
| 512 × 512   |      13 | **power-of-two** — relevant to `A2` |
| 800 × 640   |       6 |                                     |
| 1200 × 960  |       6 |                                     |
| 627 × 627   |       4 | odd on both axes                    |
| 1194 × 1317 |       1 | odd on both axes                    |
| **total**   | **359** | **13.11 MiB across 40 groups**      |

`A2` upper ceilings are not close: the largest shipped dimension is 1317 px against a 8192 px engine
ceiling — 6.2× headroom.

**"257 frames" has three meanings. State which one every time.**

| count | groups | what it is                                                      |
| ----: | -----: | --------------------------------------------------------------- |
|   257 |     10 | the adventure-scene preload set — 96 of them on 396 × 376       |
|   287 |     14 | everything referenced from code, including `spriteSequences.ts` |
|   359 |     40 | everything in the directory                                     |

---

## `L1` — aspect ownership · **VIOLATION**

Four consumers read the same art. An earlier reading counted three and described the fourth as
hypothetical; it already exists, and it is the one that gets this right.

| consumer                                      | pinned aspect                                       | status                               |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| `AdventureScene/WukongAdventure.tsx`          | none — 340 × 420 box, `object-fit: contain` decides | silent size change                   |
| `CharacterRoster/CharacterPreview.module.css` | `.figure { aspect-ratio: 396 / 376 }`               | correct — matches its art            |
| `LobbyScene/CharacterModel.tsx`               | `planeGeometry args={[4.018, 3.213]}` = 1.25054     | **VIOLATION**                        |
| `BattleScene/EntitySprite.tsx`                | `ENTITY_SPRITE_ASPECT = 1.2508`                     | correct — fed by a calibration table |

**`CharacterModel` violates both halves of `L1`.**

1. **Aspect mismatch, COMPUTED: 18.738%** while a 396 × 376 sheet is displayed — which is the idle loop
   of 6 of 7 kinds, 72 frames. Its action frames (26) and all 33 spear-warrior frames are 640 × 512 and
   mismatch by 0.04%. **So it pops**: stretched during idle, snapping to 1:1 the instant an action frame
   plays. **Never observed — the component was not located on screen during the live session.**
2. **Provenance missing.** The number appears at **`CharacterModel.tsx:160` and `:164`** — the crossfade
   mesh pair — with no comment at either site. Any compensation must be applied twice or the two meshes
   disagree.

---

## `L2` — record the crop, walk every consumer · **PARTIALLY SATISFIED**

`src/game/realtimeBattle/entitySpritePresentation.ts` already holds per-family canvas and anchor
constants, measured by alpha scan and covered by a test. **An earlier reading claimed the original
geometry survived only in git history and that this repo did not do what the industry does. Both were
false** — the mechanism exists, it just has one consumer.

### `ff67fb1` (2026-08-08) — cleared of the charge

The re-crop of 96 frames from 640 × 512 to 396 × 376 was suspected of destroying per-frame anchor
consistency. Measuring the same set before and after that commit:

```
monkey-turn, before ff67fb1 (640x512)   foot line spread 51px   foot centre spread 85px
monkey-turn, after  ff67fb1 (396x376)   foot line spread 51px   foot centre spread 85px
```

**Identical on both axes.** The crop used one rect for the whole set and preserved relative geometry
exactly — the behaviour the design lock names as anchor-preserving. The inconsistency was in the art
from the day it was drawn.

What `ff67fb1` actually omitted is the second half of `L2`: it updated its own consumer's pinned aspect
in the same commit and told **neither of the other two**.

---

## `E3` — derived world size · **the mechanism is already here, with two of four consumers using it**

`src/game/realtimeBattle/entitySpritePresentation.ts` implements `E3` in full and has since before the
design lock existed. Its calibration record is exactly the shape the convention describes:

```ts
interface SpriteSheetCalibration {
  pathFragment: string
  canvasWidth: number
  canvasHeight: number
  /** Family-specific source pixels that equal one canonical world-space height. */
  pixelsPerCanonicalHeight: number
  /** Average transparent rows below the feet for this animation family. */
  bottomInsetPx: number
}
```

`pixelsPerCanonicalHeight` is Unity's `pixelsPerUnit` and Godot's `pixel_size` under a local name;
`bottomInsetPx` is `E1`'s foot offset in the same record, as `E3` requires. `ENTITY_SPRITE_HEIGHT = 1.6`
is the canonical world height each family converts into. **18 families are registered**, every value
alpha-scanned rather than guessed.

**So this project did not copy the convention — it arrived at it independently, and the two vendors
corroborate the choice.** That is stronger evidence than adoption would have been, and it is why `E3`
is stated in the lock as a convergence rather than as an import.

| consumer                                      | conforms to `E3` | how                                                                                          |
| --------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `BattleScene/EntitySprite.tsx`                | **yes**          | reads the calibration table; `ENTITY_SPRITE_ASPECT` is a fallback, not the source of truth   |
| `CharacterRoster/CharacterPreview.module.css` | **n/a**          | 2D DOM, no world units — its pinned `aspect-ratio` is the DOM equivalent and matches its art |
| `LobbyScene/CharacterModel.tsx`               | **NO**           | `planeGeometry args={[4.018, 3.213]}` hand-typed at three sites; ignores the table entirely  |
| `AdventureScene/WukongAdventure.tsx`          | **NO**           | a fixed CSS box with `object-fit: contain` deciding size, and a hardcoded anchor             |

**This reclassifies the open work.** `#100`/`#106` are not "design a mechanism and tune numbers" —
they are "extend a table that already exists to the two consumers that never read it". Smaller, and
with far less room to invent something inconsistent.

**What is still genuinely unmeasured** is small and named: the four turnaround families have no
calibration row yet. They were measured during the blocked dispatch — `monkey-turn` 377/23,
`pigsy-turn` 367/19, `tripitaka-turn` 406/25, `spear-warrior-stop-turn` 296/37, each normalised to its
own character's idle sheet by the rule the walk rows already use. Those numbers exist in that agent's
report only; they are recorded here so they are not re-derived.

---

## `A3` — block compression · **N/A today**

The project ships WebP, not GPU-compressed textures. Binding on a mobile port or a move to
KTX2/Basis, at which point the specification is re-read rather than trusted from any page here.

Recorded so it is not re-derived: **two of the seven shipped canvases are odd on both axes**
(627 × 627, 1194 × 1317). Under the design lock's corrected reading this costs edge-block quality, not
encodability.

---

## `A-port P1` — RAM ceiling · **COMPUTED 98.18 MiB per character**

```
640 x 512  ->  1,310,720 B  =  1.25  MiB decoded
396 x 376  ->    595,584 B  =  0.568 MiB decoded

per character:  64 walk @ 640x512   80.00 MiB
                 8 turn @ 396x376    4.55 MiB
                24 idle @ 396x376   13.63 MiB
                                    -------
                                    98.18 MiB
```

An earlier reading gave 120 MiB by treating all 96 frames as 640 × 512 — the pre-`ff67fb1` shape, which
no shipped character matches.

**Ceiling, not usage.** Never measured; browsers evict decoded bitmaps.

---

## `A-port P2` — resolution floor · **COMPUTED, worst case 2.68×**

The `.actor` box is 340 CSS px **multiplied by a depth scale of 0.8–1.04**, so the real box is
272–354 CSS px.

| state    | source width | DPR 2 |     DPR 3 |
| -------- | -----------: | ----: | --------: |
| walking  |          640 | 1.06× |     1.59× |
| standing |          396 | 1.72× | **2.68×** |

Two earlier errors, both corrected: only the walk frames are 640 px wide, so 1.59× was the **best** case
quoted as the only case; and the box was treated as a flat 340 px when the depth scale makes it a range.
**None of the four factors is an integer** — the condition Godot documents as distorting for this class
of art.

---

## `B` — the project's own values

| slot                      | value     | provenance                                           |
| ------------------------- | --------- | ---------------------------------------------------- |
| walk canvas               | 640 × 512 | script lineage, 10 revisions in ~8 hours, 2026-08-06 |
| turn / idle canvas        | 396 × 376 | `ff67fb1`, cropped to serve `CharacterPreview`       |
| directions                | 8         | `DIRECTIONS` in `WukongAdventure.tsx:48-57`          |
| frames per walk direction | 8         | `FRAME_COUNT = 8`, line 29                           |
| turn frames               | 8         | numbered, see below                                  |
| idle frames               | 24        | shipped in 6 of 7 kits                               |

> An earlier reading called the canvas "two independent provenances" by counting
> `planeGeometry [4.018, 3.213]` as the second. It is not independent — the plane was derived **from**
> the canvas. One source, one consumer.

### `B2` — the turn set is addressed by NUMBER, and the order is load-bearing

`TURN_INDEX` maps direction to the file's trailing number directly:

```
0  down          4  up
1  down-right    5  up-left
2  right         6  left
3  up-right      7  down-left
```

**The walk set is addressed by NAME and the turn set by NUMBER, and the two orders differ.** A document
that lists directions starting at `up` and hands that list to an artist puts the up-facing pose in slot
0, where the code expects down-facing — **the whole game faces the wrong way, with no error**. This was
shipped in an external-facing document once and corrected.

### `B3` — idle sampling · the safe floor is 8, not 22 and not 19

`WukongAdventure.tsx:455` — `idleFrame = (view.frame * 3) % kit.idleCount`, and `view.frame` only ever
runs 0–7.

- **Reachable frames at `idleCount = 24`: {0, 3, 6, 9, 12, 15, 18, 21} — 8 of 24.**
  **16 frames are preloaded and never drawn in this scene.** They do serve `CharacterPreview`, which
  animates all 24.
- Idle playback is further limited to `direction === 'down'`; standing in any other facing shows a turn
  frame.
- Cadence 170 ms per step, so the visible loop is 8 frames / 1.36 s.
- **Safe counts: 8, 10, 11, 13, 14, 16, 17, 19, 20, and everything ≥ 22.** Unsafe: below 8, and 9, 12,
  15, 18, 21.

> This value has now been corrected twice — first from 22 to 19, then to 8. The 22 figure is where
> safety becomes _monotonic_, which is a different statement from the minimum. 24 remains the
> recommendation as the shipped convention; the code permits far more.

The constant `3` is explained nowhere in the repository and is the entire reason 24 became convention.

---

## `E1` — bottom-centre anchor · **VIOLATION, and the exemplar is in-repo**

The adventure scene y-sorts by `zIndex: Math.round(view.y)`, so it already depends on a foot anchor
whether or not that was written down.

**MEASURED-LIVE**, production, logged in, DPR 1.25, box 309.7 × 382.5 under
`matrix(0.910769, 0, 0, 0.910769, 594, 184.195)`:

|                                                   | box units (of 420) | viewport px at scale 0.9108 |
| ------------------------------------------------- | -----------------: | --------------------------: |
| code anchor (`transform-origin: 50% 356px`)       |                356 |                       540.2 |
| shadow ellipse centre (`bottom: 52px`, height 36) |                350 |                       534.7 |
| feet, standing                                    |              408.8 |                       588.3 |
| feet, walking                                     |              385.5 |                       567.5 |

**Confirmed by eye.** With the sprite dimmed and `.shadow` outlined, the shadow sits across the
character's thighs. In normal view no ground shadow is visible at all — the character's own body covers
it (shadow `z-index: 1`, sprite `z-index: 3`).

**The gap changes by 20.8 px when walking starts**, while the head drops ~91 px. The character does not
merely change size; its footing shifts against the ground.

### Foot-line and foot-centre spread, measured per set

Measured on the **foot band** — the bottom 12 rows of alpha, i.e. the ground-contact patch. Whole-
silhouette centre is the wrong instrument: a staff or tail moves the bounding box without moving the
feet.

| set                           | kind |                            foot-line spread | foot-centre spread |
| ----------------------------- | ---- | ------------------------------------------: | -----------------: |
| `monkey-v2-idle`              | idle |                                           0 |                  0 |
| `tripitaka-idle`              | idle |                                           0 |                  0 |
| `erlang-shen-v6-idle`         | idle |                                           0 |                5.5 |
| `pigsy-idle`                  | idle |                                           1 |                  3 |
| **`spear-warrior-stop-turn`** | turn |                                       **0** |                8.5 |
| `spear-warrior-stop-turn-key` | turn |                                           0 |                 32 |
| `pigsy-turn`                  | turn |                                          12 |                 25 |
| `tripitaka-turn`              | turn |                                          31 |                 88 |
| `monkey-turn`                 | turn |                                          51 |                145 |
| `monkey-walk`                 | walk |  2 in-direction · **1.1 across directions** |  43.5 in-direction |
| `pigsy-walk`                  | walk | 12 in-direction · **5.6 across directions** |    49 in-direction |

**`spear-warrior-stop-turn` holds 0 px on the foot line and is the in-repo exemplar** — the one turn set
`ff67fb1` never touched. It proves the standard is reachable here.

**For walk sets, read the across-directions column, not the in-direction one.** A foot legitimately
lifts during a stride; what should not move is where each direction's cycle sits relative to the others.

### Scored against the anchor tolerance register — every shipped group

The design lock's anchor tolerances were built from external corpora only (314 sets, character
heights 24-82 px) and this project's art was scored against them afterwards. Building the ceiling
from a pool containing the sets under judgement would let the defective sets widen the band meant to
catch them.

**21 groups measured · 15 PASS · 4 FAIL · 2 deliberately unclassified.**

A turn set is eight single-frame directions, so it is the **xDir pose-hold** case: the body is
planted in every frame and only the facing changes. Ceiling ±1 px.

| group                                | kind       | canvas   |      inDir |    xDir | verdict                      |
| ------------------------------------ | ---------- | -------- | ---------: | ------: | ---------------------------- |
| `monkey-turn`                        | pose-hold  | 396×376  |      51 px |   51 px | **FAIL — 51× over**          |
| `tripitaka-turn`                     | pose-hold  | 396×376  |      31 px |   31 px | **FAIL — 31× over**          |
| `pigsy-turn`                         | pose-hold  | 396×376  |      12 px |   12 px | **FAIL — 12× over**          |
| `pigsy-walk`                         | locomotion | 640×512  |      3.69% | 5.63 px | **FAIL — 2.8× over on xDir** |
| `monkey-v2-idle`                     | pose-hold  | 396×376  |          0 |       — | PASS                         |
| `tripitaka-idle`                     | pose-hold  | 396×376  |          0 |       — | PASS                         |
| `erlang-shen-v6-idle`                | pose-hold  | 640×512  |          0 |       — | PASS                         |
| `pigsy-idle`                         | pose-hold  | 396×376  |       1 px |       — | PASS                         |
| `spear-warrior-stop-turn`            | pose-hold  | 640×512  |          0 |   **0** | PASS                         |
| `spear-warrior-stop-turn-key`        | pose-hold  | 640×512  |          0 |   **0** | PASS                         |
| `monkey-walk`                        | locomotion | 640×512  |      0.68% | 1.13 px | PASS                         |
| `erlang-shen-attack-v1`              | action     | 640×512  |          0 |       — | PASS                         |
| `erlang-shen-skill-2-cast`           | action     | 800×640  |          0 |       — | PASS                         |
| `monkey-v2`                          | action     | 640×512  |          0 |       — | PASS                         |
| `pigsy-team`                         | action     | 640×512  |      0.59% |       — | PASS                         |
| `erlang-shen-normal-attack-v3-final` | action     | 640×512  |      2.82% |       — | PASS                         |
| `erlang-shen-normal-attack-v2`       | action     | 640×512  |      3.78% |       — | PASS                         |
| `erlang-shen-skill-1`                | action     | 640×512  |      7.89% |       — | PASS                         |
| `monkey-attack-new`                  | action     | 1200×960 | **22.79%** |       — | PASS — narrowly, ceiling 23% |
| `aura`                               | —          | 512×512  |      3.14% |       — | **UNCLASSIFIED**             |
| `hound`                              | —          | 512×512  |     34.97% |       — | **UNCLASSIFIED**             |

**The three turn sets are the worst conformance failures in the repository**, and they fail the
strictest band there is — the one for animations where the body does not move at all, so nothing
about the animation excuses the drift. `spear-warrior-stop-turn` holds 0 px on both axes and
proves the band is reachable here, with this project's own tools.

`monkey-attack-new` is the case that justifies keeping two different kinds of ceiling.
Measured in absolute pixels it drifts 129 px and would read as a 14× failure; measured as a fraction
of its own character height it is 22.79% against a 23% ceiling, and passes. A larger character's
swing really does cross more pixels, and forcing one formula across both alignment error and
depicted movement would have condemned correct art.

**Two groups carry no verdict on purpose.** `aura` and `hound` could not be classified
into an animation kind from their names and code references with confidence, and the kind decides the
ceiling — a wrong kind silently applies the wrong standard, which is worse than no verdict. They need
a human to say what they depict before they can be scored.

### Lossless frames still shipping

Five groups, **3,546 KiB**, all VP8L: `aura`, `hound`, `erlang-shen-skill-1`,
`erlang-shen-skill-2-cast`, `erlang-shen-normal-attack-v3-final`. Any rule forbidding
lossless is violated by this repository on the day it is written; either the exception is stated or
these are re-encoded.

---

## PRESENT — PR #113, measured against the same lock

> head `DemoGODRTX/LegendOfSoulTH-1@466e1e8b` · open at the time of this measurement.
> Full point-by-point review: see the reviewer's conformance note for that PR.

**This is the first PR in this repository to satisfy L1 the way the lock intends.** It ships three
different canvases for one character and registers each one in the calibration table, rather than
forcing the art to one size or letting a pinned aspect stretch it.

| set                     | kind       | canvas  |                 foot line | ceiling | verdict |
| ----------------------- | ---------- | ------- | ------------------------: | ------: | ------- |
| `monkey-king-v4/idle`   | pose-hold  | 640×512 | **0 px across 12 frames** |   ±1 px | PASS    |
| `monkey-king-v4/attack` | action     | 640×640 |              7 px = 2.11% |   ≤ 23% | PASS    |
| `monkey-king-v4/run`    | locomotion | 512×512 |             13 px = 4.53% |   ≤ 27% | PASS    |

Its declared calibration reproduces under an independent alpha scan: visible heights 390.75 / 332.00 /
286.85 match to two decimals, and the declared bottom insets (31 / 20 / 113) all fall inside the
measured per-frame ranges (31 exactly on all 12 idle frames; 16-23 for attack; 105-118 for run).

**Two things this raises for the code, not for the art.** `bottomInsetPx` is one value per family, so
a 20-frame run set whose inset genuinely ranges 105-118 is represented by its mean — the structure
cannot express what the art does. And the new test computes the rendered foot position **from the same
literals the calibration declares**, so it proves the arithmetic rather than the alignment; it would
pass unchanged if every frame were redrawn 20 px higher. Both are the code's limits, exposed by art
precise enough to reach them.

**A new canvas enters the repository with this PR**: 640×640, an eighth distinct size. Not a violation
on the current browser target, but recorded here because every shipped canvas gets re-examined the day
this project moves to GPU-compressed textures.

---

## FUTURE — what makes the lock hold

Nothing above was caught by a gate. Every number on this page came from someone deciding to measure.

**Task #101 is what converts this document from a snapshot into a check.** Canvas size per prefix,
frame count, direction-index ordering, and foot-line spread per animation kind are all computable from
the files alone. A frame-contract test turns four of this page's findings from prose into CI failures,
and turns the design lock from a document people are asked to follow into one the build enforces.

Until that exists, the standing obligations are:

```
new art          scored against the anchor tolerance register before merge, by kind
new consumer     declares its pinned aspect WITH provenance (L1), or does not pin one
re-crop          records the original geometry and walks every consumer, same commit (L2)
new canvas       recorded in the inventory above; the count is now eight
```

**And the ceilings are not targets.** They come from corpora whose characters are 24-82 px tall and
which cannot resolve finer than one pixel. Art drawn at several hundred pixels has an order of
magnitude more room, and the sets in this repository that were made carefully measure **0**.

---

**No external tolerance exists for any of these numbers** — see the design lock's unbounded register.
The band is a project decision and is **still open**.

---

## Size discontinuity · **MEASURED-LIVE +81.5%**

Both states sampled at an identical box and transform, so the source canvas was the only variable:

```
standing   396 x 376   alpha height 320   x 0.78207  =  250.3 px on screen
walking    640 x 512   alpha height 285   x 0.48391  =  137.9 px on screen
                                          250.3 / 137.9 = +81.5%
```

Across characters and frames the range is **+55.8% to +81.5%** — the low end is pigsy, the high end is
monkey. An earlier reading quoted "56–79%", a band that contained neither its own stated inputs nor the
measured value.

**Not fixable by re-normalising the 96 frames**: `ff67fb1` cropped them deliberately for
`CharacterPreview`, which consumes all 24 idle frames correctly. Any fix must satisfy all four consumers
at once.

---

## Delivery · **MEASURED-LIVE, then fixed 2026-08-11**

### What was measured

`WukongAdventure.tsx:81-86` and `:237` — `preload()` was `new Image()` per URL, fired for every frame at
once, with no batching and no priority hint. The `Image` objects were discarded immediately.

```
peak            96 requests inside one second, starting t = 748 ms after navigation
re-fetch        144 requests for 97 distinct URLs = 1.48x
                (idle: 54 requests for 24 files)
per character   96 files, 2.43 MiB on disk, 98.18 MiB decode ceiling
```

### What changed

One change per measured number, in the same file. **Nothing here touches which frames exist** — the
sampling stride and `idleCount` are task #102 and are unchanged.

| was                               | now                                                            |
| --------------------------------- | -------------------------------------------------------------- |
| every URL in one tick             | queue, at most **4 in flight**, next starts on load _or_ error |
| no priority hint                  | `fetchPriority = 'low'` on every preload request               |
| all 24 idle frames                | the 8 this scene can draw, from `idleFrameIndex`               |
| a re-run re-requests the same set | module-level requested-set — each URL requested once           |
| walk first, idle last             | idle → turn → walk, the order the scene actually draws them    |

The sampling expression now lives in **one** function that both the renderer and the preload list call,
so the set that is fetched cannot drift from the set that is drawn. The 24 idle frames are not dead —
`CharacterPreview` animates all of them; they are simply not fetched by a scene that reaches 8.

**COMPUTED** from the shipped files — the preload set per character:

```
monkey-king   96 -> 80 files   2,548,798 -> 2,074,844 B   -462.8 KiB  -18.6%
pig-warrior   96 -> 80 files   2,687,110 -> 1,915,798 B   -753.2 KiB  -28.7%
```

monkey-king's 2,548,798 B is the 2.43 MiB quoted above, reproduced to the byte.

**What is NOT claimed.** No memory saving: 98.18 MiB was a decode ceiling and never a measurement, so
nothing derived from it is one either. The live request timeline has **not** been re-measured — a
browser session is the only instrument for that. What is verified without a browser is the pattern the
code emits: how many URLs, which ones, how many concurrently, in what order, and whether a re-run
re-requests them. `WukongAdventure.test.tsx` pins all five, and each of the three defects was
re-injected to confirm the test goes red (96-at-once → red, all-24-idle → red, no requested-set → 160
requests for 80 URLs → red).

**Cache**: shipped frames return `cache-control: max-age=600` — ten minutes — and filenames carry **no
content hash**, so the lifetime cannot be extended without hashing first. The JS/CSS bundles already get
hashed names from the build; the character art does not. **Untouched by the above** — a preloaded frame
that outlives the TTL is re-fetched exactly as before (#108).

**Compression**: 43 of 359 frames are **VP8L lossless** — 3.55 MiB, **27% of the art payload**, all in
one family. A rule forbidding lossless would be violated by the repository on the day it was written;
either the exception is stated or those files are re-encoded.

---

## Open violations

| #   | rule       | what                                                                                |
| --- | ---------- | ----------------------------------------------------------------------------------- |
| 100 | `L1` / `B` | standing renders +81.5% larger than walking — two canvases, one box                 |
| 106 | `E1`       | shadow renders at knee height; foot-to-anchor gap 48.1 px standing, 27.3 px walking |
| 108 | delivery   | `max-age=600` on unhashed immutable art                                             |
| 101 | all        | **nothing in CI asserts any sprite invariant**                                      |
| —   | `L1`       | `planeGeometry [4.018, 3.213]` has no provenance comment at `:160` or `:164`        |
| —   | `B3`       | the sampling constant `3` is undocumented                                           |
| —   | delivery   | 43 lossless frames vs an unwritten no-lossless rule                                 |

**The rest are held pending the owner's sprite go-ahead.** The lock ships; conformance does not.

**Closed 2026-08-11 — #107** (`L2` / delivery), the one violation above that was purely the code's own
scheduling and needed no art decision: the burst, the re-fetch and the 16 undrawn frames are all gone,
and the policy is pinned by test. See the Delivery section above for what is and is not claimed. It is
also the reason **#107 no longer carries the 8-vs-12 run-cycle question with it** — see below.

---

## Still unobserved

| quantity                                          | status                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `CharacterModel` idle↔action aspect pop (18.738%) | COMPUTED — the component was never located on screen          |
| DPR floor 2.68×                                   | COMPUTED — never opened on a DPR-3 device                     |
| RAM in use                                        | never measured; 98.18 MiB is a decode ceiling                 |
| run-cycle frame count, 8 or 12                    | undecided — `FRAME_COUNT = 8` constrains it internally        |
| foot-line tolerance band                          | open — no external source exists, so it is a project decision |

The 8-vs-12 row is still undecided, but it is **no longer a delivery argument**. It was being weighed
partly on what 32 more frames per character would do to the 96-request burst; the burst is now a 4-deep
queue, so more frames lengthen the queue instead of widening the spike. That removes a reason against
12 — it supplies no reason for it. What is left is how the walk cycle should look, which is the owner's.
