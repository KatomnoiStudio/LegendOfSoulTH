# Asset Attribution — LegendOfSoulTH

> ## ⚠️ DRAFT — INCOMPLETE PROVENANCE RECORD
>
> This file is a **draft prepared for HetCreep's review**. Nothing in it is a legal
> conclusion, a legal opinion, or legal advice — the author is not a lawyer.
>
> It is still a draft for four specific reasons, not as boilerplate caution:
> reference/source images were used and **their original sources are not recorded**; the
> owner's account of an **Adobe editing pass and the machine record of it do not reconcile**,
> and this file does not resolve that; `public/favicon.svg` has **unknown** provenance; and
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
>   from the empty log and published as fact. It is withdrawn, and because the owner's account
>   and the machine record now **contradict each other**, the file records the discrepancy
>   instead of choosing a side — see
>   [The Adobe step](#the-adobe-step--an-unresolved-discrepancy-2026-08-10).
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
| `HetCreep` | Owner; directed the fitting pass | Had the generated images trimmed and fitted to the code's sizing/framing/slot requirements — no drawing, retouching, or compositing, and nothing done by hand | Per the owner: an Adobe account connected to **Claude Code**, with agents carrying out the work. **The channel is disputed** — see the discrepancy below | Through 2026-08-10 |

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
2. **A mechanical fitting pass, agent-carried-out.** The owner's account: the generated
   images were trimmed and adjusted to fit the code — sizing, framing, fitting the sprite
   and asset slots — with the Adobe account connected and **agents doing the work**;
   HetCreep states they *"did not press anything"*. This is neither "used exactly as
   generated" nor "an artist redrew it": pixel-level fitting of images that already existed,
   directed by the owner but executed by tooling. **Whether this ran through Adobe at all is
   an open discrepancy** — see below; it is the reason this layer is described by what was
   done rather than by which application did it.
3. **Automated repository processing** — the scripts under `tools/` (frame extraction from
   sheets, background keying, de-numbering, mirroring, WebP conversion). Mechanical passes,
   verifiable in the code, involving no human decision per image.

**No manual drawing, retouching, or compositing is reported** — layer 2 is fitting work, not
artwork, on every account of it. Note that layers 2 and 3 describe the same *kind* of work
(mechanical fitting), which matters for the discrepancy below.

#### The Adobe step — an unresolved discrepancy (2026-08-10)

**Two credible sources disagree about whether an Adobe step happened at all.** This record
states both and picks neither. An earlier version of this file asserted a by-hand desktop
Adobe session as established fact; that was an inference from an empty log, never something
the owner had said, and it is retracted here.

**The owner's account.** An Adobe editing pass happened. The Adobe account was connected and
**agents carried the work out** — HetCreep states they *"did not press anything"*
(*"ไม่ได้กด ฉันเชื่อมต่อ agents ทำให้ฉันเสร็จสรรพ"*). The work described is pixel-level
trimming and sizing to fit the code. The application used was **Claude Code on this machine**,
not the claude.ai web or desktop app — so, on this account, the work was agent-mediated and
its transcripts should be on local disk.

**The machine record.** The **"Adobe for creativity"** Connector in the Claude app (a toggle
in the Connectors menu linking the user's Adobe account; nothing installed separately)
exposes an MCP server with **70+ tools**. Two are generative (`image_generative_expand`,
`image_fill_area`); one is rights-relevant (`asset_license_and_download_stock`, which licenses
and pulls Adobe Stock assets); the rest are mechanical (`image_crop_and_resize`,
`image_adjust_exposure`, `image_apply_gaussian_blur`, `image_remove_background`,
`image_vectorize`, …).

The documented asset set landed **today** — commit `3730322`, 2026-08-10,
*"feat(hero): add Erlang Shen (spear-warrior)"*, 173 erlang-matching files — and local
transcripts for this project run **2026-08-08 to now**, so the window containing that work is
retained rather than expired. A search across **every** transcript location under `~/.claude`
— `projects/` (all projects, not only this one), `session-archive/`, `sessions/`, `backups/`,
`file-history/`, `jobs/`, `coal/`, `downloads/`; **1,727 `.jsonl` files** — found **zero
invocations of that MCP server anywhere**: not generative, not mechanical, not Stock. The
server name appears only inside `tools[]` availability declarations. The absence is real
rather than a failed search: the same pattern over the same files finds **272**
`mcp__Claude_Browser__javascript_tool` invocations, so the method demonstrably detects
invocations.

**These do not reconcile.** On the owner's account the work was agent-mediated in Claude Code,
which is exactly the channel that would have been logged — and the logs, searched exhaustively
across the retained window that contains the asset set, show the connector available and never
called. **This record does not resolve the discrepancy.** It is stated as open, and neither
account is discarded: the owner is the only first-hand witness, and the transcript search is
the only independent check available.

**One candidate explanation, offered as a candidate and not as a finding.** The trimming may
have been performed by this repository's own `tools/` scripts — the frame-extraction and
background-cleanup passes described as layer 3, which are verifiable in the code and do
exactly the kind of mechanical fitting the owner describes — with the Adobe connector
configured but never used. This is **not asserted**. It is recorded because a reader will
reach for some reconciliation and should see the one that fits both sources, clearly marked
as unverified.

**Corroboration that survives either account: the generative-credit balance.** The owner
reports Adobe generative credits **did not decrease**. This is **route-independent** — a
generative operation consumes generative credits whether invoked through a connector or by
hand — so it holds whichever account is right. Two limits, both material: it is the **owner's
report** of the balance, not an inspected billing record; and **Adobe's credit-metering policy
has not been verified against Adobe's live terms** by this project. This file does not
characterise what Adobe's policy is, only what the owner reports observing.

**Adobe Stock.** `asset_license_and_download_stock` was never invoked in any searched
transcript, and no Stock use is reported by the owner. Both sources agree here; neither
constitutes proof of a negative outside the searched channel.

**What follows, at the strength the sources support:**

- **No generative feature is evidenced anywhere in the chain**, from either direction: the
  owner reports mechanical fitting only and an unchanged credit balance, and the transcripts
  show no generative call. The two sources disagree about whether Adobe was involved and
  still converge on this. It is the practical conclusion, and it is unchanged by the
  discrepancy.
- **Whether an Adobe step occurred at all, and through what channel, is open.** See
  KNOWN UNKNOWN #2.
- **No agent-mediated Adobe call is recorded in any retained transcript.** That is a firm
  finding about the record; what it implies about the work depends on which account is right.

**Honest limits.** The transcripts cover **Claude-app-mediated actions only**. The original
**generation** (Codex, ChatGPT, Google Flow) happened outside them entirely, and any work
done outside Claude Code — by whatever route — leaves no trace in them either. Nothing here
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
recorded anywhere**, which is one half of the unresolved discrepancy above. Three caveats
govern their use:

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
| 2 | **Whether an Adobe step occurred at all — and if so, through what channel** | **WIDENED 2026-08-10.** Was narrowly "which Adobe product"; the question is now prior to that. The owner states an Adobe pass happened, agent-carried-out in Claude Code on this machine. An exhaustive search of 1,727 retained transcripts covering the window in which the documented asset set landed shows the Adobe connector **available but never invoked**, against a working control — and no other Adobe channel is evidenced. **The two accounts do not reconcile and this file does not resolve them.** A candidate explanation (the repo's own `tools/` scripts did the fitting, connector configured but unused) is recorded as a candidate, not a finding. See [The Adobe step](#the-adobe-step--an-unresolved-discrepancy-2026-08-10) |
| 3 | **What each provider's terms actually permit** — commercial use, output ownership, whether a right survives cancelling a paid plan, disclosure duties | Tools and paid tiers are now known; the terms are not, and the ones in force at generation time are not recorded. **Adobe stays on this list** — the owner reports an Adobe pass (unknown #2), and Adobe's credit-metering policy is unverified, so its terms cannot be assumed irrelevant on the strength of an unresolved discrepancy. Deliberately not answered here |
| 4 | **Provenance of 693 of 870 tracked assets** | Predate this record. Wukong, Pigsy, Tripitaka, walk/turnaround, UI, background, all of `assets/archive/` |
| 5 | **`public/favicon.svg`** | Believed a URL/site icon; unverified. Ships to every visitor |
| 6 | **Whether AI output is protectable, and who owns it** | Jurisdiction-dependent and unsettled — and the human-involvement picture got *weaker*, not stronger, on 2026-08-10: the owner states **nothing was done by hand**; the fitting pass was directed by them but carried out by agents. So every step between generator and shipped file is now machine-executed, with human involvement at the direction level only. Whether that clears any given jurisdiction's authorship bar is a question, not a claim |
| 7 | **Visual similarity to existing commercial character designs** | Never checked, for any character |
| 8 | **Per-asset tool mapping** — which generator produced which files, and which files went through the fitting pass | Known as facts about the pipeline, not as per-file records, so per-provider terms cannot be applied per asset. Unknown #2 makes the fitting half worse: the channel itself is disputed, so there is nothing per-file to map it to |
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
5. **Reconcile the Adobe discrepancy** (unknown #2) — the owner's account of an
   agent-carried-out Adobe pass against 1,727 transcripts showing the connector never
   invoked. Worth a direct look before any commercial step: check the Adobe account's own
   activity history, which is the one record neither side has consulted, and settle whether
   the fitting was in fact done by the repo's `tools/` scripts. *Twice mis-stated already —
   struck as "done" on the MCP log, then re-stated as a by-hand desktop session. Neither was
   the owner's account.*
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
   changes what the lawyer is asked. As it stands the owner reports an Adobe pass and the
   retained transcripts show no Adobe call at all; the two do not reconcile, so the record
   cannot say whether Adobe was in the chain. No generative use is evidenced from either
   direction, which is the part that matters most, but a lawyer should be told the channel
   is disputed rather than shown a clean account.
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
