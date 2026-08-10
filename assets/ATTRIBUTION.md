# Asset Attribution — LegendOfSoulTH

> ## ⚠️ DRAFT — INCOMPLETE PROVENANCE RECORD
>
> This file is a **draft prepared for HetCreep's review**. Nothing in it is a legal
> conclusion, a legal opinion, or legal advice — the author is not a lawyer.
>
> It is still a draft for four specific reasons, not as boilerplate caution:
> reference/source images were used and **their original sources are not recorded**; the
> **Adobe product and channel used in the fitting pass are still unrecorded**, and no log of
> that pass survives; `public/favicon.svg` has **unknown** provenance; and
> the record **covers 177 of 870 tracked assets** — the other 693 predate it and have no
> confirmed origin.
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
>   `kaoshock123` on a different machine, and HetCreep's fitting pass (`16f764b`, 2026-08-06)
>   predates the earliest retained transcript (2026-08-08). The search looked at the wrong
>   machine and the wrong window. The log evidence is **downgraded**, not deleted — see
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
| **Everything else** — Sun Wukong, Pigsy, Tripitaka, the walk/turnaround sets, UI, background, all of `assets/archive/` | 693 | **AUTHOR KNOWN, PROVENANCE NOT VOUCHED FOR.** Every one of the 693 traces to a named contributor (673 to `kaoshock123`, 20 to `nustanakritwithai`; measured, none unresolved). That is materially better than "unknown origin" — but `kaoshock123` explicitly declined to vouch for the historical sets, so the *generation details* behind them are undocumented |
| `public/favicon.svg` | 1 | **UNKNOWN** — see below |

A replacement **Sun Wukong** asset set is planned; it is **not yet shipped** and is not
covered by this record either. When it ships, its provenance gets recorded at the same
time as the files, not afterwards.

Total tracked: **870 binary assets** (488 `.png`, 374 `.webp`, 8 `.ogg`) plus
`public/favicon.svg`.

This file records **origin**. It does **not** carry per-file checksums or a tamper
manifest, and it does not move `assets/archive/` or `assets/raw/` out of git. That work —
asset supply-chain hardening — was raised as finding **#62 of the 2026-08-10 asset audit**.
It is **not** a `TASKS.md` row: no row covers it (that file runs to 28 and none of them is
an asset row), so at the time of writing it has no claimable owner. That gap is itself
worth closing.

---

## Directory map

| Directory | Files | Type | Shipped to players? | Role |
| --- | --- | --- | --- | --- |
| `public/characters/` (incl. `walk/`, `turnaround/`, `erlang-shen-skill-2-fx/`) | 359 | `.webp` | Yes | Generated art, cut/cleaned by `tools/` |
| `public/ui/thai/`, `public/ui/navigation/` | 14 | `.webp` | Yes | Generated art |
| `public/backgrounds/` | 1 | `.webp` | Yes | Generated art |
| `public/audio/sfx/` | 8 | `.ogg` | Yes | **Third-party — Kenney.nl, CC0** |
| `public/favicon.svg` | 1 | `.svg` | Yes | **Unknown origin** |
| `assets/raw/**` | 355 | `.png` | **No** — build input only | Pre-compression masters of the shipped `public/` art |
| `assets/archive/**` | 133 | `.png` | **No** — retained history | Superseded generations, alternate poses/palettes, uncut sheets (`*-source.png`, `*-sheet.png`) |

`assets/raw/` is converted to `public/` WebP by `tools/optimize-images.mjs` (`npm run
build:images`); output is committed, nothing runs at CI/deploy time.

**`assets/archive/` is not deletable, despite shipping to nobody.** Two different senses of
"unused" apply and they point opposite ways:

- **Build and runtime**: consumed by nothing. It left `public/` in commit `16f764b` so
  88 MB of unused working files stopped being deployed to every visitor. No player request
  ever reaches it, and nothing in `src/` references it.
- **Tooling**: actively read. The sheet-cutting scripts (`tools/cut-pigsy-*.mjs`) take their
  input sheets from `assets/archive/` and write frames into `assets/raw/`. Deleting the
  archive would break re-running them, and it would also destroy the only surviving copies
  of the uncut source sheets.

How any individual file arrived in `assets/raw/` is **not recorded per file** — see
KNOWN UNKNOWN #8. Directory-level facts (which folder holds how many files) are recorded
above; per-file routing is not, and should not be inferred from folder names.

---

## How the art was made

**The character, UI, and background art was generated by AI, not drawn by hand.** The
generated images were then cut into animation frames, background-keyed, de-numbered,
mirrored, and colour-corrected in-repo by the scripts under `tools/`.

There are **three distinct handling layers** between the generator and the shipped file,
and they are not interchangeable — see [Post-generation editing](#post-generation-editing)
before treating any of them as the others.

### Who has touched the assets

Owner-confirmed as at 2026-08-10. More people are expected to join asset work later; this
is a table so a new contributor is a new row, not a rewrite.

| Contributor | Role | What they did | Tools used | Period |
| --- | --- | --- | --- | --- |
| **`kaoshock123`** (`kaoshock123@gmail.com`) | Art author — generation | Produced essentially all of the project's source images, on their own machine. Owner-confirmed as **the person who answered the provenance questionnaire this document is built on**. On `master`: `62c0000` (2026-08-05, 345 asset files, "Initial commit"), `5aaba87` (193 images), `5aae711` (128), plus several smaller `feat(pigsy)` commits. Not merged, on the PR #102 branch (all 2026-08-09): `90fe738`, `91bf28b`, `e1fd040` (1,416 images), `fa9c86e` | Codex, Google Flow, GitHub workflows + `2DGenerateSpriteSheet`, ChatGPT | 2026-08-05 → 2026-08-09 |
| **`HetCreep`** (`zxc59217412@gmail.com`) | Owner — pipeline and fitting | Directed a mechanical fitting pass (trim/size to fit the code) and built the WebP pipeline: `16f764b` (2026-08-06) converted and relocated the art, `3730322` (2026-08-10) landed the Erlang Shen set. **No image authorship** — the bytes in both commits are inherited, not created (measured below) | Per the owner: an Adobe account connected to **Claude Code**, agents carrying out the work; plus `sharp` via `tools/` | 2026-08-05 → 2026-08-10 |
| **`nustanakritwithai`** (`nustanakritwithai@gmail.com`) | Contributor — asset fixes | Restored/resolved battle sprite and background assets: `062dcda` (2026-08-06, 10 image files) and `c58c3c2` (10) | Not recorded | 2026-08-06 |

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

**Author split of the 693 undocumented assets** — every file attributed to the commit that
introduced its path, then traced through the mechanical steps to the commit that introduced
its *bytes*. **Nothing is unresolved.**

| Content author | Files | How they arrive |
| --- | --- | --- |
| `kaoshock123` | **673** | 203 introduced directly by their own commits (193 in `5aaba87`, the rest in smaller `feat(pigsy)` commits); 446 introduced by `HetCreep`'s `16f764b`, which is a mechanical `sharp` WebP conversion plus `git mv` of files whose `public/**.png` predecessors trace back to the byte-identical roots; 24 turnaround frames introduced by `3730322`, **all 24 byte-identical to `e1fd040`** |
| `nustanakritwithai` | **20** | 10 in `062dcda`, 10 in `c58c3c2` |
| Unresolved | **0** | — |

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

### Post-generation editing

Three layers sit between the generator and the shipped file. They are different things and
this record keeps them apart:

1. **Generation** — AI output from the tools above.
2. **A mechanical fitting pass, agent-carried-out.** The owner's account: the generated
   images were trimmed and adjusted to fit the code — sizing, framing, fitting the sprite
   and asset slots — with the Adobe account connected and **agents doing the work**;
   HetCreep states they *"did not press anything"*. This is neither "used exactly as
   generated" nor "an artist redrew it": pixel-level fitting of images that already existed,
   directed by the owner but executed by tooling. **No log of this pass survives** (it
   predates the retained transcripts), so it rests on the owner's account — see below.
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
2. **The fitting pass predates the retained transcripts.** It is commit **`16f764b`,
   2026-08-06** ("perf(assets): WebP image pipeline, archive…", 194 image files). Local
   transcripts for this project begin **2026-08-08** — the relevant window expired two days
   before the earliest surviving log.

So the search covered a machine that never ran the generation and a window that no longer
contains the fitting pass. It was looking in the wrong place at the wrong time.

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

**(b) The Adobe generative-credit balance.** The owner reports it **did not decrease**. This
is **route-independent** — a generative operation consumes generative credits whether invoked
through a connector or by hand — so it holds regardless of which application or machine was
used, which is precisely what the transcript search cannot do. Two limits, both material: it
is the **owner's report** of the balance, not an inspected billing record; and **Adobe's
credit-metering policy has not been verified against Adobe's live terms** by this project.
This file does not characterise what Adobe's policy is, only what the owner reports observing.

**Adobe Stock.** No Stock use is reported by the owner, and none appears in the searched
transcripts — with the same caveat that those transcripts cannot reach the relevant work.

**What follows:**

- **No generative feature is evidenced anywhere in the chain**, on (a) and (b). This is the
  practical conclusion and it is unchanged.
- **Which Adobe product, and through what channel, is still not recorded.** See
  KNOWN UNKNOWN #2. Adobe therefore stays on the terms-retrieval list.
- The transcript evidence is **downgraded, not deleted** — kept so that a future reader does
  not rediscover the empty log and mistake it for a finding, as this file once did.

**Honest limits.** The transcripts cover **Claude-app-mediated actions on HetCreep's machine
within the retained window**. The generation (Codex, ChatGPT, Google Flow, on
`kaoshock123`'s machine) and the 2026-08-06 fitting pass both sit outside that. Nothing here
bears on [reference inputs](#reference-and-source-inputs--the-load-bearing-section), which
remain the open, load-bearing unknown.

### Accounts and plans

- **OpenAI / ChatGPT** — two **Plus**-plan accounts (paid tier).
- **Claude** — **three accounts**, on the **Pro**, **Max5**, and **Max20** tiers (all paid).

Account identifiers and email addresses are **deliberately held privately by the owner and
are intentionally not stored in this public-facing record.** That is correct and should
stay that way; nothing in this repository needs them, and no future revision of this file
should ask for them.

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

The workflow used **all** of the following, depending on the asset:

- text-only generation,
- **image / reference inputs**,
- other source material where appropriate.

> **The original source for every reference image is not currently recorded.**

That sentence is the single most consequential fact in this document, and it is stated
without softening:

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
   in them. Their coverage stops exactly where the load-bearing unknown begins.

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
enforceable to the extent the project actually holds rights in the output — which the
unrecorded reference sources above put in question. **Treat the art's licence status as
unresolved**, not as settled by the repo-root MIT file. The 8 `.ogg` files are covered by
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
  theoretical caveat: nobody has checked the generated art for visual similarity against
  known commercial character designs, and the reference set that steered it cannot be
  reviewed.

---

## KNOWN UNKNOWNS

Every open question, restated rather than dropped. An unanswered question is a finding.
Resolved rows stay in place, struck and dated, so the numbering survives and the history is
visible.

| # | Unknown | Why it stays open |
| --- | --- | --- |
| 1 | **Original source of every reference image** | Owner: *"not currently recorded."* No prompts or seeds survive to reconstruct it, and the retained Claude Code transcripts do not reach the generation step. **The load-bearing unknown**, and the reason this file stays a DRAFT — it blocks any clean claim that the art is free of third-party input |
| 2 | **Which Adobe product was used in the fitting pass, and through what channel** | Open. The owner reports an agent-carried-out Adobe pass; no log of it survives, because it predates the retained transcripts (`16f764b`, 2026-08-06 vs transcripts from 2026-08-08). The earlier "unresolved discrepancy" framing is **withdrawn** — the empty transcript search covered the wrong machine and the wrong window, and was never in tension with the owner's account. See [The Adobe step](#the-adobe-step-and-why-the-transcript-search-proves-nothing-about-it-2026-08-10) |
| 3 | **What each provider's terms actually permit** — commercial use, output ownership, whether a right survives cancelling a paid plan, disclosure duties | Tools and paid tiers are now known; the terms are not, and the ones in force at generation time are not recorded. **Adobe stays on this list** — the owner reports an Adobe pass (unknown #2), and Adobe's credit-metering policy is unverified, so its terms cannot be assumed irrelevant. Deliberately not answered here |
| 4 | **Generation details behind 693 of 870 tracked assets** | **Narrowed 2026-08-10.** The *author* is no longer unknown: all 693 measure to a named contributor (673 `kaoshock123`, 20 `nustanakritwithai`, 0 unresolved). What is missing is the generation detail — tools, reference inputs, terms — for sets `kaoshock123` explicitly declined to vouch for. Wukong, Pigsy, Tripitaka, walk/turnaround, UI, background, all of `assets/archive/` |
| 5 | **`public/favicon.svg`** | Believed a URL/site icon; unverified. Ships to every visitor |
| 6 | **Whether AI output is protectable, and who owns it** | Jurisdiction-dependent and unsettled — and the human-involvement picture got *weaker*, not stronger, on 2026-08-10: the owner states **nothing was done by hand**; the fitting pass was directed by them but carried out by agents. So every step between generator and shipped file is now machine-executed, with human involvement at the direction level only. Whether that clears any given jurisdiction's authorship bar is a question, not a claim |
| 7 | **Visual similarity to existing commercial character designs** | Never checked, for any character |
| 8 | **Per-asset tool mapping** — which of `kaoshock123`'s generators produced which files, and which files went through the fitting pass | Author is now resolved per file (measured above); the *tool* is not. The tool set is known as a set, so per-provider terms still cannot be applied per asset |
| 9 | **Licence for the 5 unfilled sound slots** | Not yet sourced |

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

4. **Record provenance for the incoming Sun Wukong set in the same commit as the files** —
   the replacement set is the first chance to get an asset set right from the start rather
   than reconstructing it later.
5. **Record which Adobe product and channel the fitting pass used** (unknown #2). No log of
   it survives, so the one remaining source is the **Adobe account's own activity history**,
   which nobody has consulted. Worth checking before any commercial step. *Mis-stated three
   times already — struck as "done" on the MCP log, re-stated as a by-hand desktop session,
   then framed as an unresolved discrepancy. All three read an empty log as meaningful.*
6. **Preserve the Claude Code session transcripts as an evidence source**, on the machines
   that hold them, for as long as any provenance question is open. They establish that no
   agent-mediated Adobe call occurred, and they are not reproducible once discarded. **Do not
   commit them to this repository** — see the caveats in
   [Prompts, seeds, and generation logs](#prompts-seeds-and-generation-logs).
7. **Retrieve and archive each provider's applicable terms** (OpenAI, Google, Anthropic,
   GitHub, **and Adobe**) rather than relying on recollection — see unknown #3. Adobe stays
   on the list until item 5 names the product and its terms are actually read.
8. **Resolve or replace `public/favicon.svg`.** Replacing it is cheaper than verifying it.
9. **Keep account identifiers out of this repository permanently**, including out of any
   future revision of this file.
10. Any commit that adds, replaces, or removes a tracked asset updates this file in the same
   commit — the same discipline `MEMORY.md` and `TASKS.md` already carry. A new asset with
   no row here is the finding, not an oversight to fix later.

---

## Questions for a qualified lawyer

Questions, **not** conclusions. The repo already ships a currency shop
(`CurrencyShopModal`, `GOLD_PACKAGES`/`GEM_PACKAGES`, `topUpGold`/`topUpGems`) with **no
payment gateway wired**, so no real money moves today. **The day a gateway is connected,
every item below stops being housekeeping.**

1. **Unrecorded reference inputs (unknown #1) — the first question.** Reference images were
   used; their sources are unknown; no prompts or seeds survive, and the retained transcripts
   do not reach the generation step. A lawyer would need to advise on exposure given that the
   project cannot demonstrate what its art was derived from, and on what a defensible
   remediation looks like (re-generation from text-only inputs with logging, a similarity
   review, or accepting the risk in writing).
2. **The Adobe step (unknown #2).** Try to settle it internally first — that is free and it
   changes what the lawyer is asked. As it stands the owner reports an Adobe pass, no log of
   it survives, and the product and channel are unrecorded, so Adobe's terms cannot be looked
   up. No generative use is evidenced — that is the part that matters most — but it rests on
   owner testimony plus the credit balance, not on any record.
3. **Provider terms across the tool mix and the paid tiers (unknown #3).** Which terms bind,
   whether commercial use is permitted under each, and whether anything survives a plan
   lapsing. Retrieve the terms first; do not rely on this file for them.
4. **Ownership and copyrightability of the output (unknown #6).** Whether the owner's
   human mechanical fitting pass plus the automated `tools/` processing supplies the human
   authorship some jurisdictions require. Practical consequence if not: the project may
   still *use* the art but may be unable to stop others copying it.
5. **Scope (unknown #4).** Whether 693 assets with a known author but undocumented generation
   details can ship commercially, or whether they need the same review — or replacement — that
   the Wukong set is already getting. Worth telling a lawyer that `kaoshock123` is reachable
   and answered a questionnaire once: the gap here is unasked questions, not a lost author.
6. **Disclosure obligations.** Storefront and jurisdictional AI-content labelling rules
   vary per platform. GitHub Pages today; a storefront changes the answer.
7. **Player-facing credits.** Once the above settle, reflect this file's contents in the
   game's credits screen — at minimum the Kenney CC0 acknowledgement plus any required AI
   disclosure.
