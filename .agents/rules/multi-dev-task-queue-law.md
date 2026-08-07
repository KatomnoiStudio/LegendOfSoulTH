<!-- coalmine: verified 2026-08-08 · exemplar ring0-traffic-control-law.md's single-writer merge model, extended to task-claiming + Bors/Mergify's priority/in-flight-queue visibility (grounded the pre-claim collision check below) · gaps found via a CoalBoard 4-seat opinion-lane sweep (2026-08-08), each spot-verified against live repo state before being filled here · revalidate 90d -->

# Multi-Dev Task Queue Law

> **Scope**: Binding for every dev/agent, every machine — Ring 0 and Ring 1 alike. HetCreep instruction, 2026-08-07: 3 devs (and possibly more later) now work this repo concurrently; task assignment must be explicit, not assumed.

## The rule

**1 dev = 1 topic = 1 task, always.** No two devs (human or agent) work the same task row in `TASKS.md` at the same time. If a task genuinely needs more than one pair of hands, it gets split into separate sub-task rows first — never two devs silently dividing one row by convention.

`TASKS.md` (repo root) is the single source of truth for **all** work: every claimable unit, its owner, its status, and its `%` complete. If it's not a row in `TASKS.md`, it isn't a task a dev can claim.

**This binds Ring 0 too, including for Ring 0's own work (found via a CoalBoard opinion-lane sweep, 2026-08-08 — a real, not hypothetical, gap: multiple rows sat `Owner: —, ⚪ not started, 0%` in this exact file after Ring 0 had already shipped and merged the code for them).** Ring 0 updates a row's `Owner`/`Status`/`%` in the **SAME commit** as any code Ring 0 itself writes against a currently-unclaimed row — the sole writer of the claim columns is also the party most likely to skip the ledger for its own work, precisely because there is no one else to catch the omission. Nothing code-enforces this; it is trust in Ring 0's own diligence, named explicitly because that trust has already failed once, observably, in this repo.

## Claim protocol (Ring-0-locked, updated 2026-08-07 — supersedes the earlier git-race version)

Claiming now routes through Ring 0 the same way merging does (`.agents/rules/ring0-traffic-control-law.md`) — one writer for `TASKS.md`'s claim columns removes the git-race entirely, instead of resolving it after the fact.

1. **Load**: Ring 1 reads `TASKS.md` (or `AGENT_BLUEPRINT.md`'s Lab-entry order if no preference) and **picks** one unclaimed row (`Owner: —`, `Status: ⚪ not started`). **Before claiming, check for in-flight work on the same system that `TASKS.md` wouldn't show** — an open branch or PR (`git branch -a` / the repo's open-PR list) already touching it, claimed or not (found via a CoalBoard opinion-lane sweep, 2026-08-08: this exact collision has already happened twice in this repo — a same-day parallel-implementation clash requiring an 8-file reconciliation pass, and a currently-open branch independently re-implementing an already-merged system, neither visible from `TASKS.md` alone since it tracks claimed rows only, never in-flight branch/PR scope). Anything found → treat it the same as an already-claimed row (step 5 below), even though `TASKS.md` itself doesn't show a claim.
2. **Lock request**: Ring 1 tells Ring 0 which row/task they're picking — same two channels as `ring0-traffic-control-law.md`'s handoff paths: Path A (a PR/issue comment naming the task) or Path B (just say it directly, no ceremony required).
3. **Lock**: Ring 0 edits that row — `Owner` → the dev's name/handle, `Status` → `🟡 claimed`, `Claimed` → today's date — commits (`docs(tasks): claim #NN <task name>`), and pushes. Ring 0 is the sole writer of `TASKS.md`'s claim columns now, so **there is no claim race to resolve** — first request Ring 0 actually locks wins, by construction, not by a git-push footrace.
4. **Start**: once locked (Ring 0 confirms — a reply, or just the pushed `TASKS.md` diff), Ring 1 begins work and submits when done via `ring0-traffic-control-law.md`'s handoff paths. No need to wait for a formal go-ahead beyond the lock itself.
5. **Already locked** (someone else got there first): Ring 0 says so instead of locking; Ring 1 picks a different row. Never two devs working the same row — that's what the lock is for.
6. **Ring 0 delayed answering**: claiming isn't urgent the way a finished merge is — Ring 1 may start exploratory/local work on their picked task while waiting, but should not consider it truly claimed (and should hold off submitting) until Ring 0 confirms the lock — a task looking free from the last thing Ring 1 read may already be mid-lock-request from someone else.

## Break-glass claim fallback (repo-admin devs only)

Mirrors `ring0-traffic-control-law.md`'s merge break-glass — same eligibility, same logging discipline, extended to claiming specifically. **Correction (2026-08-08)**: `nustanakritwithai`/`DemoGODRTX` are no longer `admin:true` (verified live) — today the only `admin:true` accounts are `HetCreep` and `katomnoistudio-oss` (HetCreep's own org/bot account, not an independent person), so this path currently has no eligible party. Kept below for if/when a second human is granted admin.

- If Ring 0 is genuinely unavailable **and** the requesting dev already holds `admin:true` on the GitHub repo (**verify current admins via `gh api repos/.../collaborators` every time — do not trust this file's or `MEMORY.md`'s last-recorded list, it has already gone stale once**), that dev may self-claim the old way instead of waiting on a lock: `git fetch origin` → edit their picked row directly (`Owner`/`Status: 🟡 claimed`/`Claimed`) → commit **that edit alone** (`docs(tasks): claim #NN <task name> [break-glass]`) → push.
- **Race, resolved after the fact, same as before Ring-0-locking existed**: push rejected (someone else claimed first) → re-fetch, pick a different row, never force-push to win. Two claim commits landing near-simultaneously → first merged to `origin/master` wins, the loser re-fetches — `pre-push-sync-law.md`'s standard concurrent-push resolution, unchanged from how claiming worked before this file's 2026-08-07 Ring-0-lock update.
- **Non-admin Ring-1 devs cannot use this path** — they wait for Ring 0 (step 6 above) or ask an admin-holding dev to relay the lock request. Break-glass exists for admins who already have the technical ability to self-claim regardless of what this file says, same reasoning `ring0-traffic-control-law.md` uses for its merge break-glass — a non-admin dev never had that ability to begin with, so there's nothing to fall back to.
- Logged, never silent: the `[break-glass]` tag in the commit message is mandatory, and Ring 0 reconciles it into `TASKS.md`'s normal record on return (no separate approval needed after the fact — this is a claim, not a merge; lower stakes, per `ring0-traffic-control-law.md`'s own "no rigid SLA" reasoning).

## % complete — objective bands, not vibes

Self-reported by the owning dev, but anchored to real gates so `50%` means the same thing across devs:

| %      | Meaning                                                                                                                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0%     | Not started / unclaimed                                                                                                                                                                            |
| 1–40%  | Implementation in progress, `npm run ci` not yet green                                                                                                                                             |
| 41–70% | `npm run ci` green, Done-criteria (`docs/agent-blueprint/NN-*.md`) satisfied — dogfood loop not yet run                                                                                            |
| 71–99% | Dogfood + fix loop in progress (scenario checklist and/or outdim break-pass, see `AGENT_BLUEPRINT.md`)                                                                                             |
| 100%   | **Graduated** — meets the Dogfood loop's own Graduation/dry signal (`AGENT_BLUEPRINT.md`, "Dogfood + fix loop" section). Not "code written," not "feels done" — the same bar already locked there. |

Update `%`/`Status` whenever it meaningfully changes, not just at claim and at 100% — a task frozen at `41%` for two weeks with no commits is a stale-claim signal (see below), and other devs need to see real progress to plan around it.

## Splitting one task for multiple devs

If a task is genuinely big enough for 2+ devs at once (e.g. a large system with independent sub-parts), split it into explicit sub-rows in `TASKS.md` **before** anyone starts (e.g. `11a — Boss phase state machine`, `11b — Boss telegraph feedback layer`), each independently claimable. This is `master-blueprint-law.md`'s existing "one topic = one PR" principle extended to "one sub-task = one row" — never an implicit "you take the top half, I'll take the bottom" with no record of it.

## Stale-claim handling

A claimed task (`%` frozen, no commits referencing it) for **7+ days** with no update → any dev tells Ring 0 to flag it (`Status` → `🔴 stalled — re-claim?`) — same request channel as claiming. **Before freeing it, Ring 0 asks the claiming dev directly** (found via a CoalBoard opinion-lane sweep, 2026-08-08 — the peer-report channel means a dev's slow week becomes visible to a teammate before it's explained to the person deciding its fate; asking first keeps the anti-abandonment check from reading as a surveillance report) — only then decides whether to free it for re-claim. Never silently reassign — a stalled row might mean blocked-on-something, not abandoned.

## What this doesn't mean

- Doesn't replace `AGENT_BLUEPRINT.md`'s Lab-entry order (which system to pick up next) — `TASKS.md` is the claim/ownership ledger; the Lab-entry order is still the recommended pick sequence for an unclaimed task.
- Doesn't relax `pre-push-sync-law.md` — Ring 0's own claim-lock pushes still fetch, verify before pushing, same as every other push it makes. Ring 1 no longer pushes claim commits themselves (step 3 above), so this obligation shifted onto Ring 0 along with write ownership of `TASKS.md`'s claim columns.
- Doesn't create a second "done" definition — 100% in `TASKS.md` IS the Dogfood loop's graduation signal, not a new bar.
