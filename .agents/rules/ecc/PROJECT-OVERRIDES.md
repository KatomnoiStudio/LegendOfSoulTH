<!-- coalmine: verified 2026-08-16 · exemplar package.json + vite.config.ts + supabase/functions/ (this repo, ground truth) · re-proved by: npm run ci · revalidate 30d -->

# Project overrides — where imported ECC rules don't match this repo

The `common/`, `typescript/`, `react/`, `web/` files under `.agents/rules/ecc/` were copied verbatim from [affaan-m/ECC](https://github.com/affaan-m/ECC) (see [README.md](README.md), [LICENSE](LICENSE)). Several of their examples assume a toolchain this repo doesn't have. This file is the single source of truth when they conflict — per [README.md](README.md) precedence rule 3.

Found by CoalMine gold-standard AUDIT, 2026-08-05.

## Package manager: npm, not pnpm

Every `pnpm ...` command in `web/hooks.md`, `common/hooks.md` (if present), etc. should read `npm exec ...` / `npm run ...` for this repo. Evidence: `package-lock.json` present, no `pnpm-lock.yaml`, `ci.yml`/`deploy.yml` both use `npm ci`.

## Linter: oxlint — no ESLint or Stylelint. Prettier IS installed (corrected 2026-08-16)

`web/hooks.md`'s lint/format/CSS-lint hook examples (`pnpm eslint`, `pnpm prettier`, `pnpm stylelint`) reference packages **not in `package.json`** — except Prettier, which is. This repo's actual entrypoints:

```bash
npm run lint          # oxlint --deny-warnings, config: .oxlintrc.json
npm run typecheck     # tsc -b && deno check (edge functions)
npm run format        # prettier --write .
npm run format:check  # prettier --check .   (NOT in `npm run ci`)
```

Do not wire a hook to `eslint`/`stylelint` — they are genuinely absent. **Prettier is a real devDependency (`prettier ^3.9.6`) and already runs on every commit** via `husky` + `lint-staged`, which formats `*.{ts,tsx,json,css,md}` before the commit lands.

> **⚠️ Corrected 2026-08-16.** This section previously read "no ESLint, Prettier, or Stylelint installed" and told agents to add Prettier as a real dependency before assuming it existed. It has been a real dependency and an active pre-commit step the whole time. This file wins precedence on toolchain conflicts, so the false claim was being obeyed — an agent following it would decline to run a formatter that runs anyway. Found by the 2026-08-16 gold-standard audit; four of five scouts caught this file independently.
>
> **`format:check` is deliberately not in `npm run ci`** — the tree is not prettier-clean and, without a `.gitattributes`, the check reports hundreds of CRLF-only false failures on Windows. Landing `.gitattributes` first is audit item B3.

## Env vars: `import.meta.env`, not `process.env`

This is a Vite SPA, not Next.js/Node. `typescript/security.md`'s secret-management example uses `process.env.API_KEY` — that's `undefined` in this codebase. The correct pattern (already stated correctly in `react/security.md`'s env-var table) is:

```typescript
// Vite: only VITE_*-prefixed vars reach the client bundle, and only via import.meta.env
const apiKey = import.meta.env.VITE_API_KEY
if (!apiKey) throw new Error('VITE_API_KEY not configured')
```

Anything without the `VITE_` prefix in `.env` stays server/build-time only and is `undefined` at runtime — there is no server for this static-Pages deploy, so treat any _client-needed_ secret as inherently public. Prefer not shipping secrets to this app at all.

## Subagents referenced in `common/agents.md` mostly don't exist here

`common/agents.md` lists `planner`, `architect`, `tdd-guide`, `code-reviewer`, `security-reviewer`, `build-error-resolver`, `e2e-runner`, `refactor-cleaner`, `doc-updater`, `rust-reviewer`, `harmonyos-app-resolver` as available under `~/.claude/agents/`. As of this audit, only `memory-keeper` exists as an actual configured subagent in this environment. Treat every other name in that file (and the `security-reviewer`/`react-reviewer`/`tdd-guide`/`e2e-runner`/`build-error-resolver` mentions scattered through `security.md`/`testing.md` files) as **aspirational, not actionable** — check what's actually available (the harness surfaces a live agent-type list each session) before invoking one by name.

## Testing stack: measured and gated. No E2E framework (corrected 2026-08-16)

`vitest` + `jsdom` are real devDependencies. **Coverage is measured and enforced**: `@vitest/coverage-v8` is installed, `vite.config.ts`'s `test.coverage` block sets `provider: 'v8'` **and `thresholds`**, and `npm run ci` runs `test:coverage`, so a coverage regression fails the build. Measured 2026-08-16: **1,185 tests across 135 files**, statements 71.6 · branches 60.2 · functions 72.8 · lines 74.4, with **34 component test files against 66 components**.

`common/testing.md`'s 80% bar is still above the measured floor, so treat 80% as target state — but the floor itself is now a real number in the config, not an unchecked sentence.

`typescript/testing.md`/`web/testing.md`'s Playwright prescription remains **not installed** — no E2E framework exists in this repo, and adopting one is a framework decision for HetCreep, not a CONFORM fix.

> **⚠️ Corrected 2026-08-16.** This section read "only `src/lib/format.test.ts` exists — zero component/hook/integration tests" and "no coverage-measuring tool configured". Both were false by a wide margin and this file wins precedence, so an agent checking whether the repo had tests was being told no.

## `common/performance.md` is about LLM agent cost, not app runtime performance

Despite the filename, that file's content (model tier selection, context window budgeting) is agent-orchestration guidance, not web/game performance guidance. For actual app performance (React Three Fiber, bundle size, sprite assets) see `react/performance.md` and `web/performance.md` — the latter is itself DOM/CSS-page-shaped (Core Web Vitals, image `loading` attrs) and only partially applies to a full-canvas WebGL game; `react/performance.md` covers the R3F-specific surface it doesn't. (This repo has no Phaser dependency — characters render via 2D sprite sheets through React Three Fiber, not a separate Phaser scene loop.)

## Validation/logging libraries prescribed, not installed

`typescript/coding-style.md` prescribes Zod for schema validation and "proper logging libraries instead of console" — neither is a dependency here. This repo's actual pattern: no runtime schema validation library, and `web/observability.md`'s own explicit rule for this repo is `console.error` before every swallowed catch, not a logging library. Follow `web/observability.md` over `typescript/coding-style.md` on logging where they conflict, per this file's own precedence rule.

> **⚠️ Corrected 2026-08-16.** This section used to justify the absence of schema validation with "there's no server accepting untrusted payloads to validate". **There is one**: `supabase/functions/pvp-authority/index.ts` is a Deno edge function that parses a request body, and `supabase/migrations/` carries 50 `SECURITY DEFINER` RPCs reachable from a client session. The absence of a validation library is a real choice — hand-written guards plus Postgres constraints do the work — but the reason recorded here was not true, and a reason that is not true stops being a reason the next time someone leans on it.

## Browser-support baseline: see `web/compatibility.md`, not this file

The compatibility/WebGPU-fallback baseline lives in `.agents/rules/ecc/web/compatibility.md` — this file (`PROJECT-OVERRIDES.md`) covers toolchain/package-manager/env-var overrides only, not runtime browser-support policy.
