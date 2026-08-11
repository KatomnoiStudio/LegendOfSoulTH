# Asset Attribution — LegendOfSoulTH

> ## ⚠️ DRAFT — INCOMPLETE PROVENANCE RECORD
>
> This file is a **draft prepared for HetCreep's review**. Nothing in it is a legal
> conclusion, a legal opinion, or legal advice — the author is not a lawyer.
>
> It is still a draft for five specific reasons, not as boilerplate caution:
> reference/source images were used and **their original sources are not recorded**;
> **Blender was used and it is unknown whether its 3D models were built or downloaded**, or
> which shipped files are renders (added 2026-08-10 — same severity as the reference-image
> gap); the **Adobe product and channel used in the fitting pass are still unrecorded**, and
> no log of that pass survives; `public/favicon.svg` has **unknown** provenance; and the
> record **covers 253 of 946 tracked assets** in detail — the other 693 have a known author
> but undocumented generation details.
>
> Owner answers folded in 2026-08-10 (HetCreep, recorded with Codex) · Agent: Claude Code
> (credits & legal ship-text seat)
>
> **Revision notes, all 2026-08-10.** A wrong provenance record is worse than an incomplete
> one, so corrections are recorded here rather than quietly overwritten:
>
> - An earlier version stated that no manual editing occurred after generation. **That was
>   wrong** — see [Post-generation editing](#post-generation-editing).
> - The Claude account line was corrected from one Pro plan to three accounts.
> - An earlier version declared the Adobe question **resolved** on the strength of an empty
>   MCP invocation log. **That reasoning was circular** — the same file also recorded that the
>   pass was done by hand in the desktop application, which emits no Connector telemetry
>   either way. Caught by a QC gate before merge; the unknown was reopened.
> - **Retracted: the by-hand desktop claim itself.** The correction above still said the pass
>   was performed by hand in an Adobe desktop application. **The owner has stated the
>   opposite** — the account was connected and *agents* did the work, in Claude Code on this
>   machine, with nothing pressed by hand. That claim was never the owner's; it was inferred
>   from the empty log and published as fact. It is withdrawn.
> - **The "unresolved discrepancy" framing that replaced it is also withdrawn.** The empty log
>   was never in tension with the owner's account: `git` shows the generation was done by
>   `kaoshock123` on a different machine, and most of HetCreep's fitting work predates the
>   earliest retained transcript (2026-08-08). The search looked at the wrong machine and
>   largely the wrong window. The log evidence is **downgraded**, not deleted — see
>   [The Adobe step](#the-adobe-step-and-why-the-transcript-search-proves-nothing-about-it-2026-08-10).
>   **Three revisions in a row read that empty log as though it meant something. It did not.**
> - **The generator is now named.** The questionnaire's author is `kaoshock123`, owner-confirmed
>   — so the answers in this file come from the person who actually ran the tools. The
>   contributor list grew from two to three, and the shipped art's authorship is now measured
>   rather than described — see [Who authored the shipped art](#who-authored-the-shipped-art-measured).
> - An earlier version claimed a 164/191 split of `assets/raw/` between script-written and
>   directly-placed files. **That split was invented** — it did not survive checking against
>   the repo, in either direction. Deleted; per-file routing is not recorded and is not
>   inferable from folder names.
> - An earlier version said no logs of any kind were retained. Too strong — Claude Code
>   session transcripts exist. See [Prompts, seeds, and generation logs](#prompts-seeds-and-generation-logs).
> - **An earlier version credited 20 images to `nustanakritwithai` as their author.** Wrong,
>   and the worst kind of wrong for this document: it named a living person as the author of
>   someone else's work. The byte-tracing rule this file states was applied to `HetCreep`'s
>   mechanical commits but not to theirs. Re-derived blob by blob, all 20 are `kaoshock123`'s
>   — see the correction under
>   [Who authored the shipped art](#who-authored-the-shipped-art-measured). Caught by the QC
>   gate.
> - **An earlier version asserted that Adobe's credit metering is route-independent**, one
>   sentence before saying this file does not characterise Adobe's policy. It is now stated as
>   the **assumption** that pillar (b) depends on, with the consequence spelled out if it is
>   wrong.
> - **A second per-commit split of the 693 was published and is now deleted**, after the first
>   (the 164/191 one) was already retracted. Its `203` double-counted 64 files the `446`
>   bucket also covered and omitted `5aae711`'s 128 entirely, and its `446` was a subtraction
>   remainder rather than a count — contradicting this file's own figure for the same commit.
>   **No third attempt.** A per-commit apportionment is now explicitly declined, and the
>   reason is recorded in place of the numbers.
> - **An earlier version said the retained transcript window "no longer contains the fitting
>   pass."** Not true: `ff67fb1` (2026-08-08, 96 images re-cropped) sits inside it. Two of
>   HetCreep's four asset-touching commits were also missing from the contributor entry
>   entirely. Both corrected; all four are now named with the layer each belongs to.
>
> **Correction after merge — 2026-08-10.** The version of this file that shipped to `master`
> omitted a tool, and not an incidental one:
>
> - **`kaoshock123` also used Blender, and no version of this record mentioned it.** Every
>   tool in the generation list produced 2D images, and the whole analysis is built on 2D
>   generation and its reference inputs. Blender is 3D modelling and rendering — so an
>   unknown share of the shipped art may be **renders of 3D models**, for which the rights
>   question is not "what steered the generator" but **"where did the model come from"**, a
>   question this document had never asked. Two halves are open and neither is guessed at:
>   whether the models were built or downloaded (and under what licence if downloaded), and
>   which files came through Blender at all. Filed as **KNOWN UNKNOWN #10** at the same
>   severity as #1, and added as the second unresolved provenance class in the
>   payment-gateway section. **This is the seventh correction recorded here, and the pattern
>   is the point**: the record's credibility rests on showing what it got wrong, not on
>   having been right the first time.
> - **Retracted before merge: "built from scratch is clean."** The first draft of that
>   Blender entry closed half of a joint-highest unknown in three words, twice — the same
>   over-claiming this file has now retracted seven times, committed while introducing the
>   unknown that was supposed to stay open. It is also contradicted by this document's own
>   body: a from-scratch model can depict another studio's design, its modeller worked from
>   unrecorded reference, and "from scratch" routinely contains downloaded textures, HDRIs,
>   rigs and animations. The narrow true point — **no third-party *model* licence attaches** —
>   is now stated on its own, and **no provenance branch is called clean anywhere in this
>   file.** Caught by the QC gate, which noted that the same draft never once called
>   text-only generation clean.
>
> **2026-08-11 — Sun Wukong v4 replacement added.** Codex recorded the 38 raw PNG inputs,
> 38 shipped WebP derivatives, generator, reference roles, and local processing below in the
> same change as the files. This documents the process; it does not resolve the unknown
> original source of the user-supplied Erlang motion reference or perform a similarity/legal
> review.

---

## Coverage — read this before anything else

**This is not a blanket provenance statement for the project's art.** The owner's own
scope caveat is the governing sentence: the confirmed information *"applies primarily to
the Erlang Shen asset set"* and *"must not be read as a provenance statement for every
historical game asset."*

| Asset set | Files | Provenance status |
| --- | --- | --- |
| **Erlang Shen** (`*erlang-shen*` — 94 shipped `.webp`, 75 `.png` build inputs) | 169 | **Documented** below, to the level the questionnaire could confirm. **156 of the 169 are byte-identical to `kaoshock123`'s own commit** — see [Who authored the shipped art](#who-authored-the-shipped-art-measured) |
| **Audio** (`public/audio/sfx/`) | 8 | **Documented** — third-party, Kenney.nl, CC0 |
| **Sun Wukong v4** (`characters/monkey-king-v4/` — 38 shipped `.webp`, 38 `.png` build inputs) | 76 | **Process documented 2026-08-11** — OpenAI image generation under HetCreep's direction, with reference roles and post-processing recorded below. Reference-source and similarity questions remain open |
| **Historical remainder** — pre-v4 Sun Wukong, Pigsy, Tripitaka, the walk/turnaround sets, UI, background, all of `assets/archive/` | 693 | **AUTHOR KNOWN, PROVENANCE NOT VOUCHED FOR.** All **693** trace to `kaoshock123` (measured, none unresolved, no other author). That is materially better than "unknown origin" — but `kaoshock123` explicitly declined to vouch for the historical sets, so the *generation details* behind them are undocumented |
| `public/favicon.svg` | 1 | **UNKNOWN** — see below |

A replacement **Sun Wukong v4** candidate is included in this change and becomes shipped
only after this PR is merged and deployed. Its process record is below; open reference-source,
provider-terms, copyrightability, and similarity questions are not closed by that record.

Total tracked after this change: **946 binary assets** (526 `.png`, 412 `.webp`, 8 `.ogg`) plus
`public/favicon.svg`.

This file records **origin**. It does **not** carry per-file checksums or a tamper
manifest, and it does not move `assets/archive/` or `assets/raw/` out of git. That work —
asset supply-chain hardening — **has no durable reference anywhere in this repository.** It
was raised in the working session that produced this file and carried an ad-hoc number
("#62") that resolves to nothing: not a `TASKS.md` row (that file runs to 28 and none is an
asset row), not an issue, not a document. Treat the description in this paragraph as the
only record of it. That gap is itself
worth closing.

---

## Sun Wukong v4 replacement — process record (2026-08-11)

**Operator:** HetCreep · **Agent / execution seat:** Codex (`/root`, Ring-1 maker) ·
**Output:** 12 Idle + 6 Normal Attack 1 + 20 Run frames. The 38 PNG build inputs live under
`assets/raw/characters/monkey-king-v4/`; `npm run build:images` produced the corresponding
38 WebP files under `public/characters/monkey-king-v4/` at character quality 90.

- **Idle and Normal Attack 1:** generated through Codex's built-in OpenAI image-generation
  tool during the owner-directed Wukong design session. The accepted Idle design was used as
  the identity/style reference for the attack set.
- **Run:** generated through the same OpenAI image-generation tool. The accepted Wukong Idle
  was the identity/style reference; the owner-supplied `erlang-spritesheet.zip` run sheet was
  used only as a motion/cadence reference. The earlier Google Flow MP4 was reviewed during the
  design conversation but is not shipped and was not used as the final frame source.
- **Post-processing:** Codex used the local `generate2dsprite` workflow for magenta chroma-key
  removal, frame extraction/alignment, edge checks, and despill. The repository image pipeline
  then generated WebP derivatives. No Blender or Adobe step was used for this v4 set.
- **Timing selected by HetCreep:** Idle 300 ms/frame; Run 102 ms/frame (20 frames = 2.04 s,
  matching the Erlang reference cycle); Lobby Normal Attack 1 at 8 fps. Battle attack rates
  remain 16/18/14 fps so this art refresh does not change combat timing.
- **What is not recorded:** no seed or provider-side generation ID is available in the repo;
  the exact provider model revision and terms snapshot were not archived. The original source
  and permission basis of the owner-supplied Erlang motion reference are not established here,
  and no visual-similarity or legal review has been performed. "Process documented" therefore
  does not mean "rights cleared."

---

## Directory map

| Directory | Files | Type | Shipped to players? | Role |
| --- | --- | --- | --- | --- |
| `public/characters/` (incl. `walk/`, `turnaround/`, `erlang-shen-skill-2-fx/`) | 397 | `.webp` | Yes | AI-produced art — Wukong v4 is documented above; an unknown share of the historical remainder may be Blender renders (unknown #10) — cut/cleaned by `tools/` |
| `public/ui/thai/`, `public/ui/navigation/` | 14 | `.webp` | Yes | AI-produced art — an unknown share may be Blender renders (unknown #10) |
| `public/backgrounds/` | 1 | `.webp` | Yes | AI-produced art — an unknown share may be Blender renders (unknown #10) |
| `public/audio/sfx/` | 8 | `.ogg` | Yes | **Third-party — Kenney.nl, CC0** |
| `public/favicon.svg` | 1 | `.svg` | Yes | **Unknown origin** |
| `assets/raw/**` | 393 | `.png` | **No** — build input only | Pre-compression masters of the shipped `public/` art |
| `assets/archive/**` | 133 | `.png` | **No** — retained history | Superseded generations, alternate poses/palettes, uncut sheets (`*-source.png`, `*-sheet.png`) |

`assets/raw/` is converted to `public/` WebP by `tools/optimize-images.mjs` (`npm run
build:images`); output is committed, nothing runs at CI/deploy time.

**`assets/archive/` is not deletable, despite shipping to nobody.** Two different senses of
"unused" apply and they point opposite ways:

- **Build and runtime**: consumed by nothing. It left `public/` in commit `16f764b` so
  88 MB of unused working files stopped being deployed to every visitor. No player request
  ever reaches it, and no code path in `src/` loads from it — the only mention there is a
  comment (`src/game/walkKits.ts:11`) naming a source sheet, not a load.
- **Tooling**: actively read. The sheet-cutting scripts (`tools/cut-pigsy-*.mjs`) take their
  input sheets from `assets/archive/` and write frames into `assets/raw/`. Deleting the
  archive would break re-running them, and it would also destroy the only surviving copies
  of the uncut source sheets.

How any individual file arrived in `assets/raw/` is **not recorded per file** — see
KNOWN UNKNOWN #8. Directory-level facts (which folder holds how many files) are recorded
above; per-file routing is not, and should not be inferred from folder names.

---

## How the art was made

**The character, UI, and background art was produced with AI tools, not drawn by hand.** The
resulting images were then cut into animation frames, background-keyed, de-numbered,
mirrored, and colour-corrected in-repo by the scripts under `tools/`.

> **Qualifier added 2026-08-10 — "generated by AI" is not the whole story.** `kaoshock123`
> **also used Blender**, so an unknown share of these files may be **renders of 3D models**
> rather than generated images. Wherever this document describes the pipeline as *AI
> generation → fitting pass → automated `tools/` steps*, read that as the shape for the files
> it holds true for — **which files those are is not known**. See
> [Blender](#blender--a-different-category-of-tool-added-to-this-record-2026-08-10) and
> KNOWN UNKNOWN #10.

There are **three distinct handling layers** between whatever produced the image and the
shipped file, and they are not interchangeable — see
[Post-generation editing](#post-generation-editing) before treating any of them as the
others. Those three layers describe what happened *after* an image existed; they are
unaffected by how it came to exist.

### Who has touched the assets

Owner-confirmed as at 2026-08-10. More people are expected to join asset work later; this
is a table so a new contributor is a new row, not a rewrite.

| Contributor | Role | What they did | Tools used | Period |
| --- | --- | --- | --- | --- |
| **`kaoshock123`** (`kaoshock123@gmail.com`) | Art author — 2D generation **and Blender 3D work** (share of each unknown, #10) | **The author of 849 of the 870 tracked assets** (all 693 non-Erlang plus 156 of the 169 Erlang files), on their own machine. The only exceptions are the 8 Kenney CC0 sound effects and the 13 `erlang-shen-skill-2-fx` frames. Owner-confirmed as **the person who answered the provenance questionnaire this document is built on**. On `master`: `62c0000` (2026-08-05, 345 asset files, "Initial commit"), `5aaba87` (193 images), `5aae711` (128), plus several smaller `feat(pigsy)` commits. Not merged, on the PR #102 branch (all 2026-08-09): `90fe738`, `91bf28b`, `e1fd040` (1,416 images), `fa9c86e` | AI generators: Codex, Google Flow, GitHub workflows + `2DGenerateSpriteSheet`, ChatGPT. **Plus Blender** (3D modelling/rendering — a different category, added to this record 2026-08-10; scope and model origin both unknown, see KNOWN UNKNOWN #10) | 2026-08-05 → 2026-08-09 |
| **`HetCreep`** (`zxc59217412@gmail.com`) | Owner — pipeline and fitting. **Not an art author** | **Four commits touch asset bytes**, two adding paths and two rewriting them: `16f764b` (2026-08-06, 520 images added — the `sharp` WebP conversion plus `git mv`, of which 194 are the shipped WebP) and `3730322` (2026-08-10, 193 added — the Erlang Shen set) are **layer 3**, automated processing; `64a67fd` (2026-08-07, 6 images modified, "cap oversized character sprite art") and `ff67fb1` (2026-08-08, **96 images modified**, "re-crop character sprites") are **layer 2**, the mechanical fitting pass — they are the last writer of those files' current bytes. **No image authorship in any of the four**: adding a converted or relocated copy is not authorship, and re-cropping an existing image is fitting, not drawing | Per the owner: an Adobe account connected to **Claude Code**, agents carrying out the work; plus `sharp` via `tools/` | 2026-08-05 → 2026-08-10 |
| **`nustanakritwithai`** (`nustanakritwithai@gmail.com`) | Contributor — asset relocation and re-encoding. **Not an art author** | **Committed** 20 image files, **authored none of them**: `c58c3c2` renamed 10 `.png` with identical blob SHAs, and `062dcda` re-encoded those same 10 images to `.webp`. Every one traces byte-for-byte to `kaoshock123`'s root `62c0000` (measured below). Their contribution is restoring battle sprite and background assets after a cherry-pick, which is real work on this repository — it is simply not authorship | Not recorded | 2026-08-06 |

Automated repository scripts (`tools/`) are not contributors — they are build tooling, and
they make no per-image decision. They are listed under layer 3 above for completeness.

### Who authored the shipped art (measured)

Every figure below is from `git`, reproducible on this repository. This is the most
load-bearing attribution finding in the file, so it is measured rather than asserted.

**The shipped Erlang Shen art is `kaoshock123`'s, byte for byte.** `HetCreep`'s `3730322`
was described as an "inward reimpl of #102", and that reimplementation applied to the
**code** — the **art** was carried across unchanged. Of the **193 images added by
`3730322`**, **180 also exist in `kaoshock123`'s unmerged `e1fd040`, and all 180 are
byte-identical** (0 differing). 156 of those 180 are the `erlang-shen` files. The remaining
**13** — the `erlang-shen-skill-2-fx` frames — have no counterpart in `e1fd040`; their origin
is not traced further here.

**The two repository roots hold the same bytes.** This repo has two root commits, both dated
2026-08-05: `62c0000` (`kaoshock123`, "Initial commit", 19:06, 345 asset files) and
`12bcd09` (`HetCreep`, 21:59, the same 344 image paths). All **344 are byte-identical at
identical paths**, with zero same-path-different-blob cases. The later root re-added content
that already existed; it did not create it.

**Author of the 693 undocumented assets** — every file traced from the commit that introduced
its path, through the mechanical steps (`git mv`, `sharp` WebP conversion, re-crop), to the
commit that introduced its *bytes*.

| Content author | Files |
| --- | --- |
| `kaoshock123` | **693** |
| Anyone else | **0** |
| Unresolved | **0** |

**A per-commit apportionment is deliberately NOT attempted.** There is no single defensible
way to divide the 693 among the commits that touched them, because the three reasonable
measures disagree — for `16f764b` alone: **510** by earliest path-add, **366** by last
writer, **194** by rename-detected add. Each is a real measurement of a different question,
and picking one and calling it "the split" would be inventing precision the evidence does not
support. **This file has already published two such splits and retracted both** (see the
revision notes); it will not publish a third.

**The disagreement does not touch the authorship conclusion.** Every one of those routes
lands on the same author for every file — which is the whole finding, and it is stronger
stated this way than under any single apportionment. Nothing is unresolved.

If one illustrative figure is wanted, here is the **earliest path-add** distribution
specifically — *not* a statement about authorship, and not interchangeable with the other two
measures:

`16f764b` 510 · `5aae711` 128 · `3730322` 24 · `c58c3c2` 10 · `062dcda` 10 · `edf0e1a` 4 ·
`740f502` 2 · `d94afe3`, `d3a3fa3`, `cfe3775`, `8df744f`, `5aaba87` 1 each — **= 693**.

**Correction, 2026-08-10 — the 20 previously credited to `nustanakritwithai` are
`kaoshock123`'s bytes.** An earlier revision of this table applied the byte-tracing rule to
`HetCreep`'s mechanical commits but stopped short of applying it to
`nustanakritwithai`'s. Re-derived here, blob by blob:

- **`c58c3c2` — 10 `.png`, a pure rename.** Each file moved
  `assets/archive/characters/X.png` → `assets/raw/characters/X.png` with **the identical blob
  SHA on both sides**. All 10 of those SHAs are the ones in `kaoshock123`'s root `62c0000`,
  and all 10 are still at the branch tip unchanged — verified individually, e.g.
  `monkey-attack-new-12.png` is `37321818…` at the root and `37321818…` at the tip.
  Root → `16f764b` (rename) → `c58c3c2` (rename): **zero byte change at any step.**
- **`062dcda` — 10 `.webp`, a format conversion.** The commit adds `.webp` only, no `.png`.
  At its parent, each file's same-basename `.png` predecessor already existed in
  `assets/archive/` carrying the root blob SHA (checked: `monkey-attack-new-12.png` =
  `37321818…`, `monkey-pose-0-alpha.png` = `1a6f5cbf…`, both matching `62c0000` exactly).
  This is the identical mechanical WebP step that `16f764b` performs, and it is credited back
  to `kaoshock123` for the same reason.

The two commits are the same ten images in two formats. **`nustanakritwithai` authored zero
images.** They committed image files — relocating and re-encoding art that already existed —
which is a real contribution to this repository and not an authorship claim. Getting that
distinction wrong named a living person as the author of work that is not theirs, which is
precisely the failure a provenance record exists to prevent.

**What this does and does not mean.** It establishes *who committed the bytes*, which is a
real and checkable fact. It says nothing about how those bytes were generated — the tools,
the reference inputs, the terms. `kaoshock123` answered the questionnaire and declined to
vouch for the historical sets, so a **known author who has not vouched** is the right
description of the 693: better than "unknown origin", and still not documented provenance.

### Tools and services used

A **mix**, varying by asset — not a single generator:

- Codex
- Google Flow
- GitHub workflows and `2DGenerateSpriteSheet` tooling
- ChatGPT

Because it is a mix, **different assets may sit under different providers' terms.** There
is no single set of terms covering the art.

#### Blender — a different category of tool, added to this record 2026-08-10

`kaoshock123` **also used Blender.** It is listed separately, and deliberately not appended
to the list above, because it is not the same kind of thing.

Every tool in the generation list above produced **2D images**, and this entire record is
built around 2D generation: what came out, and what reference inputs steered it. **Blender is
3D modelling and rendering software.** If any shipped file is a **render of a 3D model**
rather than a generated image, then for that file the rights question is not "what did the
generator train on, and what reference was fed to it" — it is **"where did the 3D model come
from"**. That is a different question with different answers, and the rest of this document
does not ask it anywhere.

**Two things are unknown, and this record does not guess at either:**

1. **Whether the Blender models were built from scratch or downloaded.** Downloaded —
   Sketchfab, BlenderKit, a marketplace, a free-model site — means **each model carries its
   own licence**, with its own attribution, commercial-use and redistribution terms, and **not
   one of them is recorded anywhere in this project.** Built from scratch means **no
   third-party *model* licence attaches** — and that is the whole of what it means. It is not
   a clean branch, and this record does not call it one:
   - A model built from scratch can still **depict another studio's copyrighted design**. The
     roster is Sun Wukong, Erlang Shen, Nezha; this document's own position is that a
     public-domain *character* does not make a specific *depiction* public-domain, and
     [nobody has run a similarity check](#known-unknowns) on any character.
   - A modeller works **from reference** the same way a generator does, and those references
     are as unrecorded here as the generation ones.
   - "From scratch" routinely still contains downloaded **textures, HDRIs, material
     libraries, rigs and animations** — each with its own licence. (Mixamo, for instance,
     supplies rigs and animations rather than models; an earlier revision of this paragraph
     listed it as a model source.)

   So neither answer closes half (a) on its own. What each answer does is tell you **which
   further questions to ask**.
2. **Which shipped assets came through Blender at all.** It may be one prop. It may be the
   entire roster. Nothing in the repository distinguishes a render from a generated image,
   no `.blend` or other 3D source file is tracked here, and the owner's report does not scope
   it. **Any statement about how many files this touches would be invention.**

This is tracked as [KNOWN UNKNOWN #10](#known-unknowns), at **the same severity as unknown
#1** (the unrecorded reference-image sources). The two are now the record's joint
highest-severity gaps.

### Post-generation editing

Three layers sit between the produced image and the shipped file — "produced" rather than
"generated", since for an unknown subset the first step may have been a Blender render rather
than a generation (KNOWN UNKNOWN #10). They are different things and
this record keeps them apart:

1. **Generation** — AI output from the tools above.
2. **A mechanical fitting pass, agent-carried-out.** The owner's account: the generated
   images were trimmed and adjusted to fit the code — sizing, framing, fitting the sprite
   and asset slots — with the Adobe account connected and **agents doing the work**;
   HetCreep states they *"did not press anything"*. This is neither "used exactly as
   generated" nor "an artist redrew it": pixel-level fitting of images that already existed,
   directed by the owner but executed by tooling. Its commits are `64a67fd` (2026-08-07) and
   `ff67fb1` (2026-08-08). **No log survives for the earlier one**; the later one falls inside
   the retained transcript window — see below.
3. **Automated repository processing** — the scripts under `tools/` (frame extraction from
   sheets, background keying, de-numbering, mirroring, WebP conversion). Mechanical passes,
   verifiable in the code, involving no human decision per image.

**No manual drawing, retouching, or compositing is reported** — layer 2 is fitting work, not
artwork, on every account of it. Note that layers 2 and 3 describe the same *kind* of work
(mechanical fitting) — worth noting, since neither adds authored artwork.

#### The Adobe step, and why the transcript search proves nothing about it (2026-08-10)

**The owner's account.** An Adobe editing pass happened. The Adobe account was connected and
**agents carried the work out** — HetCreep states they *"did not press anything"*
(*"ไม่ได้กด ฉันเชื่อมต่อ agents ทำให้ฉันเสร็จสรรพ"*). The work described is pixel-level
trimming and sizing to fit the code, in **Claude Code on this machine**.

**A transcript search found no Adobe calls. That search cannot speak to this question, for
two structural reasons — both verified in `git`, not inferred.** An earlier version of this
file treated the empty result as evidence and, worse, as a *discrepancy* against the owner's
account. It was neither.

1. **The generation was not done on this machine.** The art author is **`kaoshock123`**, a
   different person working on a different machine
   ([contributors](#who-has-touched-the-assets)). No Adobe call by them could ever appear in
   HetCreep's local transcripts, whatever they did.
2. **Most of the fitting work predates the retained transcripts — but not all of it.** Local
   transcripts for this project begin **2026-08-08**. `16f764b` (2026-08-06, the WebP
   conversion and relocation) and `64a67fd` (2026-08-07, 6 images re-capped) both fall before
   that. **`ff67fb1` does not**: dated **2026-08-08 07:56 +0700**, it re-cropped **96 image
   files** — a fitting pass of exactly the kind described above, sitting **inside** the
   searched window.

So the search covered a machine that never ran the generation, and a window that misses most
of the fitting work but not all of it.

**An earlier revision said the window "no longer contains the fitting pass", flatly. That was
wrong** — the same over-reach this section exists to correct, made while correcting it.

**What the one in-window pass buys, and what it does not.** No Adobe call appears anywhere in
the transcripts, including across `ff67fb1`'s date. For **that** 96-file re-crop specifically,
that is a real if narrow corroboration: an agent-mediated generative Adobe operation during it
would have left a trace, and none is there. It says nothing about `16f764b` or `64a67fd`,
nothing about the generation, and nothing about any work done outside Claude Code — where an
untraced route remains untraced.

**What the search does prove, stated at exactly that width and no wider.** The **"Adobe for
creativity"** Connector in the Claude app (a toggle in the Connectors menu linking the user's
Adobe account; nothing installed separately) exposes an MCP server with **70+ tools** — two
generative (`image_generative_expand`, `image_fill_area`), one Stock-licensing
(`asset_license_and_download_stock`), the rest mechanical. Across **1,727 `.jsonl` files** in
every transcript location under `~/.claude`, **zero invocations of that server appear**, against
a working control (**272** `mcp__Claude_Browser__javascript_tool` invocations by the same
method). That establishes: **no agent-mediated Adobe call occurred in the retained window on
HetCreep's machine.** True, narrow, and **carrying no weight for the provenance question**,
because the work in question falls outside that window on both counts above. It is recorded
for completeness, not as support.

**What the "no generative feature" conclusion actually rests on — two things, not three:**

**(a) Owner testimony.** The pass was trim / size / fit-to-code: pixel-level adjustment of
images that already existed. First-hand, and not independently verifiable.

**(b) The Adobe generative-credit balance.** The owner reports it **did not decrease**.

This pillar rests on an **assumption, not a verified fact**: that Adobe's generative-credit
metering is **route-independent** — i.e. that a generative operation decrements credits
whichever way it is reached, connector or application. If that holds, (b) reaches work done
on a machine and in a window no retained evidence covers, which is exactly what the
transcript search cannot do. **This project has not verified it.** Adobe's metering policy
has not been checked against Adobe's live terms, and this file deliberately does not
characterise what that policy is — the assumption is named so a reader can test it, not
smuggled in as background.

**If the assumption is wrong, pillar (b) collapses.** Plausible ways it could be wrong: a
plan tier where some generative operations are free or unmetered; features that do not
decrement at all; different accounting between the connector and the desktop application; a
balance that reflects a billing period rather than each operation. In any of those cases an
unchanged balance is consistent with generative use having occurred, and **the "no generative
feature" conclusion would rest on owner testimony alone** — pillar (a), first-hand and
unverifiable, with nothing corroborating it.

A second limit stands regardless: it is the **owner's report** of the balance, not an
inspected billing record.

**Adobe Stock.** No Stock use is reported by the owner, and none appears in the searched
transcripts — with the same caveat that those transcripts cannot reach the relevant work.

**What follows:**

- **No generative feature is evidenced anywhere in the chain.** That remains the practical
  conclusion — but note its actual footing: pillar (a) is unverifiable first-hand testimony,
  and pillar (b) corroborates it **only if** Adobe's metering is route-independent, which
  nobody here has checked. Two grounds, one unverifiable and one conditional. The conclusion
  is the most likely reading of what is known; it is not established.
- **Which Adobe product, and through what channel, is still not recorded.** See
  KNOWN UNKNOWN #2. Adobe therefore stays on the terms-retrieval list.
- The transcript evidence is **downgraded, not deleted** — kept so that a future reader does
  not rediscover the empty log and mistake it for a finding, as this file once did.

**Honest limits.** The transcripts cover **Claude-app-mediated actions on HetCreep's machine
within the retained window**. The generation (Codex, ChatGPT, Google Flow, on
`kaoshock123`'s machine) and the 2026-08-06 fitting pass both sit outside that. Nothing here
bears on [reference inputs](#reference-and-source-inputs--the-load-bearing-section), which
remain one of the two open, load-bearing unknowns — the other being Blender (#10).

### Accounts and plans

- **OpenAI / ChatGPT** — two **Plus**-plan accounts (paid tier).
- **Claude** — **three accounts**, on the **Pro**, **Max5**, and **Max20** tiers (all paid).

**The login identifiers and email addresses for these AI-provider accounts** are deliberately
held privately by the owner and are **intentionally not stored in this public-facing record.**
That is correct and should stay that way; nothing in this repository needs them, and no future
revision of this file should ask for them.

This does not conflict with the contributor table above, which lists **git commit-author
addresses** — those are already published in this repository's history by every commit their
owners made, and identifying who committed what is the point of a provenance record. The two
are different things: authorship attribution is public by nature, provider account credentials
are not.

### What this record does NOT say about terms

**This file does not state what any provider's terms permit.** Not OpenAI's, not Google's,
not Anthropic's, not GitHub's. Those terms change, they differ by plan, and the ones that
bind are the ones that were in force at the time each asset was generated — which is not
recorded either. Restating them from memory in an attribution record is precisely the
failure this file exists to prevent.

What is recorded here is only **which tools and which paid tiers were used**. The
applicable terms must be retrieved from each provider and checked against the live terms
**before any commercial release**. Flagged, not answered.

---

## Reference and source inputs — the load-bearing section

The **2D generation** workflow used all of the following, depending on the asset:

- text-only generation,
- **image / reference inputs**,
- other source material where appropriate.

That list came from the questionnaire and covers the generation route only. It is **not** an
enumeration of every way a shipped file could have been produced: a **Blender render** is a
separate route this section does not analyse, with its own unrecorded inputs — see
[Blender](#blender--a-different-category-of-tool-added-to-this-record-2026-08-10) and
unknown #10.

> **The original source for every reference image is not currently recorded.**

That sentence is one of the two most consequential facts in this document — the other being
the unrecorded Blender model origin (#10) — and it is stated without softening:

- **Reference images were used.** This is confirmed by the owner, not inferred.
- **Where those references came from is unknown.** There is no per-asset record, and per
  the section below there are no retained prompts, seeds, or generation logs to reconstruct
  it from.
- **Therefore this project cannot currently assert that its art is free of third-party
  input.** If a reference belonged to someone else, rights in it may travel into the
  output regardless of what any generator's terms say about output ownership — and nothing
  in the repository would show it.
- **This is invisible in the files themselves.** No inspection of the `.png`/`.webp` set
  can recover it. Only the person who ran the generation could, and the record was not kept
  at the time.

Where a reference's source cannot be verified, **this record says so rather than infer
rights or ownership.** Any asset intended for commercial use needs a source-specific review
before release.

### Prompts, seeds, and generation logs

**No prompts or seeds for the image generation itself were retained.** That part stands:
there is no way to reconstruct what any given image was generated from, which is why the
recording duty in [Follow-ups](#follow-ups-owner-listed-plus-additions) applies to *future*
work, where it can still be met.

**One evidence source does exist, and an earlier version of this file wrongly said none
did**: **Claude Code session transcripts** are retained — the live session store plus the
belt's session archive. They are not a nothing: searching them — 1,727 `.jsonl` files across
every location under `~/.claude` — is what established that **no agent-mediated Adobe call is
recorded anywhere** — a true statement about a window and a machine that, as it turns out,
do not contain the work in question. Their evidentiary value for provenance is close to nil;
they are kept as a record, not as support. Three caveats govern their use:

1. **Local and machine-specific.** They live on the machine that produced them; they are not
   a project-wide or portable record, and another machine's history is not in them.
2. **Never committed to this repository.** They contain everything a session touched. They
   are an evidence source to *consult*, not an artefact to publish — do not add them, quote
   them wholesale, or mirror them into the repo.
3. **Claude-app-mediated work only.** They record what happened through Claude Code. The
   image generation (Codex, ChatGPT, Google Flow) happened outside them and leaves no trace
   in them. Their coverage stops exactly where both load-bearing unknowns begin — the
   reference inputs (#1) and the Blender models (#10).

---

## `public/favicon.svg`

Provenance **unknown**. Believed to be a URL/site icon; **not verified**. It ships to every
visitor. Until verified, treat it as an unresolved third-party risk rather than
project-authored work — the cheapest resolution is to replace it with something authored
here.

---

## Licence asserted by this project

The repository is MIT-licensed (`LICENSE`, Copyright (c) 2026 LegendofSoulTH). **That MIT
grant is written for the software.**

For the art the project intends the same permissive posture, but that intent is only
enforceable to the extent the project actually holds rights in the output — which **two**
unrecorded third-party inputs put in question: the reference sources above (#1) and the
Blender model origins (#10). **Treat the art's licence status as unresolved**, not as settled
by the repo-root MIT file. The 8 `.ogg` files are covered by
their own third-party licence, below, not by the project's grant.

---

## Third-party assets

### `public/audio/sfx/` — 8 files, Kenney.nl, CC0 1.0 (public domain)

Sourced from [kenney.nl](https://kenney.nl) on 2026-08-06, verified live at download time
(commit `0cb2142`; the same record sits in `src/lib/audio/sounds.ts:8-13`):

| File | Kenney pack |
| --- | --- |
| `button-click.ogg` | interface-sounds |
| `dialogue-advance.ogg` | interface-sounds |
| `modal-open.ogg` | interface-sounds |
| `modal-close.ogg` | interface-sounds |
| `notification.ogg` | interface-sounds |
| `error.ogg` | interface-sounds |
| `currency-gain.ogg` | rpg-audio |
| `battle-hit.ogg` | impact-sounds |

CC0 1.0 Universal waives copyright worldwide and **does not require attribution**. This
notice is kept as a provenance record and good practice, not because CC0 compels it.
(`MEMORY.md` item 79 listed "missing Kenney CC0 attribution notice" as an open gap; this
section closes it.) These 8 files are, at present, **the only assets in the project whose
rights position is fully known.**

The registered-but-empty sound slots (`portalOpen`, `levelUp`, `victory`, `defeat`, lobby
music) are placeholders. Whatever fills them records its licence here **before** the file
lands.

### Vendored agent-tooling content

Not player-facing, listed for completeness: `.claude/skills/react-three-fiber/` and
`.claude/skills/threejs-webgl/` are vendored MIT content from
[`freshtechbro/claudedesignskills`](https://github.com/freshtechbro/claudedesignskills);
`.agents/rules/ecc/` is vendored MIT content from
[`affaan-m/ECC`](https://github.com/affaan-m/ECC). Full notices live in
`.claude/skills/THIRD_PARTY_NOTICES.md` and `.agents/rules/ecc/LICENSE`.

---

## Mythological and historical figures

Characters drawn from myth and history — Sun Wukong, Zhu Bajie, Tang Sanzang, Erlang Shen,
Hanuman, Lü Bu, Nezha — are **public-domain figures**: the underlying stories
(*Journey to the West*, *Ramayana*, *Romance of the Three Kingdoms*) are long out of
copyright, so no permission is needed to use the characters, their names, or their
attributes.

- **Does follow**: the figures themselves are free to use.
- **Does follow**: where a modern copyrighted design was the obvious reference point, this
  project reinterprets rather than reproduces it (e.g. "Astra Vale — Cosmic Force Warrior"
  as an original character instead of an existing one).
- **Does NOT follow**: a public-domain *character* does not make a specific *depiction* of
  that character public-domain. Another studio's Sun Wukong design is still that studio's.
  With reference inputs now confirmed and their sources unrecorded, this stops being a
  theoretical caveat: **nobody has checked the shipped art for visual similarity against
  known commercial character designs**, and neither steering artefact can be reviewed — for a
  generated image that is the unrecorded reference set (#1), and for a Blender render it is
  the **model itself** (#10), whose origin is equally unrecorded. This is where a
  from-scratch model of another studio's design would land, and nothing here would catch it.

---

## KNOWN UNKNOWNS

Every open question, restated rather than dropped. An unanswered question is a finding.
Resolved rows stay in place, struck and dated, so the numbering survives and the history is
visible.

| # | Unknown | Why it stays open |
| --- | --- | --- |
| 1 | **Original source of every reference image** | Owner: *"not currently recorded."* No prompts or seeds survive for the historical sets. Wukong v4 records which references played which roles, but the original source and permission basis of the owner-supplied Erlang motion sheet remain unknown. **A load-bearing unknown**, and a reason this file stays a DRAFT — it blocks any clean claim that the art is free of third-party input. **Joined 2026-08-10 by unknown #10**, which is the same severity and the same shape: an unrecorded third-party input that may travel into the shipped files |
| 2 | **Which Adobe product was used in the fitting pass, and through what channel** | Open. The owner reports an agent-carried-out Adobe pass. Most of the fitting work predates the retained transcripts (`16f764b` 2026-08-06, `64a67fd` 2026-08-07, vs transcripts from 2026-08-08), though `ff67fb1`'s 96-file re-crop falls inside the window and shows no Adobe call. The earlier "unresolved discrepancy" framing is **withdrawn** — the empty transcript search covered the wrong machine and the wrong window, and was never in tension with the owner's account. See [The Adobe step](#the-adobe-step-and-why-the-transcript-search-proves-nothing-about-it-2026-08-10) |
| 3 | **What each provider's terms actually permit** — commercial use, output ownership, whether a right survives cancelling a paid plan, disclosure duties | Tools and paid tiers are now known; the terms are not, and the ones in force at generation time are not recorded. **Adobe stays on this list** — the owner reports an Adobe pass (unknown #2), and Adobe's credit-metering policy is unverified, so its terms cannot be assumed irrelevant. Deliberately not answered here |
| 4 | **Generation details behind 693 of 870 tracked assets** | **Narrowed 2026-08-10.** The *author* is no longer unknown: all **693** measure to `kaoshock123` (0 unresolved, no other author). What is missing is the generation detail — tools, reference inputs, terms — for sets `kaoshock123` explicitly declined to vouch for. Wukong, Pigsy, Tripitaka, walk/turnaround, UI, background, all of `assets/archive/` |
| 5 | **`public/favicon.svg`** | Believed a URL/site icon; unverified. Ships to every visitor |
| 6 | **Whether AI output is protectable, and who owns it** | Jurisdiction-dependent and unsettled — and the human-involvement picture got *weaker*, not stronger, on 2026-08-10: the owner states **nothing was done by hand**; the fitting pass was directed by them but carried out by agents. So every step between generator and shipped file is now machine-executed, with human involvement at the direction level only. Whether that clears any given jurisdiction's authorship bar is a question, not a claim |
| 7 | **Visual similarity to existing commercial character designs** | Never checked, for any character |
| 8 | **Per-asset tool mapping** — which of `kaoshock123`'s generators produced which files, and which files went through the fitting pass | Author is resolved for all 693 non-Erlang assets and for 156 of the 169 Erlang files; the 13 `erlang-shen-skill-2-fx` frames are **not** traced (see above). The *tool* is resolved for none of them. The tool set is known as a set, so per-provider terms still cannot be applied per asset |
| 9 | **Licence for the 5 unfilled sound slots** | Not yet sourced |
| **10** | **Blender: where the 3D models came from, and which shipped assets are renders** — added 2026-08-10, **joint highest severity with #1** | `kaoshock123` also used **Blender**, which this record did not mention until now. Two halves, neither answered. **(a) Model origin**: built from scratch, or downloaded from Sketchfab / BlenderKit / a marketplace / a free-model site? Downloaded = **every model carries its own licence** — attribution, commercial-use and redistribution terms — and **none is recorded anywhere in this project**. Built from scratch = **no third-party *model* licence attaches, and nothing more than that**: it does not resolve depicting another studio's design (unknown #7 — never checked, for any character), the modeller's own unrecorded references, or downloaded textures / HDRIs / material libraries / rigs / animations inside the model. **Neither answer closes this half**; each only says which questions come next. **(b) Scope**: which shipped assets are renders rather than generated images. Could be one prop, could be the whole roster. No `.blend` or other 3D source file is tracked in this repository, nothing distinguishes a render from a generation by inspection, and the owner's report does not scope it. **Both halves are unanswered and neither is guessed at here.** Same shape as #1 — an unrecorded third-party input that may travel into the shipped art — and it applies to a class of file the rest of this document never analysed. See [Blender](#blender--a-different-category-of-tool-added-to-this-record-2026-08-10) |

---

## Follow-ups (owner-listed, plus additions)

From the owner's record:

1. **Record the source and permission basis for every third-party reference image used in
   future work.** This is the one duty that is still fully achievable — it cannot be met
   retroactively for existing assets.
2. **Update this document if source-specific evidence, account terms, prompts, or
   generation logs are recovered.**
3. **Verify the provenance of historical non-Erlang asset sets before relying on this
   record for commercial release or payment-system activation.**

Added by this seat:

4. ~~**Record provenance for the incoming Sun Wukong set in the same commit as the files.**~~
   **Done 2026-08-11:** the Wukong v4 process, reference roles, processing, counts, and open
   questions are recorded above. This closes the missing-record task, not the reference-source
   or rights questions.
5. **Establish the Blender picture** (unknown #10) — **the highest-value open question on
   this list**, because `kaoshock123` can answer both halves directly and nothing in the
   repository can. Which shipped assets are renders, and were the 3D models built from
   scratch or downloaded? If downloaded, record the source and licence per model. Ask before
   The Wukong v4 set above did not use Blender; this remains open for the unidentified
   historical assets that may be Blender renders.
6. **Record which Adobe product and channel the fitting pass used** (unknown #2). No log of
   it survives, so the one remaining source is the **Adobe account's own activity history**,
   which nobody has consulted. Worth checking before any commercial step. *Mis-stated three
   times already — struck as "done" on the MCP log, re-stated as a by-hand desktop session,
   then framed as an unresolved discrepancy. All three read an empty log as meaningful.*
7. **Preserve the Claude Code session transcripts as an evidence source**, on the machines
   that hold them, for as long as any provenance question is open. They establish that no
   agent-mediated Adobe call occurred, and they are not reproducible once discarded. **Do not
   commit them to this repository** — see the caveats in
   [Prompts, seeds, and generation logs](#prompts-seeds-and-generation-logs).
8. **Retrieve and archive each provider's applicable terms** (OpenAI, Google, Anthropic,
   GitHub, **and Adobe**) rather than relying on recollection — see unknown #3. Adobe stays
   on the list until item 5 names the product and its terms are actually read.
9. **Resolve or replace `public/favicon.svg`.** Replacing it is cheaper than verifying it.
10. **Keep account identifiers out of this repository permanently**, including out of any
   future revision of this file.
11. Any commit that adds, replaces, or removes a tracked asset updates this file in the same
   commit — the same discipline `MEMORY.md` and `TASKS.md` already carry. A new asset with
   no row here is the finding, not an oversight to fix later.

---

## Questions for a qualified lawyer

Questions, **not** conclusions. The repo already ships a currency shop
(`CurrencyShopModal`, `GOLD_PACKAGES`/`GEM_PACKAGES`, `topUpGold`/`topUpGems`) with **no
payment gateway wired**, so no real money moves today. **The day a gateway is connected,
every item below stops being housekeeping.**

**There are now TWO unresolved provenance classes ahead of any commercial release, not one**
— questions 1 and 2 below. They are independent of each other, they affect different (and
unidentified) subsets of the shipped files, and neither can be closed from the repository
alone. A gateway should not be wired while both are open.

1. **Unrecorded reference inputs (unknown #1).** Reference images were used; their sources
   are unknown; no prompts or seeds survive, and the retained transcripts do not reach the
   generation step. A lawyer would need to advise on exposure given that the project cannot
   demonstrate what its art was derived from, and on what a defensible remediation looks like
   (re-generation from text-only inputs with logging, a similarity review, or accepting the
   risk in writing).
2. **Blender models of unknown origin (unknown #10) — new 2026-08-10, and the same severity
   as question 1.** Some unidentified share of the shipped art may be **renders of 3D
   models**, and nobody has recorded whether those models were built or downloaded. If
   downloaded, each carries its own licence — and a marketplace or free-model licence can
   forbid exactly what a commercial game does with it (redistribution inside a shipped
   product, use without attribution, use in a paid title). A lawyer needs to know this is
   open, and needs the two halves separated: **which files**, and **what licence**. Try to
   answer both internally first — `kaoshock123` is reachable, and this is a question they can
   answer directly.
3. **The Adobe step (unknown #2).** Try to settle it internally first — that is free and it
   changes what the lawyer is asked. As it stands the owner reports an Adobe pass, no log of
   it survives, and the product and channel are unrecorded, so Adobe's terms cannot be looked
   up. No generative use is evidenced — that is the part that matters most — but it rests on
   owner testimony plus the credit balance, not on any record.
4. **Provider terms across the tool mix and the paid tiers (unknown #3).** Which terms bind,
   whether commercial use is permitted under each, and whether anything survives a plan
   lapsing. Retrieve the terms first; do not rely on this file for them.
5. **Ownership and copyrightability of the output (unknown #6).** Whether an **owner-directed
   but machine-executed** fitting pass — nothing pressed by hand — plus the automated `tools/`
   processing supplies the human authorship some jurisdictions require. State it that way to
   a lawyer: every step between generator and shipped file was machine-executed, and the human
   involvement is at the direction level only. Practical consequence if that is not enough:
   the project may still *use* the art but may be unable to stop others copying it.
6. **Scope (unknown #4).** Whether 693 assets with a known author but undocumented generation
   details can ship commercially, or whether they need the same review — or replacement — that
   the Wukong set is already getting. Worth telling a lawyer that `kaoshock123` is reachable
   and answered a questionnaire once: the gap here is unasked questions, not a lost author.
7. **Disclosure obligations.** Storefront and jurisdictional AI-content labelling rules
   vary per platform. GitHub Pages today; a storefront changes the answer.
8. **Player-facing credits.** Once the above settle, reflect this file's contents in the
   game's credits screen — at minimum the Kenney CC0 acknowledgement plus any required AI
   disclosure.
