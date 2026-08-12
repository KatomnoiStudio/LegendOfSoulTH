# docs/ — what is in here and which of it is still live

42 files. Without this page a reader cannot tell a document that still governs work from a
record of a run that finished a week ago, and that gap was not theoretical: `pvp/P12_VERIFICATION_REPORT.md`
had **zero inbound links** and turned out to hold the graduation gate for a task that is still
open. Nothing was wrong with the document; nothing pointed at it.

Every entry below says what the file **is**, and whether it carries **open state** — something
undecided, unbuilt, or waiting on a person. Open state is the only reason a document needs
reading rather than searching.

---

## The authorities — read these before changing the things they govern

| file                                                   | what it is                                                                                                                                                                                   | open state                |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| [`MASTER_BLUEPRINT_v3.0.md`](MASTER_BLUEPRINT_v3.0.md) | **Product North Star** (v1/v2 superseded). Locked decisions bind; CUT/DEFERRED items must not ship without HetCreep's approval. `AGENTS.md` rule 15.                                         | design decisions, ongoing |
| [`SPRITE-DESIGN-LOCK.md`](SPRITE-DESIGN-LOCK.md)       | The sprite standard — canvas, anchor, frame counts, foot line. What `src/game/spriteContract.test.ts` enforces.                                                                              | —                         |
| [`SPRITE-CONFORMANCE.md`](SPRITE-CONFORMANCE.md)       | The measured record behind that lock: what every kit actually is, and the tolerance register. Updated when art changes.                                                                      | —                         |
| [`agent-blueprint/`](agent-blueprint/)                 | **29 per-system work contracts** (`NN-<system>.md`) — scope, inputs/outputs, dependencies, done-criteria, known scars. Mandatory reading before implementing a system (`AGENTS.md` rule 17). | per-system, see each      |

## Waiting on a person

| file                                                               | what it is                                                                                                                                                                                                                                                                                                                                                                                  | waiting on           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| [`AUDIT-2026-08-12-v0.19.0.md`](AUDIT-2026-08-12-v0.19.0.md)       | The v0.19.0 audit, **and every open finding of that day** — §0b folds in the earlier scan's three HIGH defects (malformed public UIDs on every Google/guest account, an unrecoverable stalled battle-texture load, three tools that overwrite their own source). §0 and §0b each state their own coverage ceiling before their findings. All three HIGH items are rows 34-36 in `TASKS.md`. | someone to fix them  |
| [`BLUEPRINT-CHECK-HOLD.md`](BLUEPRINT-CHECK-HOLD.md)               | Per-system onboarding findings, 2026-08-09. Every ship-vs-doc conflict in it is **HELD** — neither code nor contract is edited — until the design-lock answer lands.                                                                                                                                                                                                                        | a design-lock answer |
| [`asset-provenance-questions.md`](asset-provenance-questions.md)   | Six questions about asset licensing/attribution that only the owner can answer.                                                                                                                                                                                                                                                                                                             | HetCreep             |
| [`pvp/P12_VERIFICATION_REPORT.md`](pvp/P12_VERIFICATION_REPORT.md) | What private-PvP verification covered, and the **graduation gate it has not passed**: P12 stays 90% until the migration and Edge Function are deployed and two real signed-in clients complete two clean rounds.                                                                                                                                                                            | a backend deploy     |
| [`SPRITE-ART-BRIEF.md`](SPRITE-ART-BRIEF.md)                       | The brief for whoever draws character art — what to deliver and in what shape.                                                                                                                                                                                                                                                                                                              | art                  |

## Finished records — provenance, not instructions

These describe work that is already done. They are kept because a claim in `TASKS.md` or
`MEMORY.md` is only as good as the evidence behind it. **Nothing here tells you to do anything.**

| file                                                                               | what it recorded                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`TASK-LEDGER-AUDIT-2026-08-12.md`](TASK-LEDGER-AUDIT-2026-08-12.md)               | The whole open task ledger audited against the code by 8 readers, then a refutation pass that broke 12 of 38 verdicts. Its corrections are already applied to `TASKS.md`. |
| [`SPRITE-FORMAT-EXPERIMENT-2026-08-12.md`](SPRITE-FORMAT-EXPERIMENT-2026-08-12.md) | One variable, three runs, answering "what is actually wrong with a PNG here". Generated by `tools/sprite-format-experiment.mjs`.                                          |
| [`DESIGN-LOCK-HANDOFF-20260809.md`](DESIGN-LOCK-HANDOFF-20260809.md)               | The design-lock questions as handed off, 2026-08-09.                                                                                                                      |
| [`hero-production/PRODUCTION_BATCH_01.md`](hero-production/PRODUCTION_BATCH_01.md) | The first five-archetype hero production batch.                                                                                                                           |

---

## Adding a document here

State in its first ten lines **what it is and whether anything in it is still undecided** — that
is what this index reads. A record whose conclusions have all been applied elsewhere belongs in
the finished table; say so plainly rather than leaving the next reader to infer it from a date.

And link it from wherever the work lives — `TASKS.md`, a contract, the code. A document nothing
points at gets found by accident or not at all, which is how a live graduation gate spent weeks
looking like an orphan.
