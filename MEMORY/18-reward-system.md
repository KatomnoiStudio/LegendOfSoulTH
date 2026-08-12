# MEMORY/18 — Reward System (system owner)

Contract: `docs/agent-blueprint/18-reward-system.md`. Own: pure reward calc
(`src/game/realtimeBattle/RewardSystem.ts`) + `src/game/reward/` (stage table, resolver, lobby
pipeline). Never: persistence/ledger internals (`accountRepository*`), gear/affix drops, PvP
rewards.

## Live state (2026-08-10)

- Reward calc is pure and deterministic — no `Math.random`, no `Date.now`. Contract line numbers
  drift a few lines behind the code (verified 2026-08-10, only mechanical drift, no false claim).
- The per-enemy-template reward branch is dead code: every trial-01..10 stage has a
  `STAGE_REWARD_DEFINITIONS` entry. Expected, flagged in the contract, not a bug.
- `finalizeLobbyBattleRewards` is an ordered partial commit, NOT one atomic RPC:
  progression → earnGold → grantItem per drop, each guarded by a client flag + a backend ledger
  refId keyed on the transaction id.
- Backend constraints the pipeline now runs against (`20260810160000`, APPLIED ON PRODUCTION):
  `upsert_pending_lobby_reward` has an EXECUTE lock, **20 calls / 60 s**, 200-char bounds on
  ids/names, 8 KB on the jsonb, and a 64-row-per-account cap. Argument validation runs BEFORE
  the rate-limit call. Budget RPC calls accordingly — this is why the pending write is deduped
  per battle instead of fired from both the battle-end and the continue paths.
- No `fetch` retry wrapper exists any more (lane B deleted it) and postgrest-js retries only
  `GET/HEAD/OPTIONS`. **Every RPC this pipeline calls fails on the first transient 5xx.** Do not
  re-add a retry. Design for one-shot RPCs plus the durable row.

## The transaction id (do not re-litigate)

Minted ONCE per battle in `toRealtimeBattleResult` (`BattleResultAdapter.ts`) as
`lobby:<stageId>:<uuid>`, carried on `RealtimeBattleResult.transactionId`.
`lobbyBattleTransactionId` NEVER mints — it runs on every finalize attempt, so a mint there
gives a fresh id per attempt and double-grants. The `stageId + finishedAt` derivation is now a
legacy fallback for hand-built results only; no production path reaches it.

Client-minted on purpose, not an oversight: the id must exist BEFORE the first network call
(the durable row is keyed by it and must land at battle end, offline included), it also keys
purely-local idempotency flags, and a server mint would itself need a client key to be
retry-stable. Authority over reward VALUES stays server-side; this is a correlation key, and the
server still enforces uniqueness via `(profile_id, transaction_id)` and the ledger refIds.

## Scars

- **F6 (2026-08-10, closed):** the durable pending row was written inside the pipeline, i.e.
  when the player presses "ต่อไป" on the result panel — AFTER the human-length wait it exists to
  protect. Fixed by `BattleScene.onBattleEnd` → `LobbyBattleSession.handleBattleEnd`, which
  writes the row the instant the runtime settles. `recordPendingOnce` hands the pipeline the same
  in-flight promise so it waits instead of racing (a late second write landing after the
  pipeline's clear would resurrect the row) and so one battle costs one RPC.
  A FAILED write is deliberately not cached — the pipeline must be free to retry. FAILED means
  BOTH a resolved `false` and a REJECTION; the reject handler nulls the cache AND rethrows, and
  those are two independent jobs with two independent tests behind them. Deleting the null kills
  the recovery assertion; swallowing the rethrow (`return false`) kills the visible-tier
  assertion. Do not "simplify" the handler to `return false`: the pipeline would report
  `progression_save`, and `handleComplete` returns on that silently because the branch assumes
  `updatePlayer` already showed `PLAYER_SAVE_FAIL` — on this path `onPlayerChange` was never
  called, so the player gets a dead "ต่อไป" button with no toast and no console line.
- **F7 (2026-08-10, closed):** clock-derived id, see above.
- **F8 (lane B, 2026-08-10):** `clearPendingLobbyReward` threw its error away and the
  `alreadyComplete` early return sat ABOVE the clear → a permanently uncleanable row re-ran the
  recovery pipeline on every lobby entry. The clear now happens before that early return; the
  dep returns `boolean`. Never reduce it back to `Promise<void>`.

## Known, deliberately not fixed (QC gate 2026-08-10, recorded not actioned)

- **The battle-end write failure is `'silent'`.** A player whose durable row never landed is
  never told their victory is not yet safe. Deliberate — they can still press "ต่อไป" and the
  pipeline retries — but whether that deserves a visible warning is an OWNER design lock, not a
  lane fix. Do not change the tier without one.
- **Latent seam this lane created.** The recovery effect (`LobbyBattleSession.tsx`, the
  `onGetPendingRewards` effect) can now observe the IN-PROGRESS battle's own pending row, because
  the row exists before `savedRef` is true — previously mutually exclusive by construction. Its
  deps include `onExit`, which `LobbyPage.tsx` recreates every render. Unreachable today (nothing
  re-renders LobbyPage while the result panel is up); it goes live the day anything adds an
  energy-regen tick, a mail-badge poll, or presence. Bounded, NOT a double grant —
  `earn_gold`/`grant_item` dedupe on `ref_id` at the DB.
- **Pre-existing, not this lane's:** `finalizeLobbyBattleRewards` calls `onRecordPending` per
  recovered row and the cache is per-txId, so an account sitting at the 64-row cap fires up to 64
  `upsert_pending_lobby_reward` calls on ONE lobby entry against a 20-per-60s rate limit.
- **Retry removal (lane B) changed this pipeline's failure modes** — worth a `resilience-audit`
  WHEN SOMETHING ACTUALLY FAILS, not pre-emptively. Owner ruling 2026-08-10: auditing ground a
  lane just changed is the start of the audit loop that ends in guarding conditions nobody has
  shown can occur. Claimable if a real failure shows up.

## Open, not mine to close alone

- `finalizeLobbyBattleRewards` applies ONE merged `earnedExp` to both the account and the lead
  hero (`applyBattleExp`). Whether stage-table `heroExp` should route only to the hero is an
  owner design call — raised, unanswered.
- Registry row 18 flags a contract conflict with system 14 over `RewardSystem.ts` EXP application
  (`applyAccountExp` is 14's territory by its own note). Unresolved.
