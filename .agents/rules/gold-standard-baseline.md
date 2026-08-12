<!-- coalmine: verified 2026-08-07 · exemplar OpenSSF Scorecard (18 checks) / OWASP ASVS 5.0.0 / excalidraw / Keep a Changelog 2.0.0 / pmndrs/react-three-fiber · revalidate 90d -->

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

6. **Component/integration test coverage** — PARTIALLY CLOSED, narrowed scope. As of
   2026-08-09 there are **106 test files** under `src/` (up from the 2026-08-07 audit's 28),
   including **23 `*.test.tsx` files** using `@testing-library/react` across 20 of the
   repo's 35 top-level components (`AddFriendModal`, `AuthModal`, `BattleScene`,
   `CharacterRoster`, `CurrencyShopModal`, `DungeonSession`, `ErrorBoundary`, `GachaModal`,
   `GlobalErrorBanner`, `ItemsModal`, `LobbyBattleSession`, `MainNavigation`, `NameModal`,
   `ProfileModal`, `PvPRoom`, `SettingsModal`, `StageSelect`, `TopBar`, `UpdateBanner`,
   `WorldChat`) — up from 4 of ~58. 15 components still have no rendering-level test. The
   2026-08-07 coverage percentages (32.17% statements / 29.57% branches / 24.78% functions /
   32.77% lines) are stale given the file-count growth above — re-run `npm run test:coverage`
   before citing a coverage number again. No threshold enforced yet, same reasoning as
   before: a threshold that passes today would still guard almost nothing.

   Property-based/fuzz testing: **7** `*.fuzz.test.ts` files now (up from the 4 recorded
   2026-08-07) — an EXCELLENCE-tier item the 2026-08-06 pass didn't even list, closed anyway.

   Remains **OPEN as a sweep**: covering the remaining components on spec is still a weighed
   decision, not a proven-good default — state cost/benefit and recommend, per the rule.

---

<!-- coalmine: verified 2026-08-07 · exemplar OpenSSF Scorecard (18 checks) / Excalidraw / vitejs/vite / pmndrs/react-three-fiber / Keep a Changelog 2.0.0 / OWASP Password Storage Cheat Sheet / Signal Desktop (privacy-first error surfacing) · revalidate 90d -->

## 2026-08-07 FINAL AUDIT — closing task #14 ("เติมให้ 100%")

RE-VALIDATE pass on items 1–6 above: all still valid, no rewrites/tombstones needed —
item 6 narrowed per its own update above. This section is the FULL re-run, 6 parallel
scouts (one per dimension pair), each picking fresh exemplars and scoring the ACTUAL
current repo state (not memory). Full per-criterion tables live in this session's
transcript; this is the synthesis.

### Scorecard (11 dimensions, simple average — no dimension weighted above another)

| Dimension                      | Score | Note                                                                                 |
| ------------------------------ | ----- | ------------------------------------------------------------------------------------ |
| Security                       | 91%   | 1 MUST gap (Code-Owner review not enforced), 2 EXCELLENCE gaps                       |
| Distribution/Integrity         | 89%   | SBOM+SLSA attestation, signed commits, OIDC deploy — strong                          |
| Observability + Error Handling | 97%   | Central relay, tiered codes, tested; no-telemetry stance correctly scored N-A not ❌ |
| Compatibility                  | 84%   | WebGL2/WebGPU feature-detect+fallback solid; mobile touch parity still open          |
| Governance/Licensing           | 88%   | MIT+SECURITY.md+CoC+CODEOWNERS all present; CODEOWNERS still advisory-only           |
| Docs/Onboarding                | 86%   | README/CONTRIBUTING strong; Thai-only, no English onboarding path                    |
| Maintainability                | 88%   | Rule-freshness protocol, dead-code hygiene, commit discipline all exemplary          |
| UX/DX                          | 85%   | Formatter+linter+strict-TS loop solid; no commitlint, no pre-push hook               |
| Correctness                    | 83%   | Battle-system unit coverage strong; some known-open items still tracked not fixed    |
| Testing/CI                     | 69%   | Fuzz+CI-matrix closed EXCELLENCE gaps; component coverage still the weak point       |
| Performance                    | 62%   | Chunking+image-resize closed; no enforced bundle budget, `<img>` missing dims        |

**Overall: ~84%** (up from the 2026-08-06 baseline's ~58%, 76.5/132 — the gap closed this
session: deploy-gate rebuild, central error relay, admins.ts/currency-ledger decisions,
exploration-mode closure, component tests, fuzz tests, formatter, CI Node matrix,
`requestExit`/cross-tab-write resilience fixes, release-process docs).

**One scout finding corrected before recording**: the Performance scout reported "no
service worker / precache, and no documented rationale found" as a gap, having grepped
only `.agents/rules/**`. The rationale exists — `MEMORY.md`'s Current Status section and
commit `64a67fd`'s message both record the decision (a naive SW cache risks serving a
stale build past the version-bump deploy gate this project just built specifically to
stop that). Correct classification: **N-A, justified**, not a gap. Recorded here so it
doesn't quietly re-enter as a "gap" in a future pass that only reads this file.

### Consolidated gap register (top items, MUST-tier first; full per-scout lists in the transcript)

**MUST-tier:**

1. Component test coverage — 4/58 `.tsx` files (tracked above as the narrowed item 6).
2. `<img>` tags across the codebase missing `width`/`height`/`loading="lazy"` — CLS risk.
3. No enforced bundle-size budget in CI (`ci.yml` prints size, never fails on regression).
4. Branch protection: Code-Owner review not required, `enforce_admins: false` — **HetCreep's
   call, not an agent's** (see MEMORY.md's Branch protection entry — this is a known,
   accepted trade-off for a repo where the owner is the primary author, not an oversight).

**EXCELLENCE-tier (lower priority, listed not auto-actioned):** 5. `format:check` not wired into `npm run ci` — deliberate (existing tree isn't
prettier-clean yet), needs a one-time repo-wide reformat pass before it can gate. 6. No pre-push git hook automating `pre-push-sync-law.md`'s fetch/merge/verify sequence. 7. `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` TS flags not set. 8. No commitlint — commit-message discipline is real but currently manual/agent-enforced. 9. No E2E/visual-regression tooling (Playwright etc.) — WebGL2/WebGPU fallback logic is
compat-critical and currently only unit-tested, not exercised end-to-end. 10. No mutation testing (Stryker) — test _presence_ is measured, test _quality_ isn't. 11. `harden-runner` runs `egress-policy: audit` everywhere, not `block`+allowlist. 12. Docs are Thai-majority with no English onboarding path (SECURITY.md/CoC/LICENSE are
English-only, creating an inconsistent split for non-Thai contributors/researchers). 13. `CHANGELOG.md`'s `[0.2.0]` entry is dated with no `v0.2.0` tag pushed yet — resolves
itself once a version is actually bumped and the deploy pipeline cuts that release.

### What this section is NOT

Not a mandate to close all 13 gaps immediately. Per `proven-good-do-it-now.md`: a gap that
matches a class this project has already proven beneficial (another regression test, another
`reportError`-routed catch, another mechanical audit-named fix) gets done without asking.
Everything else here — an E2E framework, commitlint, a repo-wide reformat, branch-protection
policy changes — gets weighed against what it actually buys a solo-maintained hobby project,
stated, and either done with reasoning or left for HetCreep to prioritize. This register
exists so that weighing has somewhere to start from next time, not so every item becomes a
task.

## What NOT to do with this file

- Don't auto-create these artifacts without going through the CONFORM choice-gate
  (checkpoint → one fix → verify → revert-if-red, per `gold-standard`'s own SKILL.md).
- Don't pick a LICENSE on HetCreep's behalf.
- Don't treat this as license to start an unscoped testing sweep — surface the gap,
  let the human decide the scope/timing.
- Don't re-litigate branch-protection strictness or the no-service-worker decision without
  new facts — both are recorded trade-offs, not oversights.

---

<!-- coalmine: verified 2026-08-06 · exemplar WCAG 2.2 AA (W3C) / Material Design 3 (Google) / Honkai: Star Rail + Genshin Impact (HoYoverse, same genre) / Apple HIG · revalidate 90d -->

## UI/UX MUST-HAVE standards (from the 2026-08-06 gold-standard UI/UX AUDIT)

Second, separate audit pass — UI/UX dimension specifically (not a repeat of the general
repo-hygiene pass above). Overall score ~70% across 4 scouted categories (Auth/onboarding
72% · HUD/nav 61% · Modals/forms 86% · Accessibility/responsive 64%). Ran through a
4-seat blind opinion review (unanimous) to decide scope + approach before FILLing — full reasoning: `MEMORY.md`, gold-standard UI/UX AUDIT entry, 2026-08-06.

**ADOPTED as binding**: this checklist governs UI/UX work going forward. A component that
regresses a CLOSED item below is a real regression, not a style nitpick — treat it that way.

### CLOSED this pass

1. **Pinch-zoom enabled** — `index.html`'s viewport meta no longer sets `user-scalable=no`
   (was a direct WCAG 2.2 AA SC 1.4.4/1.4.10 violation on a mobile-first game).
2. **`AuthModal`/`NameModal` keyboard focus-trap** — both now use the project's own
   `src/hooks/useModalA11y.ts` (same hook 6 other modals already used) — `onClose` is a
   no-op for both (neither is dismissable by design), so only the Tab-trap + focus-restore
   behavior activates; existing Escape/backdrop behavior for each modal is unchanged.
3. **`LoadingScreen` has `role="status"`/`aria-live="polite"`** — matches the pattern
   `ToastProvider.tsx` already used; only applied when rendering the default visual (custom
   `children` like `BattleTransition`'s VS card own their own `aria-live` instead, avoiding
   nested live regions of different politeness).
4. **`TopBar`'s currency `.addButton` is 24×24px** (was 20×20px at every breakpoint) — meets
   WCAG 2.2 AA SC 2.5.8's 24px floor.
5. **In-app Accessibility settings tab exists** (`SettingsModal` → การเข้าถึง) — one real,
   working control (an in-app reduce-motion override, `src/lib/a11ySettings.ts`,
   `localStorage`-persisted, applied via a `data-reduce-motion` attribute on `<html>`
   alongside the existing OS-level `prefers-reduced-motion` media query). More controls
   (text size, contrast, colorblind mode) are explicitly planned, not yet built — the panel
   says so honestly rather than implying it's complete.

### OPEN — backlog, not yet touched in code (scaffold intentionally NOT inserted per the

Blind-review verdict: these are either genuinely dormant/unreachable today, or feature-shaped
work that a half-built stub would obscure more than help)

Rated MUST (WCAG-blocking) vs EXCELLENCE (polish, cited exemplar in parens), effort S/M/L,
impact S/M/L — from the 4-scout audit, full evidence/`path:line` in that session's
transcript if needed again:

- **MUST** — 3D character-select in `LobbyScene`/`CharacterModel.tsx` has no keyboard path
  (WCAG SC 2.1.1). Currently unreachable — gated behind `SHOW_ARENA_SLOTS = false` — inline
  marker left at that flag (`LobbyScene.tsx`) so re-enabling it surfaces this first. M/M.
- **MUST** — `SettingsModal`'s coupon/export-save buttons (`GameInfoPanel`) have no
  pending/disabled state — a fast double-click can double-fire the async call. S/S.
- **MUST** — 3 tab strips (`SettingsModal`, `AddFriendModal`, `ItemsModal`) lack
  `aria-controls`/`id` tab↔panel linkage and arrow-key roving-tabindex (WAI-ARIA APG Tabs
  pattern). M/S.
- **MUST** — `useModalA11y`'s Escape handler doesn't scope to the top-most dialog if two
  ever stacked (uses `stopPropagation`, which doesn't stop sibling `window` listeners).
  Currently no code path opens two at once, so latent not live. M/S.
- **EXCELLENCE** (MD3) — `SideActions` icon buttons shrink 47→40px under the 720px
  breakpoint (still above the 24px WCAG floor, below MD3's 44-48dp recommendation). S/S.
- **EXCELLENCE** (HSR/Genshin) — `AuthModal` has no live inline validation (only validates
  on submit) and no password show/hide toggle. S/S each.
- **EXCELLENCE** — `WorldChat` launcher lacks `aria-expanded`; closing it doesn't return
  focus to the launcher button. S/S each.
- **EXCELLENCE** (MD3) — `MainNavigation`'s 5 not-yet-wired nav items ("pets", "training",
  "team", "summon", "guild") look pixel-identical to the 3 working ones until tapped. S/M.
- **EXCELLENCE** — no shared `--bp-*` breakpoint tokens — 11 distinct hardcoded pixel
  breakpoints across 25 CSS Module files (spacing/radius/motion are already tokenized in
  `index.css`, breakpoints aren't). M/S.
- **EXCELLENCE** — several animated HUD elements (`TopBar` EXP-bar sheen, `SideActions`
  badge pulse) have no `prefers-reduced-motion` override, unlike `LoadingScreen`/`TitlePage`
  which already do. S/S.
- **N-A, needs a real tool** — exact contrast ratios for translucent/gradient button
  combinations (token-pair contrast was spot-checked and passes comfortably; composited
  backgrounds need a rendered-screenshot contrast checker, not source-level reasoning).

## What NOT to do with this section

- Don't scaffold the OPEN items above into half-built stubs — the blind-review verdict (4/4
  seats) found that inserting placeholder code for all of them would create more confusion
  than a clean, cited backlog list, especially for the 2 items that are genuinely
  feature-shaped (3D keyboard-select, further a11y-tab controls) rather than TODO-sized.
- Don't re-open the "hand-write vs. install a UI library (Radix etc.)" question without new
  facts — this project has now independently rejected adding one twice for the same modal
  a11y territory (see item 45/28 in `MEMORY.md` for the first ruling, this audit's blind-review
  pass for the second, both landing the same way for the same reason).
