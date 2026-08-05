<!-- coalmine: verified 2026-08-05 · exemplar package.json (this repo, ground truth) · revalidate 30d -->
# Project overrides — where imported ECC rules don't match this repo

The `common/`, `typescript/`, `react/`, `web/` files under `.agents/rules/ecc/` were copied verbatim from [affaan-m/ECC](https://github.com/affaan-m/ECC) (see [README.md](README.md), [LICENSE](LICENSE)). Several of their examples assume a toolchain this repo doesn't have. This file is the single source of truth when they conflict — per [README.md](README.md) precedence rule 3.

Found by CoalMine gold-standard AUDIT, 2026-08-05.

## Package manager: npm, not pnpm

Every `pnpm ...` command in `web/hooks.md`, `common/hooks.md` (if present), etc. should read `npm exec ...` / `npm run ...` for this repo. Evidence: `package-lock.json` present, no `pnpm-lock.yaml`, `ci.yml`/`deploy.yml` both use `npm ci`.

## Linter: oxlint only — no ESLint, Prettier, or Stylelint installed

`web/hooks.md`'s lint/format/CSS-lint hook examples (`pnpm eslint`, `pnpm prettier`, `pnpm stylelint`) reference packages **not in `package.json`**. This repo's actual lint entrypoint is:

```bash
npm run lint       # oxlint, config: .oxlintrc.json
npm run typecheck  # tsc -b
```

Do not wire a PostToolUse hook to `eslint`/`prettier`/`stylelint` here — they'd fail (package not found). If format-on-save is wanted, evaluate `oxc`'s own formatter or add Prettier as a real dependency first; don't assume it exists because an example does.

## Env vars: `import.meta.env`, not `process.env`

This is a Vite SPA, not Next.js/Node. `typescript/security.md`'s secret-management example uses `process.env.API_KEY` — that's `undefined` in this codebase. The correct pattern (already stated correctly in `react/security.md`'s env-var table) is:

```typescript
// Vite: only VITE_*-prefixed vars reach the client bundle, and only via import.meta.env
const apiKey = import.meta.env.VITE_API_KEY;
if (!apiKey) throw new Error('VITE_API_KEY not configured');
```

Anything without the `VITE_` prefix in `.env` stays server/build-time only and is `undefined` at runtime — there is no server for this static-Pages deploy, so treat any *client-needed* secret as inherently public. Prefer not shipping secrets to this app at all.

## Subagents referenced in `common/agents.md` mostly don't exist here

`common/agents.md` lists `planner`, `architect`, `tdd-guide`, `code-reviewer`, `security-reviewer`, `build-error-resolver`, `e2e-runner`, `refactor-cleaner`, `doc-updater`, `rust-reviewer`, `harmonyos-app-resolver` as available under `~/.claude/agents/`. As of this audit, only `memory-keeper` exists as an actual configured subagent in this environment. Treat every other name in that file (and the `security-reviewer`/`react-reviewer`/`tdd-guide`/`e2e-runner`/`build-error-resolver` mentions scattered through `security.md`/`testing.md` files) as **aspirational, not actionable** — check what's actually available (the harness surfaces a live agent-type list each session) before invoking one by name.

## Testing stack: prescribed, not installed

`common/testing.md` mandates 80% coverage + TDD; `typescript/testing.md` and `web/testing.md` prescribe Playwright; `react/testing.md` (if present) assumes Vitest/RTL. **None of these are in `package.json`** — this repo has zero test framework and zero test files today. Treat the testing rule files as the target state, not current practice, until a framework is actually installed (tracked as a gap in the 2026-08-05 gold-standard audit, not auto-fixed by that audit — installing a test framework is a CONFORM-track code change requiring separate approval).

## `common/performance.md` is about LLM agent cost, not app runtime performance

Despite the filename, that file's content (model tier selection, context window budgeting) is agent-orchestration guidance, not web/game performance guidance. For actual app performance (React Three Fiber, Phaser, bundle size, GLB assets) see `react/performance.md` and `web/performance.md` — the latter is itself DOM/CSS-page-shaped (Core Web Vitals, image `loading` attrs) and only partially applies to a full-canvas WebGL game; `react/performance.md` covers the R3F/Phaser-specific surface it doesn't.
