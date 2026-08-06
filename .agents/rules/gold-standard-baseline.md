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

6. **Component/integration test coverage** — OPEN, the one remaining gap. As of 2026-08-07
   there are **20 `*.test.ts` files / 174 tests** covering the realtime-battle systems, the
   dialogue engine, the account/password modules, and pure helpers — but **zero `*.test.tsx`
   and no `@testing-library/*` dependency**, so not one of the ~57 interactive React
   components has a rendering-level test. (Compare: excalidraw ships 50+ `.test.tsx`;
   react-three-fiber tests its canvas/events/hooks the same way.) This remains the single
   biggest real gap; flag it when doing substantial work on any untested component, but
   don't unilaterally start a large test-writing sweep without asking — that's real
   effort/scope, gate it. There is also no coverage tooling at all (`@vitest/coverage-*` is
   not installed), so those 174 tests run with zero visibility into what they actually reach.

   > Corrected 2026-08-07: this item previously stated "Current coverage is a single file
   > (`src/lib/format.test.ts`, pure functions only)". The conclusion held but the evidence
   > had gone stale — four independent scouts in the 2026-08-07 audit flagged it. A binding
   > rule citing a fact anyone can disprove in one command costs the whole ruleset its
   > credibility, which is why the correction is recorded rather than silently overwritten.

## What NOT to do with this file

- Don't auto-create these artifacts without going through the CONFORM choice-gate
  (checkpoint → one fix → verify → revert-if-red, per `gold-standard`'s own SKILL.md).
- Don't pick a LICENSE on HetCreep's behalf.
- Don't treat this as license to start an unscoped testing sweep — surface the gap,
  let the human decide the scope/timing.

---

<!-- coalmine: verified 2026-08-06 · exemplar WCAG 2.2 AA (W3C) / Material Design 3 (Google) / Honkai: Star Rail + Genshin Impact (HoYoverse, same genre) / Apple HIG · revalidate 90d -->
## UI/UX MUST-HAVE standards (from the 2026-08-06 gold-standard UI/UX AUDIT)

Second, separate audit pass — UI/UX dimension specifically (not a repeat of the general
repo-hygiene pass above). Overall score ~70% across 4 scouted categories (Auth/onboarding
72% · HUD/nav 61% · Modals/forms 86% · Accessibility/responsive 64%). Ran through
CoalBoard's ask-CB opinion lane (4-seat, unanimous) to decide scope + approach before
FILLing — full reasoning: `MEMORY.md`, gold-standard UI/UX AUDIT entry, 2026-08-06.

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
ask-CB verdict: these are either genuinely dormant/unreachable today, or feature-shaped
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

- Don't scaffold the OPEN items above into half-built stubs — the ask-CB verdict (4/4
  seats) found that inserting placeholder code for all of them would create more confusion
  than a clean, cited backlog list, especially for the 2 items that are genuinely
  feature-shaped (3D keyboard-select, further a11y-tab controls) rather than TODO-sized.
- Don't re-open the "hand-write vs. install a UI library (Radix etc.)" question without new
  facts — this project has now independently rejected adding one twice for the same modal
  a11y territory (see item 45/28 in `MEMORY.md` for the first ruling, this audit's ask-CB
  pass for the second, both landing the same way for the same reason).
