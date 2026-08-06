<!-- coalmine: verified 2026-08-06 · exemplar OWASP ASVS 5.0.0 / GitHub Community Standards / Keep a Changelog 2.0.0 / pmndrs/react-three-fiber · revalidate 90d -->
# Project Law: Gold-Standard Baseline (from the 2026-08-06 gold-standard AUDIT)

> **Target Workspace**: `LegendOfSoulTH` (LegendofSoulTH)
> **Operator / Human User Identity**: `HetCreep`
> **Scope**: Binding for ALL AI agents, subagents, and automated assistants operating on this codebase.

---

## Why this file exists

The 2026-08-06 gold-standard AUDIT scored this project ~67% against named exemplars
(OWASP ASVS 5.0.0, GitHub's own Community Standards checklist, Keep a Changelog 2.0.0,
pmndrs/react-three-fiber as a comparable-stack reference). This file codifies the
**MUST-HAVE** gaps found as binding standards for future work — it does NOT create the
missing artifacts itself (that's a separate, explicitly-gated CONFORM pass). Full
scorecard: see `MEMORY.md` Past Summary, gold-standard AUDIT entry, 2026-08-06.

## MUST-HAVE standards

Status as of 2026-08-06: 1–5 below are CLOSED (kept here as the binding standard so they
stay closed, not as an open checklist). 6 remains the one open gap.

1. **CSP** — CLOSED. `index.html` carries a `<meta http-equiv="Content-Security-Policy">`
   tag. GitHub Pages cannot set custom HTTP headers (no server access) — the meta-tag form
   was the only achievable delivery mechanism for this deploy target. Known limitation:
   `frame-ancestors`/`report-uri`/`sandbox` are NOT enforceable via meta tag per MDN —
   don't try to fake clickjacking protection this way; that would need a CDN in front.

2. **LICENSE** — CLOSED. MIT, HetCreep's explicit decision (see `MEMORY.md` item 43).
   **Any future re-licensing still needs a human decision, not an agent pick.**

3. **CHANGELOG.md** — CLOSED. Tracked per [Keep a Changelog
   2.0.0](https://keepachangelog.com/en/2.0.0/) conventions, paired with
   [SemVer 2.0.0](https://semver.org/) (already the versioning scheme in `package.json`).

4. **CONTRIBUTING.md / CODE_OF_CONDUCT.md** — CLOSED. Part of GitHub's own "Community
   Standards" checklist (repo Insights → Community Standards) alongside the
   LICENSE/SECURITY.md/templates this repo already has.

5. **Pre-commit hooks** — CLOSED. `husky` + `lint-staged` wired (`.husky/pre-commit` →
   `npx lint-staged` → `oxlint` on staged files), catching lint failures before commit,
   not just in CI.

6. **Component/integration test coverage** — OPEN, the one remaining gap. Current coverage
   is a single file (`src/lib/format.test.ts`, pure functions only) — zero coverage on the
   dozens of interactive React components. This is the single biggest real gap found in the
   audit; flag it when doing substantial work on any untested component, but don't
   unilaterally start a large test-writing sweep without asking — that's real effort/scope,
   gate it.

## What NOT to do with this file

- Don't auto-create these artifacts without going through the CONFORM choice-gate
  (checkpoint → one fix → verify → revert-if-red, per `gold-standard`'s own SKILL.md).
- Don't pick a LICENSE on HetCreep's behalf.
- Don't treat this as license to start an unscoped testing sweep — surface the gap,
  let the human decide the scope/timing.
