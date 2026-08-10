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

## Open, not this lane's to fix

- `docs/agent-blueprint/**` citation lane (13 MISSING-FILE) is a separate lane;
  the `blueprint-citations` CI job this lane wired will stay red until that
  lane lands. Recommended main sequence that job's landing behind the citation
  fix rather than merging it pre-red (see this lane's prior RETURN for the
  `paths-ignore` interaction that makes it worse than it looks).
- Proposed to main, not made here (file ownership): `vite.config.ts` could
  extract `@supabase/supabase-js` into its own `manualChunks` entry the way
  `react` already is — would let the bundle tool's vendor/app split stop
  depending on a heuristic entirely.
