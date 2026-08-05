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

## MUST-HAVE standards (target state — not yet all true, see CONFORM gate)

1. **CSP**: `index.html` must carry a `<meta http-equiv="Content-Security-Policy">` tag.
   GitHub Pages cannot set custom HTTP headers (no server access) — the meta-tag form is
   the only achievable delivery mechanism for this deploy target. Known limitation:
   `frame-ancestors`/`report-uri`/`sandbox` are NOT enforceable via meta tag per MDN —
   don't try to fake clickjacking protection this way; that would need a CDN in front.

2. **LICENSE**: the repo must have a `LICENSE` file. **This needs a human decision, not
   an agent pick** — do not auto-select a license. Flag to HetCreep if still missing.

3. **CHANGELOG.md**: releases should be tracked per [Keep a Changelog
   2.0.0](https://keepachangelog.com/en/2.0.0/) conventions, paired with
   [SemVer 2.0.0](https://semver.org/) (already the versioning scheme in `package.json`).

4. **CONTRIBUTING.md / CODE_OF_CONDUCT.md**: lower urgency for a solo-maintained repo,
   but still part of GitHub's own "Community Standards" checklist (repo Insights →
   Community Standards) alongside the LICENSE/SECURITY.md/templates this repo already has.

5. **Pre-commit hooks**: no `husky`/`lint-staged` equivalent exists yet. Catching
   lint/typecheck failures before commit (not just in CI) is the standard practice for a
   TypeScript-strict project at this maturity level.

6. **Component/integration test coverage**: current coverage is a single file
   (`src/lib/format.test.ts`, pure functions only) — zero coverage on the dozens of
   interactive React components. This is the single biggest real gap found in the audit;
   flag it when doing substantial work on any untested component, but don't unilaterally
   start a large test-writing sweep without asking — that's real effort/scope, gate it.

## What NOT to do with this file

- Don't auto-create these artifacts without going through the CONFORM choice-gate
  (checkpoint → one fix → verify → revert-if-red, per `gold-standard`'s own SKILL.md).
- Don't pick a LICENSE on HetCreep's behalf.
- Don't treat this as license to start an unscoped testing sweep — surface the gap,
  let the human decide the scope/timing.
