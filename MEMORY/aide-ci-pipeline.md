# Main's aide — CI/release-pipeline lane memory

Owns `.github/workflows/{ci,deploy}.yml`, `tools/check-bundle-size.mjs`,
`tools/check-blueprint-citations.mjs`, `supabase/functions/pvp-authority/deno.{json,lock}`.
Never touches root `MEMORY.md`, `SECURITY.md`, `TASKS.md`, `CHANGELOG.md`,
`package.json`, `src/game/data/gameInfo.ts`, `docs/AGENT_REGISTRY.md` — main folds
those from this lane's dispatch returns.

## Branch `ci/audit-wave1-pipeline` — status DONE, awaiting main's merge

Closes audit findings #78 (duplicate required-check name — the branch-protection
blocker), #76 (bundle-size tool self-contradicted, stale baseline, vendor
misclassification), #82 (version-bump push had no gate the deploy job itself
waits on).

**The required-check name after this lands is exactly `Continuous Integration`**
— unchanged from before this lane touched anything. The fix was never to rename
it; it was to make sure only one workflow ever publishes it. `ci-docs-gate.yml`
declared a second job under that same name and is deleted; `ci.yml`'s
`pull_request` trigger lost its `paths-ignore` so the one remaining owner of the
name always fires. Main can hand GitHub's branch-protection API `Continuous
Integration` as-is.

## Lessons this lane actually needed twice

- **Measure bundle sizes with the CI env vars set, always.**
  `src/lib/supabaseClient.ts` throws synchronously when
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are empty. Vite substitutes
  `import.meta.env` at build time, so an unset env doesn't just skip a feature —
  Rollup proves the throw unconditional and tree-shakes the entire
  `@supabase/supabase-js` SDK out of the bundle. Measuring without the
  placeholders gave a false 3.7 KB for that chunk instead of the real 52.0 KB,
  which is exactly how the QC-bounced baseline went wrong the first time. The
  command that matches CI is now written directly in
  `check-bundle-size.mjs`'s header comment — use it, don't freehand `npm run
build`.
- **Tier vendor chunks by deriving tokens from `package.json` dependencies, not
  by hardcoding a chunk's observed name.** `vite.config.ts`'s `manualChunks`
  only carves out `react`; every other library's chunk gets named after
  whichever app module first imports it (`@supabase/supabase-js` →
  `supabaseClient-*.js`). Hardcoding that one name fixes today's chunk and
  leaks the next auto-named one identically — the whole point of the QC bounce.
  `vendorTokensFromDependencies()` in the tool grows with `package.json`
  without another visit to this file.
- **A clean rebase is not proof the fix still holds — rerun the tool.** Confirmed
  post-merge on a fresh build: `supabaseClient-*.js` still tiers vendor, app
  max still 47.4 KB under a 70 KB ceiling.

## QC bounce 2 — `blueprint-citations` landed report-only, main's ruling

The gate proved the predicted risk empirically: `ci.yml`'s push trigger
`paths-ignore: '**/*.md'` means a docs-only fix to the 13 MISSING-FILE
citations would never re-trigger this workflow on master, so a red run from
the merge commit itself would sit as the newest run indefinitely. Main's
ruling: #78 (the branch-protection unblocker) must not wait on an unrelated
docs backlog. Fix landed as `continue-on-error: true` on the citation step —
the tool's own exit code is untouched (still 1 on MISSING-FILE/PAST-EOF; the
defect the tool reports was never the thing wrong here, the job blocking on
it pre-cleanup was). Flip it back to blocking: citation-hygiene lane, once
MISSING-FILE reaches 0, **followed by a push that touches a non-`.md` file**
so the workflow actually re-runs on master and the check reports fresh.

## Open, not this lane's to fix (gate-raised follow-ups, claimable later)

1. **The 70 KB app ratchet is per-chunk, never a total.** Largest app chunk
   (`App-*.js`) measures 47.5 KB gzip today, so 22.5 KB of silent growth on
   that one chunk passes unflagged — and because the budget is per-file,
   splitting one large chunk into two halves each measurement with zero real
   size reduction. All 11 app-tier chunks currently sum to ~93.5 KB gzip and
   nothing in `check-bundle-size.mjs` reports or budgets that total. Add a
   `total app gzip` line with its own ceiling.
2. **Vendor-token matching is bare substring, not boundary-aware — latent, not
   live.** `base.includes(token)` means the `react` token also matches
   `reaction`/`reactive`/`reactor` in a chunk's base name. This repo already
   has `06-hit-reaction-system` — a future chunk auto-named for e.g. a
   `reactionQueue.ts` module would silently get the 200 KB vendor ceiling
   instead of the 70 KB app one. Today's build classifies correctly; fix is a
   one-line boundary-aware compare (word-boundary regex or exact segment
   match against `-`/`.`-split tokens) before it bites for real.
3. **CSS dropped out of the bundle report.** The old `du -h` line covered
   `dist/assets/*.css`; `check-bundle-size.mjs` filters `f.endsWith('.js')`
   only. `App-*.css` measures 28.33 KB gzip — third-largest app-tier asset on
   the whole build — and is now completely unobserved by CI.
4. **`npm run audit` (the new deploy-path gate) has no `--omit=dev`.** A high
   CVE in a dev-only dependency (`vitest`, `sharp`, `jsdom` — none of which
   ship to players) blocks a production release exactly as hard as one in a
   shipped dependency, and because `npm audit` is a live registry call, a
   brand-new advisory can turn a previously-green release red with zero code
   change on this repo's side. Recording this as a known property of the
   gate rather than a defect — arguably the point of running audit at all —
   but the next person debugging "why did deploy just go red with no diff"
   should find this line first.

## Resolved from the previous round

- Proposed to main, not made here (file ownership): `vite.config.ts` could
  extract `@supabase/supabase-js` into its own `manualChunks` entry the way
  `react` already is — would let the bundle tool's vendor/app split stop
  depending on a heuristic entirely.
