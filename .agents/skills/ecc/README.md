<!-- coalmine: verified 2026-08-07 · exemplar affaan-m/ECC skills/ · revalidate 90d -->

# ECC skill import — reference material, not binding rules

Vendored from [affaan-m/ECC](https://github.com/affaan-m/ECC) `skills/` (MIT, see [`.agents/rules/ecc/LICENSE`](../../rules/ecc/LICENSE) — same source repo, one license covers both trees).

**This is a separate tree from [`.agents/rules/ecc/`](../../rules/ecc/) on purpose.** ECC itself splits `rules/` (binding coding-style/security/testing conventions per language, imported there) from `skills/` (reference playbooks an agent consults when the situation calls for it — not something every file must comply with). Keeping them apart here mirrors that distinction instead of flattening it.

## Imported

- `postgres-patterns/SKILL.md` — index selection, data types, RLS patterns; relevant because `supabase/migrations/*.sql` is real schema in this repo.
- `database-migrations/SKILL.md` — migration safety checklist (forward-only, concurrent index creation, NOT NULL without a default, etc.); consult before writing a new `supabase/migrations/*.sql` file.
- `vite-patterns/SKILL.md` — config, plugins, HMR, env vars, dependency pre-bundling, build optimization; this repo's `vite.config.ts` (dynamic `resolveBasePath`, manual chunking) is exactly this territory.
- `react-testing/SKILL.md` — React Testing Library + Vitest/MSW patterns, the a11y-assertion + component-vs-e2e boundary; matches this repo's actual test stack (`*.test.tsx`, `vitest`).
- `security-review/SKILL.md` — checklist for auth/secrets/API-endpoint work; triggers on exactly what this repo does (Supabase auth, RLS, RPC functions, GitHub Actions secrets).
- `frontend-a11y/SKILL.md` — React/Next.js ARIA, focus management, keyboard nav; complements the existing `useModalA11y` hook and WCAG work already in this repo.
- `error-handling/SKILL.md` — typed errors, error boundaries, retries, user-facing messages (TS/Python/Go); this repo's `reportError`/`ErrorBoundary`/`GlobalErrorBanner` system is exactly this pattern already, useful as an external reference/checklist.
- `github-ops/SKILL.md` — issue triage, PR management, CI/release ops via the `gh` CLI/API; this session did a large amount of this by hand via raw `curl` against the GitHub API.

## Considered, not imported (stack mismatch)

- `react-performance` — Next.js-flavored (Vercel Engineering rules), overlaps what this repo already wrote itself for its own Vite/R3F perf work.
- `deployment-patterns` — Docker/container-oriented; this repo deploys a static build to GitHub Pages.
- `api-design` — REST API design; this repo doesn't hand-design a REST API, it uses Supabase's auto-generated REST/RPC surface.
- `motion-ui` — Next.js motion-library patterns; this repo animates via sprite frames + a custom `AudioEngine`, not a UI transition library.
- `e2e-testing` — Playwright-specific; this repo has no e2e suite currently (component/unit tests via Vitest only).
- `coding-standards`, broader `accessibility` — redundant with what's already vendored (`rules/ecc/common/coding-style.md`, `frontend-a11y` above).

## Not imported

The rest of ECC's `skills/` tree (brand/content/research/other-language skills) — not relevant to this project's stack.
