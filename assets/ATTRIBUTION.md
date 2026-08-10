# Asset Attribution — LegendOfSoulTH

> ## ⚠️ DRAFT — INCOMPLETE PROVENANCE RECORD
>
> This file is a **draft prepared for HetCreep's review**. Nothing in it is a legal
> conclusion, a legal opinion, or legal advice — the author is not a lawyer.
>
> It is still a draft for four specific reasons, not as boilerplate caution:
> reference/source images were used and **their original sources are not recorded**; the
> **Adobe desktop product used in the editing pass is unnamed** and that pass left no log of
> any kind; `public/favicon.svg` has **unknown** provenance; and the record **covers 177 of
> 870 tracked assets** — the other 693 predate it and have no confirmed origin.
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
>   either way. The conclusion (mechanical) stands, but it is re-grounded on owner testimony
>   plus an unchanged generative-credit balance, and **the unknown is reopened** for the
>   desktop product's name. Caught by a QC gate before merge.
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
| **Erlang Shen** (`*erlang-shen*` — 94 shipped `.webp`, 75 `.png` build inputs) | 169 | **Documented** below, to the level the owner could confirm |
| **Audio** (`public/audio/sfx/`) | 8 | **Documented** — third-party, Kenney.nl, CC0 |
| **Everything else** — Sun Wukong, Pigsy, Tripitaka, the walk/turnaround sets, UI, background, all of `assets/archive/` | 693 | **NOT DOCUMENTED.** Produced before this record existed. Assumed to have come out of a comparable AI workflow, but that is an assumption, not a confirmation |
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
| Asset generator (identified privately to the owner; answered the provenance questionnaire) | Generation | Produced the source images | Codex, Google Flow, GitHub workflows + `2DGenerateSpriteSheet`, ChatGPT | Through 2026-08-10 |
| `HetCreep` | Owner; mechanical editing | Trimmed and fitted generated images to the code's sizing/framing/slot requirements — no drawing, retouching, or compositing | Adobe application, used directly by hand (see the evidence below) | Through 2026-08-10 |

Automated repository scripts (`tools/`) are not contributors — they are build tooling, and
they make no per-image decision. They are listed under layer 3 above for completeness.

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
2. **A mechanical editing pass by the owner, performed by hand in an Adobe application.**
   HetCreep personally trimmed and adjusted the generated images so they would fit the code
   — sizing, framing, fitting the sprite and asset slots. This is neither "used exactly as
   generated" nor "an artist redrew it": a person mechanically fitted images that already
   existed. **No generative feature is believed to have been used** — on the grounds set out
   below, which are owner testimony plus one route-independent indicator, not proof.
3. **Automated repository processing** — the scripts under `tools/` (frame extraction from
   sheets, background keying, de-numbering, mirroring, WebP conversion). Mechanical passes,
   verifiable in the code, involving no human decision per image.

**No manual drawing, retouching, or compositing is reported** — layer 2 is fitting work, not
artwork. Recording it accurately matters in both directions: it is more human involvement
than "no manual editing" (which an earlier version of this file wrongly stated), and less
than an authored art pass.

#### The Adobe step — assessed mechanical, on grounds of differing strength (2026-08-10)

The assessment is that the pass was **mechanical, not generative**. It rests on three
separate things, and they are **not** equally strong. An earlier version of this file merged
them and presented the weakest reading as proof; that was wrong, and the correction is set
out here rather than hidden.

**(a) Owner testimony.** HetCreep states the pass was trim / size / fit-to-code — pixel-level
edits of an image that already existed. This is the primary ground. It is a first-hand
account by the person who performed the work; it is not independently verifiable.

**(b) The Adobe generative-credit balance.** The owner reports it **did not decrease**. This
is the only ground here that is **route-independent**: a generative operation consumes
generative credits whether it is invoked through a Connector or performed by hand in the
desktop application, so an unchanged balance is evidence that does not depend on how the
tool was reached. Two limits, both material: it is the **owner's report** of the balance,
not an inspected billing record; and **Adobe's credit-metering policy has not been verified
against Adobe's live terms** by this project. This file does not characterise what Adobe's
policy is — only what the owner reports observing.

**(c) The MCP invocation log — narrower than it first appears.** The **"Adobe for
creativity"** Connector in the Claude app (a toggle in the Connectors menu linking the user's
Adobe account; nothing installed separately) exposes an MCP server with **70+ tools**. Two
are generative (`image_generative_expand`, `image_fill_area`); one is rights-relevant
(`asset_license_and_download_stock`, which licenses and pulls Adobe Stock assets); the rest
are mechanical (`image_crop_and_resize`, `image_adjust_exposure`, `image_apply_gaussian_blur`,
`image_remove_background`, `image_vectorize`, …).

A search across the live Claude session store *and* the belt's session archive (8 transcripts,
75 MB) found **zero invocations of any of those 70+ tools**; the server name appears only
inside `tools[]` availability declarations. The absence is real rather than a failed search —
the same pattern over the same files finds **272** `mcp__Claude_Browser__javascript_tool`
invocations plus hundreds of further browser-tool calls, so the method demonstrably detects
invocations.

**What that log does and does not establish.** It establishes, solidly, that **no
agent-mediated Adobe call of any kind occurred** — not generative, not mechanical, not
Stock-licensing. It does **not** establish that no generative feature was used, because the
pass was performed **by hand in the desktop application**, and a direct desktop session emits
no Connector telemetry at all. Generative Fill used by hand would leave exactly the same
empty log. Ground (c) excludes the agent-mediated route only; it cannot reach the route that
was actually taken.

**Adobe Stock, to the same standard.** `asset_license_and_download_stock` was never called
**through the Connector**. A Stock asset licensed by hand in the desktop application would
leave no trace there either, so this narrows the possibility rather than closing it. No Stock
use is reported by the owner; that report, not the log, is what the position rests on.

**What follows, stated at the strength the grounds support:**

- The pass is **assessed as a human mechanical edit** — the least rights-fraught of the
  branches that were open. Grounds (a) and (b) support it; ground (c) does not reach it.
- **No agent-mediated Adobe call occurred at all.** This is a firm finding in its own right,
  and it is narrower than "no generative feature entered the chain."
- **Which Adobe desktop product was used is still unrecorded** — the tool identified above is
  the *Connector*, and the evidence shows the Connector was never used. See KNOWN UNKNOWN #2,
  which stays open for the product name.

**Honest limits on this evidence.** The session log covers **Claude-app-mediated actions
only** — and two things sit outside it, not one. The original **generation** (Codex, ChatGPT,
Google Flow) happened outside it, and **the owner's own direct Adobe session is equally
outside it**. Neither leaves a trace in the transcripts. Nothing here bears on
[reference inputs](#reference-and-source-inputs--the-load-bearing-section), which remain the
open, load-bearing unknown.

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
belt's session archive. They are not a nothing: searching them is what established that **no
agent-mediated Adobe call of any kind occurred**. Note what that does not cover — a by-hand
desktop session leaves no trace in them, which is why the Adobe question is narrowed by this
evidence rather than closed by it. Three caveats govern their use:

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
| 2 | **Which Adobe desktop product was used** — and, to a lesser degree, whether any generative feature was used in it | **REOPENED 2026-08-10, same day it was wrongly closed.** The mechanical-vs-generative half is *addressed* by owner testimony plus an unchanged generative-credit balance (the one route-independent indicator), and this file assesses the pass as mechanical on that basis — but not proven: the pass ran **by hand in the desktop application**, which emits no Connector telemetry, so the zero-invocation log cannot reach it. The product identified earlier was the **Connector**, which the same log shows was never used; **the desktop product actually used remains unnamed.** See [The Adobe step](#the-adobe-step--assessed-mechanical-on-grounds-of-differing-strength-2026-08-10) |
| 3 | **What each provider's terms actually permit** — commercial use, output ownership, whether a right survives cancelling a paid plan, disclosure duties | Tools and paid tiers are now known; the terms are not, and the ones in force at generation time are not recorded. **Adobe is on this list** — the desktop product is unnamed and its use is not fully evidenced (unknown #2), and Adobe's credit-metering policy is unverified, so its terms cannot be assumed irrelevant. Deliberately not answered here |
| 4 | **Provenance of 693 of 870 tracked assets** | Predate this record. Wukong, Pigsy, Tripitaka, walk/turnaround, UI, background, all of `assets/archive/` |
| 5 | **`public/favicon.svg`** | Believed a URL/site icon; unverified. Ships to every visitor |
| 6 | **Whether AI output is protectable, and who owns it** | Jurisdiction-dependent and unsettled. The human-involvement picture as reported: no drawing or retouching, but a **human mechanical fitting pass** by the owner by hand in an Adobe application (sizing/framing/slot-fitting), on top of the automated `tools/` steps. That picture rests on owner testimony (unknown #2), not on independent evidence. Whether it clears any given jurisdiction's authorship bar is a question, not a claim |
| 7 | **Visual similarity to existing commercial character designs** | Never checked, for any character |
| 8 | **Per-asset tool mapping** — which generator produced which files, and which files went through the Adobe pass | Both are known as facts about the pipeline, not as per-file records, so per-provider terms cannot be applied per asset |
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
5. **Name the Adobe desktop product that was used** (unknown #2). One answer from the owner.
   Without it, Adobe's terms cannot even be looked up, and the generative-credit indicator
   cannot be checked against a metering policy. *An earlier revision struck this item as done
   on the strength of the MCP log; that log covers the agent-mediated route only, so the item
   is reinstated.*
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
2. **The Adobe step (unknown #2).** Name the desktop product internally first — that is free
   and it changes what the lawyer is asked. The pass is *assessed* mechanical on owner
   testimony plus an unchanged generative-credit balance, but it is not evidenced: a
   by-hand desktop session leaves no log either way, so neither generative editing nor a
   hand-licensed Adobe Stock asset can be excluded from the record alone.
3. **Provider terms across the tool mix and the paid tiers (unknown #3).** Which terms bind,
   whether commercial use is permitted under each, and whether anything survives a plan
   lapsing. Retrieve the terms first; do not rely on this file for them.
4. **Ownership and copyrightability of the output (unknown #6).** Whether the owner's
   human mechanical fitting pass plus the automated `tools/` processing supplies the human
   authorship some jurisdictions require. Practical consequence if not: the project may
   still *use* the art but may be unable to stop others copying it.
5. **Scope (unknown #4).** Whether 693 undocumented assets can ship commercially on an
   assumption, or whether they need the same review — or replacement — that the Wukong set
   is already getting.
6. **Disclosure obligations.** Storefront and jurisdictional AI-content labelling rules
   vary per platform. GitHub Pages today; a storefront changes the answer.
7. **Player-facing credits.** Once the above settle, reflect this file's contents in the
   game's credits screen — at minimum the Kenney CC0 acknowledgement plus any required AI
   disclosure.
