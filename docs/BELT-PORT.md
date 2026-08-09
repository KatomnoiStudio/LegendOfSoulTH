# Belt-system port → LegendofSoulTH (draft rule file, 2026-08-09)

> **THE CORE, owner's own distillation (2026-08-09) — everything in this file is these three lines at some scale:**
> _"ตอนแรกมันคลุมเครือ จนสุดท้ายกลั่นออกมาเป็นหัวใจหลัก"_
> **ถือ 1 เรื่อง ต่อ 1 agents · สร้าง → ผ่าน QC → ได้ไปต่อ · สร้าง → ไม่ผ่าน QC → โดนดีดกลับ**
> A section below that cannot be derived from these three lines does not belong in this file.

> **Deliverable, not installed.** HetCreep places this and decides its rule number / file name / `RULES_VERSION` bump. Written against the repo's actual state, verified at source 2026-08-09: `AGENTS.md` rules 1–22, `.agents/rules/multi-dev-task-queue-law.md`, `ring0-traffic-control-law.md`, `.agents/rules/ecc/common/performance.md`.
>
> **Port shape: a MAPPING, not a copy.** TheColliery is a 9-repo series with a per-repo department head under a human chair. LegendofSoulTH is ONE repo with Ring 0 + Ring 1 devs. The belt collapses cleanly at that scale — that is the point of holding only the core.

## What this repo ALREADY has (verified — do not re-add)

| Core principle                   | Already here       | Where                                                                                                                          |
| -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **One topic per worker**         | ✅ complete        | rule 16 — _"1 dev = 1 topic = 1 task, always"_, `TASKS.md` as the claim ledger, Ring-0-locked claims                           |
| **A gate before anything lands** | ⚠️ half            | rule 18 — Ring 1 never pushes `master`; Ring 0 is the standing merge controller with a fresh-tip re-check                      |
| **Belt end**                     | ✅ exists, unnamed | Ring 0 IS the belt end. It dispatches, gates, and merges — the same three terminal roles a department head holds in the series |
| **Graduation / dogfood loop**    | ✅ complete        | `AGENT_BLUEPRINT.md` + `docs/agent-blueprint/NN-*.md`, `%`-banded, dry-signal graduation                                       |
| **Model × effort per position**  | ❌ absent          | only inherited ECC `common/performance.md` — generic selection criteria with hardcoded model names, no per-position assignment |

**So the port is three additions, not a system transplant.**

---

## PRE-INSTALL — clear the stale session estate (one-time, before the first read)

The belt starts from a clean floor: no stale agent sessions whose ids could be resumed by accident, no leftover claims from pre-belt work. This repo's workers are **fresh sessions by design** (see _Deliberately NOT ported_ — no sid-resident roster here), so old sessions carry no protected experience: clearing them loses nothing the belt model wants to keep.

**The requirement: KEEP exactly 1 session — the newest — and clear the rest.** The kept session is the one the install itself will run in (the window where you order "read the file" then "สร้างทำเนียบ"); everything older goes.

**Step 1 — close every OTHER live Claude Code window on this project.** The one session you are keeping may stay open; anything else must be closed before clearing — never delete a transcript a running session is still writing. This is the one ordering rule in this section.

**Step 2 — LOOK before you clear** (list what exists, newest LAST — the bottom row is the keeper):

```powershell
Get-ChildItem "$env:USERPROFILE\.claude\projects\C--Users-zxc59-source-repos-LegendofSoulTH" -Filter *.jsonl |
  Sort-Object LastWriteTime | Select-Object Name, LastWriteTime, Length
```

Confirm the bottom row (newest) really is the session you intend to keep working in. Anything else you recognize as unfinished work worth keeping — note its id; the rest is history.

**Step 3 — archive everything EXCEPT the newest 1** (a move, not a permanent delete — recoverable by default; the Recycle Bin via Explorer is equally fine):

```powershell
$slug = "C--Users-zxc59-source-repos-LegendofSoulTH"
$src  = "$env:USERPROFILE\.claude\projects\$slug"
$arch = "$env:USERPROFILE\.claude\session-archive\$slug"
New-Item -ItemType Directory -Force $arch | Out-Null
Get-ChildItem $src -Filter *.jsonl |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 1 |
  Move-Item -Destination $arch
```

`-Skip 1` is the keep-1 rule: the newest transcript stays put and resumable; every older one moves out. The archive sits OUTSIDE `.claude\projects`, so the resume picker no longer lists the moved sessions; the bytes survive until you empty the archive yourself, deliberately.

**Verify the keep (one line — exactly 1 row should remain):**

```powershell
(Get-ChildItem "$env:USERPROFILE\.claude\projects\C--Users-zxc59-source-repos-LegendofSoulTH" -Filter *.jsonl).Count
```

**Optional sweep, same pass:** per-session scratch under `$env:TEMP\claude\$slug\` (throwaway by contract, safe to delete outright) and orphaned task stores under `$env:USERPROFILE\.claude\tasks\<old-session-id>\` (harmless if left — they simply never fire again).

**What this touches and what it does not:** local session history ONLY. Nothing in the repo, nothing in git, no file under the project tree. Claude Code also expires transcripts on its own (`cleanupPeriodDays`, factory 30 days) — this step exists so the belt starts clean NOW instead of 30 days from now.

---

## 0. THE FIRST MOVE — forward the user's words; the belt end routes

**A user reports a SYMPTOM. A system is a MECHANISM boundary. Mapping one to the other is a DIAGNOSIS — and diagnosis is depth work the dispatcher does not have the knowledge to do.**

So the first move is not classification. **Main forwards the user's words VERBATIM to the belt end**, adding only what main alone holds: priority, what else is in flight, what must not be touched. **Main does not name the system.** Guessing it is how the wrong maker gets woken with a confident, wrong framing attached.

**The belt end is the right seat for this by construction, not by seniority** — it tends every seam (§2b), and a symptom the user can see almost always surfaces AT a seam.

**Worked example, using this repo's own contract data.** User says: _"the character faces the wrong way when attacking."_ The obvious guess is `02-combat-facing-system`. Reading that contract's own `It does NOT own:` clause narrows it to three real candidates, and the guess is only one of them:

- **`02` itself** — deriving/mutating the `CombatFacing` axis
- **`EntitySprite.tsx:100`** — sprite frame selection keys off `entity.facing` (the 8-way `Direction8`), **never `combatFacing`** — a different axis entirely
- **`ComboSystem.ts:102`** — copies `combatFacing`→`facing` to lock direction mid-combo

**All three are named in documents the belt end already reads. None of them are visible from the prompt.** That is the whole argument.

**THE ROUTING PROCEDURE:**

1. Read the candidate contracts' `Scope` + `It does NOT own:` — usually narrows to 1–3.
2. **One narrows it → route, and carry the evidence** (`file:line` + why this owner) so the maker starts where the belt end stopped.
3. **Still 2–3 → fire ONE cheap read-only probe to identify the owner** — locate, never fix. Guessing is not the alternative to knowing; a probe is.
4. **Genuinely spans systems → it is seam work, and it is the belt end's own** (§2b) — gated by the caretaker whose file was touched.

**A misroute costs one read, not one unit of work.** The receiving caretaker opens its own `It does NOT own:`, answers _"not mine — that lives in `HitboxSystem.ts`, system 03"_, and bounces **with the pointer**. The contracts carry their own correction path; that is what makes routing cheap to get wrong and worth never guessing at.

### 0b. THE NAMED SHORTCUT — when the report already carries the coordinate

A community bug report, a stack trace, a reviewer's comment: _"file A, line 10."_ **The mapping symptom→mechanism has already been done — by the reporter.** Main is not diagnosing, it is forwarding a pointer, so §0's justification does not apply and **main routes straight to the owning maker.** One hop saved, and hops nest multiplicatively (§5).

**THE BRIGHT LINE, so this stays a SHAPE and never decays into a confidence level:** **the coordinate must have been SUPPLIED, never INFERRED by main.**

- The report says `A:10` → main forwards a pointer. **Allowed.**
- Main reasoned its way to `A:10` → that IS diagnosis. **Belt end**, no exception.

The test reads the INPUT, not main's own certainty — which is the point, because _"small, and I was sure"_ is the exact rationalization that produces misroutes.

**A SUPPLIED COORDINATE IS A CLAIM, NOT A FACT.** Reporters name **where the symptom surfaced** — the top stack frame, the file they were reading — not where the defect originated. The producer/consumer inversion is the common shape: a report against `HitboxSystem.ts:48` whose real defect is the deadzone constant back in `combatFacing.ts`.

**So the receiving caretaker answers TWO questions before touching anything:**

1. _Is this file mine?_ — its own `It does NOT own:` settles it in one read.
2. _**Is the defect here, or upstream of here?**_ — an upstream defect is a seam question, not this caretaker's work.

**EITHER ANSWER BOUNCES THE SAME WAY, and there is exactly one rule: A RETURN GOES TO WHOEVER DISPATCHED IT.** Main dispatched under this shortcut, so the _"not mine"_ comes back to **main** — never sideways to a peer caretaker, never to a seat that did not ask. Authority flows downward only; a worker choosing the next owner would be a worker dispatching, which it is not. Main then does what it should have done had the coordinate not looked solid: **hands it to the belt end**, because it is now a diagnosis question again.

**So a failed shortcut does not invent a recovery path — it FALLS BACK INTO §0.** That is the whole safety property: the fast path, when wrong, rejoins the normal one.

**THE ARITHMETIC, so this is a measurable bet rather than a preference:**

|                         | hops to reach the right maker                                     |
| ----------------------- | ----------------------------------------------------------------- |
| §0, normal              | main → belt end → caretaker = **2**                               |
| §0b, coordinate correct | main → caretaker = **1** — saves 1                                |
| §0b, coordinate wrong   | main → caretaker → main → belt end → caretaker′ = **4** — costs 2 |

**Saves one when right, costs two when wrong — so the shortcut pays only while supplied coordinates are right more than roughly two times in three.** That is checkable against your own issue tracker, not a matter of taste: **if reports in this community usually name the surface rather than the root, retire the shortcut** and route everything through §0.

**AND THE BELT END IS TOLD, even though it is not in the path.** One line, informational — never a request for permission. It is the only seat watching the stream longitudinally (§2b); work that flows around it silently erodes the very baseline that lets it notice drift later. **Bypassing the belt end's HANDS is the saving; bypassing its EYES is a cost with no upside.**

## 1. THE GATE'S TWO OUTPUTS — pass forwards, fail bounces to the MAKER

**MAKE → GATE. Exactly two outcomes, no third:**

- **pass** → the work moves to the next station
- **fail** → it bounces back to **whoever made it** — never to the gate-keeper to patch, never upward to Ring 0 to fix

**Why the direction is load-bearing:** a gate that fixes what it finds stops being a gate — it becomes a second maker with nobody checking it, and the original maker never learns the class of defect they produce. The series learned this as _"a sub verifying its own work is not review."_ Here it reads: **Ring 0 finding a defect at merge does not fix it — it returns it.**

**A BOUNCE CARRIES THE FULL FINDING, never a bare flag.** `file:line` + the mechanism + the failure scenario + the evidence that convinced the reviewer. Paid for **while the reviewer's context is warm.**

> A bare _"this is buggy"_ transfers the cost to the maker at re-derivation prices — they must reconstruct from nothing what the reviewer already knew. **A bounce too thin to act on without re-investigating is an unfinished review**, held to the same standard as _"pushed is not a report."_

**"Pushed" is not a report.** When work is reported done, name the gate it cleared and who cleared it — or state plainly that no gate ran. **Silence is not a pass**; it reads as one, which is the whole problem.

### 1b. EXTERNAL INTAKE — PR only, and a PR enters at the MAKE station (owner ruling 2026-08-09)

Owner's ruling, verbatim: **"dev นอกบังคับ PR อย่างเดียว การดึง PR เข้ามา คือการที่เริ่มจากสถานีสร้าง."**

- **Outside devs (Ring 1 humans, cloud agents — Codex/Cursor/Antigravity/GPT) reach this repo through a PR, and nothing else.** No direct pushes (rule 18 already said that), and no informal hand-the-work-over path either — this ruling tightens rule 18's Path B for CODE intake: code arrives as a PR or it has not arrived. (Whether Path B survives for non-code asks is an install-time AGENTS.md decision, HetCreep's.)
- **Pulling a PR in = the work entering the line at MAKE.** The PR's author is the maker; the PR body's own "tested/passing" claims are the maker's claims (§4 — a claim, not a result). Nothing about a PR arrives pre-passed.
- The flow (owner ruling 2026-08-09, superseding the earlier bounce-to-author draft): **PR → QC gate → pass = onward to the next station (unit gate/merge per our own steps) · fail = bounce INWARD to a Ring-0-side maker** — the owning system's caretaker seat adopts the work and fixes it IMMEDIATELY, carrying the QC's full finding (file:line + mechanism + failure scenario + evidence). The fix then re-enters the belt at the same steps: fix → QC again → onward. The external author is NOT the bounce target, for two reasons the owner named: **(1) the Ring-0-side caretaker knows the system DEEPER than the outside dev's PR does** — it holds the contract, the memory file, the scars, and the seams, where the PR only knows the surface it touched; the fix belongs with the deeper knowledge. (2) An outside maker can't be resumed or commanded by this belt, so responsibility transfers inward rather than the work stalling on the PR thread. The gate itself still never fixes anything (§1 holds — the adopting maker is a MAKER seat, distinct from the QC that failed it).

Derivation from the core, since this file demands it: this section adds no new mechanism — it only names WHERE outside work enters (**สร้าง**) and which existing gate it faces (**ผ่าน QC → ได้ไปต่อ · ไม่ผ่าน → โดนดีดกลับ**, bounced to the maker who happens to sit outside).

---

## 2. MODEL × EFFORT — a STANDING REGISTRY per position, not a per-task decision

**This is NOT re-derived here.** It is carried from the series' own researched table, which was commissioned for exactly this question and grounded against **15 sources** — `TheColliery/.claude/agent-roster.md` §MODEL×EFFORT TABLE, backing report `scratchpad/longrun/MODEL-EFFORT-GROUNDING-2026-07-30.md`. Positions below are the LegendofSoulTH mapping; the **basis** column is the original's, not fresh opinion.

| Position here                         | model                                                                | effort                                                | basis (from the grounded table)                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ring 0 / belt end**                 | user-set, never routed                                               | —                                                     | the belt-end seat is the human's own choice, out of scope for routing                                                                                                                                                                                                                                                                                                                                            |
| **Implementation (code)**             | sonnet                                                               | high                                                  | the vendor's default coding tier; escalate to opus per-task on hard bugs / architecture                                                                                                                                                                                                                                                                                                                          |
| **Docs / ship-text**                  | sonnet                                                               | high                                                  | doc-truth work; merges and structure need care                                                                                                                                                                                                                                                                                                                                                                   |
| **Review / QC**                       | **opus**                                                             | **xhigh** (fall back to high if the flag is rejected) | first-party guidance gives **MORE** capability to high-stakes review. **The "reviewers can be cheap" claim traced to NO source; all three traceable points say the opposite.**                                                                                                                                                                                                                                   |
| **Research / recon (web-bound)**      | sonnet                                                               | **high standing · xhigh only on named triggers**      | model stays — the task is tool-call/source-bound. The vendor's own effort page names _"detailed web search"_ + _"repeated tool calling"_ as the exemplar xhigh case, and effort's documented lever is _"how far it pushes before checking in"_ — this position's real failure mode is stopping too soon. xhigh costs _"meaningfully higher token usage,"_ so it stays situational, on triggers named in advance. |
| **Single-use probe / throwaway leaf** | sonnet — **PIN the model parameter on EVERY spawn, unconditionally** | session default                                       | Measured, not assumed: an unpinned built-in `Explore` leaf ran **capped at opus**, while an unpinned `general-purpose` leaf **inherited the session model** — two agent types, opposite behaviour, confirmed by the platform's own `modelUsage` billing receipt, never a self-report.                                                                                                                            |

**The two tier-level rulings that are NOT preferences — carry them or the table misleads:**

- **`fable` (top tier) = FLIP-ONLY, never a standing default for any position.** A standing top-tier default bypasses the spend-consent doctrine, and the quota is shared. Candidacy differs sharply **by role**: code + engine work = candidate only once a lower tier is **proven** insufficient · **review = DOWNGRADED candidate** — a dated third-party benchmark (105-example review set, methodology stated) found it _worse_ than the prior top tier on precision **and** on noisy-comment volume for code review specifically, so it is an escalation after ≥2 stuck rounds, at `high` not `xhigh`, because the failure mode there is NOISE · docs + throwaway leaves = **never**.
- **`haiku` (cheapest tier) = NEVER, and the reason is a CATEGORY MISMATCH, not a capability judgement.** It is **structurally excluded from the `effort` parameter** — verified live against the platform's supported-models list, which enumerates nine models and omits it; it runs an older discrete thinking mechanism instead. **So it is not a cheaper point on the same dial — it is a different dial this two-column schema cannot express**, before task-fit is even asked. Its measured weakness is _nested/hierarchical structure-reading_ (11/8/9 against sonnet's 4/4/4 and opus's 5/5/5 on an enumeration rail) while it ties or beats the top tier on flat bounded decisions — and every standing position here reads structured content. **A "cheapest tier for bulk work" row is the trap; do not add one.**

**RULES for the registry itself:**

- **It is a STANDING TABLE.** Every position has its row before any work arrives. A tier decided per-dispatch gets re-argued per-dispatch and drifts.
- **Name the TIER in the rule file, resolve to a live model at dispatch.** Model names rot every release — the inherited `ecc/common/performance.md` in this repo already hardcodes three, which is the shape to avoid.
- **PIN model + effort on EVERY dispatch.** Unpinned means "inherits whatever the session is" — silently, and usually wrong for the position.
- **DEFAULT CONSTANT, flips are the belt-end's judgement.** Vendor-verbatim: _pick an effort level at the start and keep it constant._ Measured cost of not doing so: a same-settings resume ≈ **$0.09**, a resume after changing model/effort ≈ **$0.51** (~5.7×) — the cache prefix is rebuilt. Flip when one hard task is worth one rebuild, and **record the flip on the position's row.**
- **NEVER DELEGATE SENSITIVE WORK DOWN** — auth, payments, RLS/policy, schema migration, anything catastrophic-on-error. Size is not the test; this repo already has the live shape in rule 22's `findPlayerByUid` RLS incident, where the diff was small and the blast was not.

> **Honest caveat, carried verbatim from the source table rather than dropped:** the vendor's own guidance is **TASK-shaped, never ROLE-shaped** — this per-position mapping is _our interpretation_, and the docs' _"low effort … such as subagents"_ line conflicts with their own review-capability guidance (resolved here per ROLE, not per layer). Re-derive against the grounding report before citing any number from this table as vendor fact.

### 2-BOOTSTRAP — "สร้างทำเนียบ": the registry file, ready to materialize on that order

When the owner orders the registry created (**"สร้างทำเนียบ"** or equivalent), create ONE file from the template below — suggested path `docs/AGENT_REGISTRY.md`, the owner may rename — and stop. Do not invent extra sections, do not pre-fill rows the template marks lazy.

```markdown
# AGENT REGISTRY — ทำเนียบตำแหน่ง (standing MODEL × EFFORT per position)

> ONE row per position. Update IN PLACE — never append a duplicate table, never add a second
> row for a position that has one. A flip (per-task stronger model/effort) is RECORDED in the
> row's notes, then the row returns to its standing default. Source of the tiers: BELT-PORT.md §2.

## Standing positions

| Position          | Scope        | Model    | Effort          | Notes / recorded flips                                                  |
| ----------------- | ------------ | -------- | --------------- | ----------------------------------------------------------------------- |
| Belt end (Ring 0) | whole repo   | user-set | —               | never routed; the human picks this seat's model                         |
| Implementation    | per dispatch | sonnet   | high            | escalate opus per-task on hard bug / architecture; record here          |
| Docs / ship-text  | per dispatch | sonnet   | high            |                                                                         |
| Review / QC       | per dispatch | opus     | xhigh           | fall back high if xhigh rejected; NEVER cheaper than the maker it gates |
| Research / recon  | per dispatch | sonnet   | high            | xhigh only on a named trigger (deep web sweep, repeated tool calls)     |
| Throwaway probe   | per spawn    | sonnet   | session default | PIN the model parameter on EVERY spawn, unconditionally                 |

## System caretakers (LAZY — a row is written at FIRST dispatch, never pre-created)

| System (docs/agent-blueprint/NN) | Position | Model | Effort | Born | Notes |
| -------------------------------- | -------- | ----- | ------ | ---- | ----- |

<!-- rows appear here as systems get their first dispatch; 28 systems ≠ 28 upfront rows -->

## Rules (from BELT-PORT.md §2 — the registry inherits them, restated once)

- PIN model + effort on EVERY dispatch. Unpinned = inherits the session, silently.
- fable = FLIP-ONLY, never a standing default in any row. haiku = NEVER (category mismatch).
- Sensitive work (auth · payments · RLS · schema migration) NEVER delegates down. Size is not the test.
- DEFAULT CONSTANT: a flip breaks the worker's cache prefix (~5.7× measured) — flip when one task is worth one rebuild, and record it.
```

**Why the caretaker table starts EMPTY:** a row is a claim someone holds the position; 28 pre-created rows are 28 unverifiable claims on day one. The series measured the failure the other way — duplicate hires because a stale roster made "does a holder exist?" expensive to answer. One glance must answer it, so rows are born with the work, in place.

> **Row-side lazy rule SUPERSEDED for the 1–28 backlog at install (owner GO 2026-08-09, "ส่งบินพนักงานออกไปเป็น wave — เอา 1 wave ต่อ 1 systems"):** all 28 caretakers were HIRED in the install waves and `docs/AGENT_REGISTRY.md`'s rows were pre-created WITH locked session ids — the "unverifiable claims" objection dissolved because every row names a live hired session (main = sole resumer). The LAZY principle itself survives where its premise still holds: `MEMORY/NN` files are born at the caretaker's first WORK dispatch, not at hire, and any FUTURE seat is hired-on-ratify rather than pre-created. The template above deliberately keeps the lazy shape — a fresh registry elsewhere starts empty; this repo's did too, for one day.

---

## 2b. THE SEAM BELONGS TO THE BELT END — and it is gated like everything else

**The unit that maps cleanly onto one agent here is ONE SYSTEM** (`docs/agent-blueprint/NN-*.md`, 28 of them + one dogfood record). Each contract already carries what a topic boundary needs: a **Scope that states what it owns AND what it does not own**, enumerated inputs/outputs, dependencies **in both directions**, and concrete done-criteria. That is a better-specified topic than most projects ever get.

**But a system's TOPIC is bounded while its FILE SET is not.** Verified on `02-combat-facing-system` — 51 lines of its own, and a **consumed-by list spanning seven call sites in other systems' files** (`MovementSystem.ts:131` · `EnemyAISystem.ts:134` · `HitboxSystem.ts:48` · `DamageSystem.ts:88` · `ComboSystem.ts:102` · `RealtimeBattleRuntime.ts:162` · `createRealtimeBattle.ts:47,96`). Two agents on two unrelated systems can still land in the same file.

**THE MAPPING — the same split CoalWash runs, collapsed for one repo:**

| CoalWash                                                       | here                                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| lane coder — engine internals                                  | **system caretaker** — that system's own scope, nothing else               |
| room coder — _"whatever the part touches OUTSIDE the engines"_ | **the SEAM** — every consumed-by call site living in another system's file |
| head — assembles, FINAL CHECK, ships                           | **belt end** — same                                                        |

**The caretaker never leaves its own scope, and the contracts already enforce it**: each one's `It does NOT own:` clause names the seam-side files explicitly (`02` hands `HitboxSystem.ts`'s hit math, `EntitySprite.tsx`'s frame selection, and `DamageSystem.ts`'s knockback application away by name). **So the file-collision risk closes structurally — no separate overlap-checking mechanism is needed.** The seam is the belt end's.

**AND THE SEAM IS GATED, because the belt end is a MAKER there.** MAKE → GATE takes no exception for rank:

| layer              | maker                  | gate                                        | a failure bounces to                            |
| ------------------ | ---------------------- | ------------------------------------------- | ----------------------------------------------- |
| inside a system    | the system's caretaker | QC                                          | the caretaker                                   |
| **the seam**       | **the belt end**       | **the caretaker who owns the touched file** | **the belt end — it repairs its own seam work** |
| the assembled unit | —                      | the belt end (FINAL CHECK)                  | whichever lane broke                            |

The seam's gate is deliberately the caretaker of the file that was touched: **a separate party from the maker, and the one who knows that file best** — no new seat required.

**The residual, named rather than hidden:** the belt end runs FINAL CHECK over a unit containing its own seam work. Half-answered already — the seam passed an independent gate one row above, and FINAL CHECK asks a different question (does this unit fit the stream; is anything unaccounted for), not a second code review. For the rest, the series' standing rule covers exactly this case: **for work the belt end made with its own hands, it spawns ONE fresh reviewer rather than trusting its own gut**, because that gut has seen the work being made.

**Owner rulings 2026-08-09 ("เพิ่ม QC ของการประกอบ · ตัด main ออกจาก Belt end · 8+9 รวมกัน") — generalized from the system-21 walkthrough:**

1. **Main holds NO gate.** Every judging seat is SPAWNED fresh — main (the chair session) is cut out of the belt-end gate entirely. Main's remaining hands: routing/dispatch, collecting returns, and the mechanical merge AFTER every gate is green. The generalization of "spawns ONE fresh reviewer rather than trusting its own gut" from its-own-work to ALL final checks.
2. **The assembled unit is gated by ONE spawned "Unit Gate" seat** (opus·xhigh) carrying TWO mandatory sections, each returning its own explicit verdict — merged from what were two seats, since the load-bearing independence is maker≠gate, not gate≠gate:
   - **Section A — Assembly**: does the joined system meet the contract's own done-criteria (three green parts can still fail assembled — the measured case). Fail bounces to the JOINER.
   - **Section B — Stream fit**: does the unit fit the stream; all N items back with verdicts; any seam side-effect unaccounted for. Fail bounces to the offending LANE.
     A section with no verdict is itself a finding. **Split-back trigger** (per-dispatch, never default): a unit too large for one reviewer to hold both depth and breadth → split A/B back into two seats for that dispatch.

**The honest cost, and the trigger to undo it:** making the belt end a maker fills the one seat that must hold the longitudinal view with code work. CoalWash keeps them separate (room coder makes, head gates); this port collapses them because one repo does not justify the extra seat. **Split an `integration` seat back out when seam work starts costing the belt end more time than gating does** — a trigger, not a size.

## 2c. WHEN ONE SYSTEM IS TOO BIG FOR ONE AGENT — the same primitive, nested

The primitive composes downward without changing shape. A system too large for one agent splits into PARTS, each part a full maker→gate pair, then joined and gated as one system:

```
make 1  ->  QC 1  \
make 2  ->  QC 2   >--  JOINER  -->  QC, and its unit of judgement is THE SYSTEM
make 3  ->  QC 3  /
```

**That is CoalWash's branch-line structure, one level in** — lane a and lane b each run a full mini-line, the room coder assembles, the room reviewer inspects the assembled whole. Identical shape, smaller scale. **A design that needs no new shape at a new scale is the evidence the shape is real.**

**THE JOINER IS THE SYSTEM'S OWN CARETAKER.** It owns the system, so it owns assembling the system's parts — which makes it a **mini-belt-end for its own system**: it splits the work, it joins it back. And because joining makes it a MAKER at that layer, it is gated one layer up by the system QC. **The fractal closes: at every level, maker → gate, and the joiner at level N is a maker gated at level N+1.** No level gets an exception, including the belt end (§2b).

**WHY THE FINAL QC IS NOT REDUNDANT with QC 1/2/3 — measured, not assumed.** The part gates and the system gate ask different questions: _did this part meet ITS spec_ versus _does the assembled thing meet the SYSTEM's done-criteria_ (the contract's own numbered list). Three green parts can still produce a failing system. **CoalWash hit exactly this live: class-b's conformance guard went red on class-A's file — something class-b's own bench structurally could not see, because the cross-part interaction only existed once both parts sat in the same place.**

**DO NOT MAKE THIS THE DEFAULT.** `02-combat-facing-system` is 51 lines and five functions; splitting it three ways buys three agent instantiations and three QC rounds for work one agent finishes in a single pass. **Split on a TRIGGER, never on a line count:**

- the system is genuinely too large for one agent to hold at once (`21-netcode-networking-system` shape), **or**
- **its parts are different KINDS of work** — game logic versus shader versus art asset are not one job in three files; heterogeneous work is the stronger reason to split than size ever is.

**Bounded fan-out.** One system split three ways costs 4–7 agents (3 makers + 3 gates + the joiner) instead of one. Split as far as the trigger forces and no further — splitting because it is possible is how a discipline becomes ceremony.

## 3. ONE TOPIC PER AGENT — the half rule 16 doesn't cover

Rule 16 binds **devs**: _1 dev = 1 topic = 1 task._ Extend it verbatim to **agents**, plus one addition the human case doesn't need:

- **An agent holds ONE topic per dispatch.** Not two "since they're both small" — batching two topics into one agent is how the second one silently drops.
- **The count is the chair's, and it is auditable.** If Ring 0 hands an agent N items, the completeness question is _did all N come back accounted for_ — not _were the returned ones good_. Those are orthogonal: three excellent returns out of five is a truthful report of an incomplete order.
- **Every item comes back with a verdict**, and the honest set is small: **DONE** (name what delivered it) · **LIVE** (real work still owed) · **DEAD** (name what killed it) · **BLOCKED** (name what on) · **NOT-STARTED**. **An item that comes back with no verdict at all is the finding.**

---

## 4. IF THE WORK CLAIMS A MEASUREMENT, IT OWES AN EXPERIMENT RECORD

_(Optional but cheap; this repo's `AGENT_BLUEPRINT.md` dogfood loop already implies it.)_

A claim of _"tested / measured / verified"_ without a record is a **claim, not a result** — however confident the report reads.

**A record must name its SUBJECTS, not only an aggregate.** An animal study that never records which animals entered and what became of each cannot show any individual animal was studied. Same here: `348/348 pass` proves nothing about which subjects ran if the denominator can shrink silently.

**Practical form at scale** (so it is actually followed):

- The aggregate covers only subjects with the **normal** outcome.
- **Every abnormal one is named individually** — every skip with its reason, every failure, every not-run.
- The record states the **command that re-derives the list**, so the count can be reconciled against the roster rather than trusted.

**Measured in the series:** a scoring script returned two empty walkers and reported `7 of 9` — an apparent improvement manufactured by dropping the readers who failed, and both dropped ones were the weakest tier, i.e. exactly the population that fails. Its replacement refuses to print an aggregate unless every subject parses.

---

## 5. THE MECHANISM UNDERNEATH — `claude -p` nested inside `claude -p`

Every structure above needs one thing to be executable: **a `-p` worker can itself run `claude -p`.** Verified, not assumed — a worker holding a Bash tool spawns its own children, sets their `--model`, and resumes any sid it knows; confirmed against the platform's own billing receipt rather than a worker's self-report. **The depth-3 Agent-tool revocation does not bind this path — it is a different spawn channel entirely.**

That is what makes the belt real at three levels: **belt end → system caretaker → part-makers** (§2c). It already runs at two levels in the source series today.

**FIVE RAILS, and they bind at EVERY level, not only the top:**

| rail                                              | why nesting makes it sharper                                                                                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **background + a blocking wait in the SAME turn** | a `-p` session that ends **kills its children instantly**. Every level must collect before it returns — the deeper the tree, the more places this can silently break                                           |
| **chunk under ~8 minutes**                        | the shell tool's ~10-minute ceiling **nests**: a caretaker's budget sits INSIDE its head's, which sits inside main's. Time is consumed multiplicatively, not additively                                        |
| **ONE PARENT PER SID**                            | if a head resumes caretaker X while the belt end also resumes X, **both are destroyed silently** — exit 0 on each side, and the next resume sees neither                                                       |
| **close the bottom level explicitly**             | an allow-list does **not** remove tools — it pre-approves some. Only an explicit _disallow_ actually strips the spawn and shell tools. A part-maker left holding a shell can spawn its own tree, without bound |
| **bounded fan-out**                               | spawn density is the cost driver and the rate-limit driver both                                                                                                                                                |

**The arithmetic, so the §2c trigger has a number behind it:** one system split three ways costs **belt end 1 + caretaker 1 + (3 makers + 3 gates) = 9 sessions for one system.** Unsplit, it is 3. That is why §2c splits on a trigger and never on possibility.

## 6. THE SEAT IS THE CWD — and the one wall this repo actually has (owner ruling 2026-08-09)

Owner's ruling, verbatim: **"ประธาน = main = cwd."** A cwd fixes three things at once — the governance that auto-loads (the up-tree rules walk), which sessions are reachable at all (a headless `--resume` is PROJECT-scoped: a session is resumable only from its own project's cwd), and what counts as a room one level down. So **a new cwd is a new chair**: the same main that chairs a 9-repo series at its umbrella cwd chairs THIS one repo at this repo's cwd, with the 28 systems as the rooms. Ring 0 running at `LegendofSoulTH/` IS that seat — nothing to install, the cwd already did it.

**The root is the one node not defined by a cwd.** Every agent in the tree is; the human is not — the human runs inside no project. That is why the human is the only seat that can inspect the chair itself (the series measured the alternative: an ungated top seat drifted, and only the human caught it).

**THE HONEST ASYMMETRY — read this before trusting any worker boundary here.** A multi-repo org gets worker separation FOR FREE, mechanically: different cwds mean different resume scopes, so one room's worker cannot reach another room's by construction. **A single-repo org does NOT.** Every worker at this repo shares one cwd and one resume scope — nothing mechanical stops dev B touching dev A's files or resuming dev A's session if it learns the sid. Separation here rests entirely on DISCIPLINE: rule 16's claim ledger (`TASKS.md`) plus each system contract's `does NOT own` boundary. **In this repo the contract is not documentation — it is the only wall there is.** That is why a contract edit is a security-grade change here, not a doc tweak: weakening a `does NOT own` line removes the only fence that line was.

## 7. THE TWO-LAYER LAW — command Ring 0 · command Ring 1 · identity is the un-forgeable anchor (owner ruling 2026-08-09)

The coming law overhaul is structured as **two layers, split by WHO each law commands** — not one flat rulebook every reader filters themselves:

- **Ring-0 layer (commands the belt end / main seat):** routing duty (§0 — forward, never diagnose), gates are SPAWNED never held (main holds no gate), the merge procedure (fresh-tip re-check, all gates green first), the migration relay (owner pastes, agent verifies read-only), seam ownership + its gate, registry upkeep (flips recorded, rows ratified), **and version-bump authority (owner ruling 2026-08-09): Ring 0 auto-bumps without asking, governed by the universal standard — SemVer 2.0.0 (patch = fixes · minor = backward-compatible features · major = breaking) — under two guards this repo has already paid to learn:**
  1. **Cadence: a live game must not update so often players feel it** — merged units BATCH into one release train; the bump fires when a coherent release has accumulated, not once per merged unit. The hotfix is the exception, not the rhythm: broken-on-live bumps immediately (that is what patch is for — the v0.15.1/v0.15.2 shape).
  2. **A bump IS a deploy on this repo** (MEMORY item 176, learned live on v0.15.0): never bump while any merged unit's migration/Edge-Function/backend is still unapplied — the release train departs only when every wagon's backend is verified live.
  3. **Actors (owner ruling 2026-08-09): auto commit+push = main OR main's aide** (the mechanics of landing gate-approved work — the aide executes only what main hands it, content already through its gates). **Auto bump = MAIN ONLY** — the aide never bumps; a bump is a deploy, and deploy authority does not delegate.
  4. **CI fails at the commit/push step → bounce to the MAKER of the failing work (owner ruling 2026-08-09).** The commit station already detects it for free (pre-commit hooks + `npm run ci` + the GitHub check) — the committer (main/aide) DETECTS, never repairs. The CI output IS the finding, already precise to the failing test/lint line — it travels in the bounce as-is. Same law as every gate: fail moves backward to whoever made it, never sideways into the committer's hands.
- **The deepest-knowledge rule (owner ruling 2026-08-09): เมื่อมีคนรู้ลึกกว่า ให้คนคนนั้นทำ.** Ring-0 work goes to the seat that knows it DEEPEST — for a system's work that is its owning caretaker (it holds the contract, `MEMORY/NN`, the scars, the seams), and no other seat outranks it on its own ground. **No deeper knower exists** (a system whose caretaker was never born, orphan/cross-cutting work) → **fallback: main or main's aide** — aide when the work is mechanical-shaped, main when it needs judgment. Fallback work is still MAKE → GATE: what main/aide makes passes a spawned QC like everyone else's — the fallback grants a maker, never an exemption. **EXCEPTION — a NEWBORN system never routes to this fallback (owner ruling 2026-08-09): main is FORBIDDEN from carrying a new system's work itself.** The birth sequence is fixed: (1) the registry walk first — ground scope/size/kinds → propose → owner ratifies → row lands; (2) **hire its caretaker IMMEDIATELY** — a newborn starts staffed. The lazy caretaker-row rule covered the pre-belt backlog of systems 1–28 until the install hired all 28 (see §2-BOOTSTRAP's post-template note); it never applied to newborns.
- **The recurrence trigger (owner ruling 2026-08-09): the fallback is for ONE-OFFS.** The same TOPIC landing on main repeatedly is the signal to **hire a caretaker for that topic** — propose its registry row, owner ratifies, hire immediately (same sequence as a newborn system; a topic-caretaker gets a row like any other seat). Main's load is minimized by design: **main จับฉ่าย — the grab-bag seat, never the pack-mule.** It must not end up carrying any recurring line of work alone; recurrence = somebody else's standing job now.
- **Main's working method (owner ruling 2026-08-09): the task queue, always.** Every incoming task lands in the task system the moment it arrives — nothing is held in main's head. A NEW task re-triages the WHOLE queue into three urgency bands: **เร่งด่วนมาก (P1) · เร่งกลาง (P2) · เร่งน้อย (P3)**. Main queues, bands, and proposes — then **WAITS FOR THE USER'S SWITCH**: no queued item starts executing until the owner flips it (names the item or the band). The queue is the proposal; the switch is the consent. `TASKS.md` stays the durable repo ledger on top (rules 16/20 unchanged). Two riders (same ruling, extended same day):
  - **A decision the user did not make in that turn becomes a task IMMEDIATELY** — an open owner-decision surfaced but not answered gets queued on the spot (tagged decision-pending), never re-asked from memory and never lost.
  - **Continuous queue cleanup** — completed marked completed, superseded/stale deleted, duplicates merged, every visit; a rotting queue misroutes the switch.
- **Ship-vs-doc conflicts HOLD (owner ruling 2026-08-09, mid-install: "เจอขัดแย้ง ระหว่างของ ship vs เอกสาร ให้ hold เอาไว้ก่อน"):** a conflict between shipped code and its governing document is HELD — neither side edited — until the owner's design-lock answer lands (relayed from the design seat where needed). When it lands, the follow-up work is "adjust SHIP" or "adjust DOCS" per the answer, dispatched to the owning caretaker. The hold rides the finding, never the hiring/other work around it.
- **Ring-1 layer (commands outside devs + their agents):** PR-only intake (§1b — code arrives as a PR or it has not arrived), one topic per claim (rule 16), contract walls (`does NOT own` lines are fences, not documentation — §6), memory duties (root `MEMORY.md` push-with-submit; `MEMORY/` per-caretaker), never editing Ring-0 rule files.

**The language rule (owner ruling 2026-08-09):** agent↔agent traffic — dispatches, returns, bounces, gate records, `MEMORY/NN` files — is **English**, the trained language (precision + token efficiency both peak there). Agent↔user is **Thai**. DELIVERABLES follow their AUDIENCE, not the channel: player-facing ship-text (ToU/Privacy/credits/in-game copy) is Thai because the players are Thai; the return-report wrapping that deliverable is still English. Main is the translation boundary: it speaks Thai upward to the owner and English downward into the belt.

**The Ring test binds to the ONE signal that cannot be forged: the authenticated git/GitHub identity.** ไอดี GitHub ของใครของมันอยู่แล้ว — a commit's authenticated actor, a PR's author, a push's credential are each person's own; a self-declared ring, a local marker file, or prose in a PR body are convenience signals only and NEVER authoritative. This is already half-live mechanically: the repo's branch protection blocks non-Ring-0 pushes to `master` at GitHub's layer (Ring 0's own pushes show the bypass notice — that bypass right IS the ring boundary, enforced by identity, not by trust).

## Deliberately NOT ported

Phoenix-13 hook commandments · one-flock consistency rules · Coal\* room/skill names · SWEEP-MARKS · plugin/release patterns · the per-repo department-head layer (Ring 0 already fills it at this scale) · the persistent `sid`-resident roster (this repo's workers are humans + fresh agent sessions; `TASKS.md` already carries ownership).

**Add the head layer only if one Ring 0 stops being able to hold the whole repo** — that is the trigger the series' own model was born from, not a size to aim for.
