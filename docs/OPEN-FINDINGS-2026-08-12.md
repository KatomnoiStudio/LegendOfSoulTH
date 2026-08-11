# Open findings — 2026-08-12

> **Operator**: HetCreep · **Agent**: Claude Code (belt-end main) · **Date**: 2026-08-12
>
> These findings were produced during the 2026-08-12 session and existed **only in that
> session's local task list** until this file was written. A session list is not a repo
> record: it is invisible to every other dev, to every future agent, and to the owner the
> next morning. `AGENTS.md` rule 16 makes `TASKS.md` the single source of truth for
> claimable work, and none of this reached it. This file closes that gap.

## Read this before trusting the coverage

**This is a floor, not a measurement.** Two limits, both self-inflicted, both stated here
because a reader would otherwise take the list as the result of a sweep:

1. **The scan was pre-filtered.** Each canary prompt carried a hand-authored list of
   already-filed findings with an instruction not to re-report them. That narrowing has no
   sanctioned form in the skill — `rot-canary`'s only permitted narrowing is the Freshness
   cap, which lowers the _tier_, never removes targets. A filed defect does not retire its
   location: a different pattern lives in the same lines, and the fix itself is new code
   nobody has scanned.
2. **One round.** One pass per dimension measures that pass, not the codebase. The
   convergence test is 3–5 rounds with no new pattern in the last one. That was never run,
   so nothing here supports a claim about how much is left.

**Nothing below is fixed.** Every row is a defect that is still live.

## HIGH — production-affecting, still open

### 1. Every Google-OAuth and guest account gets a malformed public UID

`supabase/migrations/20260810100000_*.sql:126` —
`coalesce(new.raw_user_meta_data->>'uid', substr(new.id::text, 1, 10))`.

Only `register()` supplies that metadata (`accountRepository.supabase.ts:226`,
`options:{data:{uid}}`). `signInAsGuest` (:370) and `signInWithGoogle` (:415-418) pass
none, so both fall through to the substring branch.

`substr(uuid,1,10)` is always 8 hex + `-` + 1 hex. That fails `isValidUid`'s
`^[1-9][0-9]{9}$` (`uid.ts:98`), and `AddFriendPanel.tsx:91` strips non-digits from the
search box — so the UID **cannot even be typed in**. `ProfileModal.tsx:227` renders it
through `formatUid` as e.g. `3f1a 9c2 e-4`.

`profiles.uid` is `unique not null` (`0001_init.sql:13`) and no write path ever updates it.
Every guest and every Google user is permanently unfriendable with no in-app recovery.

**Fix**: pass `options.data.uid` on `signInAnonymously`/`signInWithOAuth`, or generate a
conforming 10-digit uid inside `handle_new_user` instead of the UUID substring. Existing
rows need a backfill either way — count the affected live accounts before choosing.

### 2. A stalled battle-texture load traps the player with no timeout and no way back

`useRealtimeBattle.ts:124` awaits `preloadBattleTextures(criticalUrls)`;
`battleAssets.ts:37` uses three's `ImageLoader.loadAsync`, which has **no timeout** and is
not covered by `createDeadlineFetch` — that wrapper is installed only on the Supabase
client (`supabaseClient.ts:90`).

While the promise is pending, `phase` stays `'loading'` and `BattleScene.tsx:87-95` renders
"กำลังเตรียมห้องต่อสู้…" **with no exit button** — unlike the `'error'` branch at :74-85,
which has one. Only a tab reload escapes.

**Fix**: race the preload against `AbortSignal.timeout` / `Promise.race` and fall through
to the existing error branch. Or add the กลับล็อบบี้ button to the loading branch — one
line, and it removes the dead end even if the timeout is never added.

### 3. Three tools overwrite their target in place

Same anti-pattern, three sites, worst first.

- **HIGH — `tools/remove-stray-alpha-artifacts.mjs:94`**: `sharp(...).png().toFile(file)`
  where `file` is the **input** path under `assets/raw/characters/walk|turnaround`
  (:17-20, :102-103). `assets/raw/` is the source of truth the derived `public/*.webp` is
  generated from (`tools/optimize-images.mjs:1-13`) — a crash mid-write destroys an
  unreproducible file.
- **MEDIUM — `tools/optimize-images.mjs:78`**: the skip condition is mtime-only
  (`destStat.mtimeMs >= srcStat.mtimeMs`) and :92 writes straight to `dest`. A run killed
  during `toFile` leaves a fresh-mtime, partially written `.webp` that every later run skips
  forever. `--force` is the only recovery and nothing signals it is needed.
- **LOW — `tools/build-models.mjs:65`**: every model file is written (:64-66) **before** any
  is validated (:73-145), so a failing build replaces the previous good `.glb` set with the
  bad one and only then sets `exitCode = 1` (:148-150). `await main()` at :156 has no catch.
  Ships nothing today, but runs on every CI leg (`ci.yml:81-82`).

**One fix shape for all three**: temp path → validate → rename.

## Open, lower severity

| #   | Area   | Finding                                                                                                                                                                                                                                                                             |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | DIST   | Sprite frames ship `max-age=600` with 0 of 359 filenames hashed — a return visit pays ~80 conditional round-trips per character. `max-age` is not settable on GitHub Pages; the fix is hashed names via the bundler, then a long immutable `max-age`. Two coupled changes, not one. |
| 5   | UX     | `CharacterPreview.module.css:89-93` pins `aspect-ratio: 396/376` (a union rect across **three** characters) and is fed 640×512 art for `spear-warrior` — he shrinks **31.9%** mid-drag. `L1` is OPEN, not closed by `aaf57b1`.                                                      |
| 6   | MAINT  | Sprite sizing residuals — actor-box geometry duplicated across `.tsx` and `.module.css` with nothing asserting they agree, plus two dead-or-cancelled foot knobs sitting beside the live one.                                                                                       |
| 7   | GOV    | `tools/verify-memory-archive.mjs:99` splits items on `/^(\d+)\. /`, but the archive drifted to `## 196.` headings — 18 failures today, and a prose ordered list inside a body false-matches as an item. Diagnosed, not fixed.                                                       |
| 8   | GOV    | The memory store runs two slug conventions (20 bare vs 6 type-prefixed), which is why `[[links]]` kept missing. Repointed, root cause open.                                                                                                                                         |
| 9   | MAINT  | 12 orphaned `.claude/worktrees` dirs the cwd-cleanup rule is not sweeping in practice.                                                                                                                                                                                              |
| 10  | MAINT  | `getSupabase()` is lazy now; 3 leftover workaround/doc sites still describe the old module-scope client.                                                                                                                                                                            |
| 11  | SUPPLY | The live console's only app-produced warning is `THREE.Clock` deprecated — it comes from `@react-three/fiber` 9.7.0, not this repo. Report-only; take it on a normal dependency bump, and do **not** silence it.                                                                    |

## What this run does not tell you

- How many findings a second round would produce. No second round was run.
- Whether the pre-filtered locations are clean. They were excluded, not cleared.
- Anything about dimensions whose canaries were cancelled before running.
