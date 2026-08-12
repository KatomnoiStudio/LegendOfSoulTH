# Main's aide — CI/release-pipeline lane memory

Owns `.github/workflows/{ci,deploy}.yml`, `tools/check-bundle-size.mjs`,
`tools/check-blueprint-citations.mjs`, `supabase/functions/pvp-authority/deno.{json,lock}`.
Never touches root `MEMORY.md`, `SECURITY.md`, `TASKS.md`, `CHANGELOG.md`,
`package.json`, `src/game/data/gameInfo.ts`, the local seat roster — main folds
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

## QC bounce 3 — the substring hole went live at merge time, not just latent

Main merged this branch onto master locally and the bundle step went red.
Root cause was NOT this branch — main confirmed by building master alone and
getting byte-identical chunk hashes/sizes. Two things had shifted on master
since this lane's baseline, both surfaced only by an actual build of the
merged tree:

- `three.core` and `WebGL` chunks consolidated into one `WebGL-*.js` (Rollup's
  own chunking decision, not a content-size change) at 235.8 KB gzip —
  above the 200 KB vendor ceiling this lane had set from its own branch's
  build, where the two chunks were still separate.
- Follow-up #2 below stopped being latent: on master's build the Supabase SDK
  chunk is auto-named `accountRepository.supabase-*.js` (not
  `supabaseClient-*.js`, which no longer exists as a chunk at all), and
  `base.includes('supabase')` matched it as vendor — 57.5 KB of app code
  wrongly given the loose ceiling. Exactly the failure mode #2 predicted, on
  a build that actually exists now.

Fixed both in the same pass, `check-bundle-size.mjs` only:

- `isVendorChunk` now requires the token at the **head** of the chunk's base
  name — `base === token || (base.startsWith(token) && the next char is not
[a-z0-9])`. `three.webgpu` still matches (`three` + `.`); `vendor-react` is
  caught earlier by the static prefix pattern regardless.
  `accountRepository.supabase` does NOT match (`supabase` is not a prefix of
  it) — correctly tiers app. `reactionqueue` does NOT match `react` either
  (`i` follows immediately, not a separator) — follow-up #2 closes as a
  side effect of the same fix, not a separate patch.
- Vendor ceiling re-baselined from a build of this branch merged onto master
  @ `51728f2`: measured max 235.8 KB (`WebGL-*.js`) → ceiling 300 KB (27.3%
  margin over measured, same convention as the app ceiling). App ceiling
  left at 70 KB — both app-tier chunks (`App-*.js` 60.3 KB now that
  `accountRepository.supabase` correctly moved OUT of app tier makes room;
  measured together they'd have summed past it) fit comfortably.
- Acceptance test: `npm run ci` (typecheck, lint, test, test:edge, build,
  bundle) run through `tools/test-lock.sh` on this branch merged onto
  `51728f2` — exits 0, all 11 chunks pass.

## QC bounce 4 — the fix's own numbers were sourced from the wrong tool

Everything above (bounce 3) was behaviourally correct — gate confirmed
`accountRepository.supabase-*.js` classifies `[app]`, the ceilings hold, the
acceptance test passes. But the header comment's own numbers (`235.8 KB`,
`27.3%`, `62.0 KB`, `12.9%`, and the `accountRepository.supabase ... นับเป็น
vendor แล้ว` line) were carried over from vite's build-log output, not from
`check-bundle-size.mjs`'s own printed numbers on that same build — and the
"vendor" claim was left over from the _previous_ revision's text with only
the name and figure swapped, describing the exact classification this round
just fixed away. Finding #76 is literally "the tool contradicts itself";
shipping the fix with a header that still says `accountRepository.supabase`
is vendor reintroduces that inside its own remedy.

Corrected using ONLY `node tools/check-bundle-size.mjs`'s own printed output
as the source (documented as the rule in the header now, so the next
re-baseline doesn't reach for vite's log again): vendor max **228.4 KB**
(`WebGL-*.js`, 31.3% margin against the 300 KB ceiling), app max **60.3 KB**
(`App-*.js`, 16.1% margin against 70 KB), `accountRepository.supabase-*.js`
**57.6 KB, tiered `[app]`**. A third stale figure survived in the same
paragraph — the env-unset fallback size was still `3.7 KB` / `52.0 KB`,
both from the old `supabaseClient-*.js` chunk that no longer exists under
that name; empirically re-measured with the tool on a build without the CI
placeholder env vars: `accountRepository.supabase-*.js` shrinks to **5.9 KB**
(from 57.6 KB with the env set) rather than being tree-shaken away entirely.

Item 1 below is corrected to the same 16.1% figure — it had inherited the
same vite-log 12.9% number.

## Open, not this lane's to fix (gate-raised follow-ups, claimable later)

1. **The 70 KB app ratchet is per-chunk, never a total.** Largest app chunk
   (`App-*.js`) now measures 60.3 KB gzip (was 47.5 KB two rounds ago — real
   growth from the merged lanes' error-handling/auth work, not drift), so
   headroom against the 70 KB ceiling is down to 16.1%, tighter than when
   this was first flagged. Because the budget is per-file, splitting one
   large chunk into two halves each measurement with zero real size
   reduction. All 8 app-tier chunks currently sum to ~147.1 KB gzip and
   nothing in `check-bundle-size.mjs` reports or budgets that total. Add a
   `total app gzip` line with its own ceiling — worth doing sooner now that
   the per-chunk margin has visibly narrowed twice in one day.
2. ~~Vendor-token matching bare substring~~ — **FIXED above, this round**
   (QC bounce 3). Was recorded as latent; went live before the fix landed.
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
