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

### Scored against the anchor tolerance register

The design lock's anchor tolerances were built from external corpora only (314 sets, character heights
24-82 px) and this project's sets were scored against them afterwards. Building the ceiling from a pool
containing the sets under judgement would be circular.

A turn set is eight single-frame directions, so it is the **xDir pose-hold** case: the body is planted
in every frame and only the facing changes. Ceiling **±1 px**.

| set                                                         | kind       | axis  |         drift | ceiling | verdict              |
| ----------------------------------------------------------- | ---------- | ----- | ------------: | ------: | -------------------- |
| `spear-warrior-stop-turn`                                   | pose-hold  | xDir  |             0 |       1 | PASS                 |
| `spear-warrior-stop-turn-key`                               | pose-hold  | xDir  |             0 |       1 | PASS                 |
| `monkey-v2-idle` · `tripitaka-idle` · `erlang-shen-v6-idle` | pose-hold  | inDir |             0 |       1 | PASS                 |
| `pigsy-idle`                                                | pose-hold  | inDir |             1 |       1 | PASS                 |
| `monkey-walk`                                               | locomotion | xDir  |          1.13 |       2 | PASS                 |
| `monkey-walk`                                               | locomotion | inDir |  2 px = 0.68% |   ≤ 27% | PASS                 |
| `pigsy-walk`                                                | locomotion | xDir  |          5.63 |       2 | **FAIL — 2.8× over** |
| `pigsy-walk`                                                | locomotion | inDir | 12 px = 3.69% |   ≤ 27% | PASS                 |
| `pigsy-turn`                                                | pose-hold  | xDir  |            12 |       1 | **FAIL — 12× over**  |
| `tripitaka-turn`                                            | pose-hold  | xDir  |            31 |       1 | **FAIL — 31× over**  |
| `monkey-turn`                                               | pose-hold  | xDir  |            51 |       1 | **FAIL — 51× over**  |

**The three turn sets are the worst conformance failures in the repository**, and they fail the
strictest band there is — the one for animations where the body does not move at all, so nothing about
the animation excuses the drift. `spear-warrior-stop-turn` holds 0 px on both axes and proves the band
is reachable here, with this project's own tools.

Action sets are scored on the proportional band, because a larger character's swing really does cross
more pixels. On that basis `monkey-attack-new` measures 22.79% of character height against a ≤ 23%
ceiling — inside, narrowly. Scored in absolute pixels it would read as a 14× failure, which is why the
design lock separates alignment error from depicted movement instead of forcing one formula.

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

## Delivery · **MEASURED-LIVE**

`WukongAdventure.tsx:81-86` and `:237` — `preload()` is `new Image()` per URL, fired for every frame at
once, with no batching and no priority hint. The `Image` objects are discarded immediately.

```
peak            96 requests inside one second, starting t = 748 ms after navigation
re-fetch        144 requests for 97 distinct URLs = 1.48x
                (idle: 54 requests for 24 files)
per character   96 files, 2.43 MiB on disk, 98.18 MiB decode ceiling
```

**Cache**: shipped frames return `cache-control: max-age=600` — ten minutes — and filenames carry **no
content hash**, so the lifetime cannot be extended without hashing first. The JS/CSS bundles already get
hashed names from the build; the character art does not.

**Compression**: 43 of 359 frames are **VP8L lossless** — 3.55 MiB, **27% of the art payload**, all in
one family. A rule forbidding lossless would be violated by the repository on the day it was written;
either the exception is stated or those files are re-encoded.

---

## Open violations

| #   | rule            | what                                                                                |
| --- | --------------- | ----------------------------------------------------------------------------------- |
| 100 | `L1` / `B`      | standing renders +81.5% larger than walking — two canvases, one box                 |
| 106 | `E1`            | shadow renders at knee height; foot-to-anchor gap 48.1 px standing, 27.3 px walking |
| 107 | `L2` / delivery | 96-request preload burst, 1.48× re-fetch, 16 idle frames never drawn                |
| 108 | delivery        | `max-age=600` on unhashed immutable art                                             |
| 101 | all             | **nothing in CI asserts any sprite invariant**                                      |
| —   | `L1`            | `planeGeometry [4.018, 3.213]` has no provenance comment at `:160` or `:164`        |
| —   | `B3`            | the sampling constant `3` is undocumented                                           |
| —   | delivery        | 43 lossless frames vs an unwritten no-lossless rule                                 |

**All held pending the owner's sprite go-ahead.** The lock ships; conformance does not.

---

## Still unobserved

| quantity                                          | status                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `CharacterModel` idle↔action aspect pop (18.738%) | COMPUTED — the component was never located on screen          |
| DPR floor 2.68×                                   | COMPUTED — never opened on a DPR-3 device                     |
| RAM in use                                        | never measured; 98.18 MiB is a decode ceiling                 |
| run-cycle frame count, 8 or 12                    | undecided — `FRAME_COUNT = 8` constrains it internally        |
| foot-line tolerance band                          | open — no external source exists, so it is a project decision |
