<!-- coalmine: verified 2026-08-06 · exemplar this session's own incident (two machines pushed concurrently, MEMORY.md/vite.config.ts/ProfileModal.tsx all touched by both sides) · revalidate 90d -->
# Pre-Push Sync Law

> **Scope**: Binding for every agent, on every machine — Ring 0 and Ring 1 alike. Code correctness isn't a Ring-authority matter; this is baseline hygiene owed regardless of whose repo it is.

## Why this exists

This project has multiple people (and their agents) pushing to `master` concurrently. It already happened once: two machines each merged from `origin/master` and pushed within minutes of each other, both touching `MEMORY.md`, `vite.config.ts`, and `ProfileModal.tsx`. It worked out because the conflicts were resolved by hand and verified before pushing — this law makes that the mandatory procedure, not a one-off save.

## The procedure — every push, no exceptions

1. **`git fetch origin`** immediately before considering a push — never push against a stale mental model of where `origin/master` is.
2. **Check ahead/behind** (`git status -sb` or `git log origin/master..HEAD` / `git log HEAD..origin/master`).
   - Local is even with or ahead of `origin/master`, nothing new upstream → push directly.
   - `origin/master` has commits local doesn't → **do not force-push, do not push and let it fail** — merge first.
3. **Merge `origin/master` into local** (`git merge origin/master`, matching this repo's existing convention of merge commits over rebase — see prior history).
4. **If the merge conflicts**: resolve every conflict **by hand, preserving both sides' intent**.
   - Never resolve with a blind `--ours`/`--theirs` on a file with real content on both sides.
   - Never let a resolution silently delete the other machine's work — if both sides changed the same file, the merged result should contain *both* changes unless they're truly mutually exclusive (and if so, say why in the merge commit body).
   - For structured docs like `MEMORY.md` with numbered history sections, renumber/interleave rather than picking one side's numbering and dropping the other's entries.
5. **Full verify before pushing, every time — merge or not**: `npm run typecheck && npm run lint && npm run test && npm run build` (or `npm run ci`) must be green. A merge that "looks fine" but wasn't re-verified is not done.
6. **Only then push.** If verify fails after a merge, fix it first — don't push red.

## What "no conflicting code" means here

Not "never have a git conflict" — conflicts are normal with concurrent contributors. It means: **no unresolved or carelessly-resolved conflict ever reaches `origin/master`.** A conflict marker (`<<<<<<<`) in a pushed file, or a resolution that silently reverts someone else's committed work, is the failure this law exists to prevent.
