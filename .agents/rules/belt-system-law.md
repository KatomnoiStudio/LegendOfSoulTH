# Project Law: The Belt System (two-layer — Ring 0 commanded · Ring 1 commanded)

> Installed 2026-08-09 by HetCreep's direct order ("ต้องปรับก่อนบิน") after a day of owner
> rulings built it piece by piece. **`docs/BELT-PORT.md` is the CONSTITUTION** (full mechanism,
> every ruling with its reasoning, verbatim owner quotes); **`docs/AGENT_REGISTRY.md` is the
> STAFFING LEDGER** (standing seats, per-system headcount ratified for all 28 systems, hired
> session ids). This file is the BINDING DISTILLATION — when it and the constitution disagree,
> the constitution wins and this file has a bug; flag it, never silently pick.
>
> **The Ring test binds to the authenticated git/GitHub identity** — a commit's actor, a PR's
> author, a push's credential. A self-declared ring, a local marker file, or prose in a PR body
> is a convenience signal, never authoritative. (ไอดี GitHub ของใครของมันอยู่แล้ว.)

## THE CORE (owner's distillation — everything below is these lines at some scale)

**ถือ 1 เรื่อง ต่อ 1 agents · สร้าง → ผ่าน QC → ได้ไปต่อ · สร้าง → ไม่ผ่าน QC → โดนดีดกลับ**

## Layer 1 — laws that command RING 0 (the belt end / main seat, HetCreep's machine)

1. **Route, never diagnose.** A symptom is forwarded, contracts are read, at most one read-only
   probe locates the owner. Main names no system by guess. A SUPPLIED coordinate may route
   straight to the owner; an INFERRED one may not (the bright line reads the input, not
   confidence).
2. **Main holds NO gate.** Every judging seat (QC, Unit Gate) is SPAWNED fresh. Main's hands:
   dispatch/routing, collecting returns, SEAM work (rule 7 — the one maker role main keeps,
   itself gated), and git mechanics after all gates are green.
3. **Assignment follows deepest knowledge.** A system's work goes to its caretaker (contract +
   `MEMORY/NN` + scars). No deeper knower → fallback main (judgment) or the aide (mechanics),
   still gated. NEWBORN systems never take the fallback: registry walk → owner ratifies → hire
   the caretaker immediately. A topic hitting main REPEATEDLY = hire a topic-caretaker (main
   จับฉ่าย — grab-bag, never pack-mule).
4. **The task queue, always.** Every incoming task is queued on arrival, the whole queue
   re-banded (เร่งด่วนมาก/เร่งกลาง/เร่งน้อย), and NOTHING executes until the owner's switch. An
   owner-decision left unanswered in its turn becomes a queued task immediately. Continuous
   cleanup.
5. **Merge + version authority.** Auto commit+push = main or the aide (aide executes only
   gate-approved content main hands it), **with the fresh-tip re-check before every merge/push**
   (fetch + behind-check — the mechanism that closed the PR #19 silent-regression class). Auto
   bump = MAIN ONLY, SemVer 2.0.0, two guards:
   release-train cadence (a live game must not update so often players feel it; hotfix is the
   exception) and bump-IS-deploy (never bump while any merged unit's migration/backend is
   unapplied — MEMORY item 176). CI failure at the commit station bounces to the MAKER of the
   failing work; the committer detects, never repairs.
6. **Migrations relay through the owner.** An agent writes SQL; HetCreep applies it; main
   verifies read-only afterward. No agent applies to production.
7. **Seam work is main's** (cross-system call sites), gated by the caretaker whose file was
   touched — no rank exception. A system too big for one agent splits ONLY on a trigger (too
   large to hold at once, or heterogeneous KINDS of work — never a line count; splitting costs
   ~3x the sessions); **the JOINER is the system's own caretaker** — a mini-belt-end that
   splits its system's work and joins it back, gated one layer up. The assembled unit passes
   ONE Unit Gate (two mandatory verdict sections: A assembly-vs-done-criteria → bounces the
   Joiner · B stream-fit → bounces the offending lane).
8. **Registry upkeep**: pin model + effort on every dispatch (unpinned = silent inherit); tier
   flips recorded in the row then reverted; fable = flip-only + consent (never docs/probes,
   review-flips at high not xhigh); haiku = never; sensitive work (auth · payments · RLS ·
   schema migration) NEVER delegates down — size is not the test.

## Layer 2 — laws that command RING 1 (outside devs + their agents)

1. **PR only.** Code reaches this repo as a PR or it has not arrived — no direct pushes, no
   informal hand-offs of code. A PR enters the belt at the MAKE station: its author is the
   maker and its own "tested/passing" claims are claims, not results.
2. **A PR that fails QC is adopted INWARD** — the owning system's Ring-0-side caretaker takes
   it and fixes immediately, carrying the QC's full finding. (The caretaker knows the system
   deeper than the PR's author; an outside maker also cannot be resumed by this belt.) Pass →
   next station.
3. **One topic per claim** (rule 16, extended verbatim to agents): an agent holds ONE topic
   per dispatch; every item returns a verdict (DONE · LIVE · DEAD · BLOCKED · NOT-STARTED); an
   item with no verdict is itself the finding.
4. **Contract walls are fences, not documentation.** Every worker shares one cwd and one repo —
   the `Scope`/`does NOT own` lines in `docs/agent-blueprint/NN-*.md` are the only wall there
   is. Weakening one is a security-grade change — it lands only through an owner-ratified
   dispatch (a design-lock answer, a ratified registry ruling), never unilaterally by any seat.
5. **Memory duties**: root `MEMORY.md` rides every submit (rules 2/3 unchanged);
   `MEMORY/NN-<system>.md` is the caretaker's own file — lazy-born at first dispatch, written
   ONLY by its owner, read by the belt end.
6. **Never edit Ring-0 rule files** (`AGENTS.md`, `.agents/rules/**`) — flag disagreement
   instead (rule 6 unchanged, restated inside the belt).

## Cross-cutting

- **A RETURN GOES TO WHOEVER DISPATCHED IT** — exactly one rule for every bounce, including
  "not mine": never sideways to a peer caretaker, never to a seat that did not ask. Authority
  flows downward only; a worker choosing the next owner would be a worker dispatching, which
  it is not. (Sideways hand-offs also break the completeness ledger AND risk double-resuming
  a sid — ONE PARENT PER SID: two parents resuming the same session destroy it silently.)
- **The nesting rails** (BELT-PORT §5, binding at EVERY level): background children + a
  blocking wait in the SAME turn (a session that ends kills its children instantly) · chunk
  under ~8 minutes (the shell ceiling NESTS — time is consumed multiplicatively) · close the
  bottom level with an explicit DISALLOW (an allow-list does not remove tools; only a disallow
  strips spawn/shell) · bounded fan-out.
- **Language**: agent↔agent = English (dispatches, returns, bounces, gate records, `MEMORY/NN`);
  agent↔user = Thai; deliverables follow their AUDIENCE (player-facing ship-text is Thai). Main
  is the translation boundary.
- **A gate never fixes what it finds** — it bounces with the FULL finding (`file:line` +
  mechanism + failure scenario + evidence). A bounce too thin to act on is an unfinished
  review. "Pushed" is not a report: name the gate cleared and who cleared it — silence is not
  a pass.
- **Measurements owe records** (BELT-PORT §4): an aggregate covers only normal outcomes; every
  abnormal subject is named individually; the record states the command that re-derives the
  list.
- **Ship-vs-doc conflicts HOLD** for the owner's design lock — fix neither side until the
  answer lands; then the work is "adjust ship" or "adjust docs" per the answer, dispatched to
  the owning caretaker.
