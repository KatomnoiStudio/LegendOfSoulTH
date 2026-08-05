# MEMORY.md — Project State & History Journal

> **Operator / Human User**: `HetCreep`  
> **Repository**: `LegendofSoulTH/GameTurnBase`  
> **Default Branch**: `master`  
> **Last Updated**: 2026-08-05T22:40:00+07:00 by `Claude Sonnet 5 (Claude Code Agent)`

---

## 👤 Identity & System Context

- **System Owner / Developer**: `HetCreep`
- **Project Name**: GameTurnBase (Turn-based 2.5D RPG Lobby & Game Engine)
- **Primary Tech Stack**: React 19, TypeScript (Strict Mode), Vite 8, Three.js / React Three Fiber, Phaser 4, Oxlint

---

## 📜 Past Summary (สรุปอดีต)

1. **Lobby Scene & 2.5D Graphics Engine**:
   - Built 2.5D isometric fixed-camera lobby with `CameraRig`, 3 character standing slots (`left`, `center`, `right`).
   - Created procedural 3D GLB character models (`monkey-king.glb`, `pig-warrior.glb`, `pilgrim-monk.glb`) via `tools/build-models.mjs`.
   - Added `WukongAdventure` exploration mode with tile movement, directional sprites, and dust particle effects.
   - Built full HUD, character roster modal, profile modal, audio settings, and toast notifications system.

2. **Continuous Integration (CI/CD) & Automation Setup**:
   - Installed `.github/workflows/ci.yml` (Build, Typecheck, Lint on push/PR).
   - Installed `.github/workflows/deploy.yml` (Automatic GitHub Pages deployment).
   - Installed `.github/workflows/codeql.yml` (CodeQL Security Analysis).
   - Installed `.github/dependabot.yml` (Weekly npm and GitHub Actions updates).
   - Added Issue Templates (`bug_report.yml`, `feature_request.yml`) and `PULL_REQUEST_TEMPLATE.md`.

3. **Strict Settings & Branch Consolidation**:
   - Updated `tsconfig.app.json` with `"strict": true`, `"noImplicitReturns": true`, `"noFallthroughCasesInSwitch": true`.
   - Updated `.oxlintrc.json` with recommended rulesets and disabled `react-in-jsx-scope` for React 19 automatic JSX transform.
   - Set Vite `base: '/GameTurnBase/'` for GitHub Pages.
   - Consolidated repository to a single branch: `master`.
   - Merged initial Dependabot PRs #1 through #7.

4. **GitHub Security Enforcement (Enabled by HetCreep)**:
   - Full GitHub Security suite enabled at `https://github.com/LegendofSoulTH/GameTurnBase/security`.
   - Active: Dependabot Alerts, Automated Security Updates, Secret Scanning, and CodeQL Vulnerability Analysis.

5. **Automated Security Workflows**:
   - Added `.github/workflows/security-scan.yml` (Gitleaks secret leak detection + daily NPM audit).
   - Added `"audit": "npm audit --audit-level=high"` script to `package.json`.

6. **Player Accounts + Gold/Gem Currency System** (commit `c019bb7`, merged via `0ff3f92`):
   - Built `src/data/accountRepository.ts` as the "database" (localStorage-backed, no server yet).
     Stores accounts (uid/email/password hash+salt), each with a `player: Player` and a
     `transactions: CurrencyTransaction[]` audit ledger.
   - **Hard rule enforced at the API layer**: gold can ONLY be credited via
     `earnGold(uid, 'quest' | 'drop', amount)`; gems can ONLY be credited via
     `topUpGems(uid, packageId)` or `redeemCoupon(uid, code)`. No generic setGold/setGem exists
     anywhere — every credit is logged with its source for auditability and coupon-reuse checks.
   - `useAuth.ts` is the single hook every screen talks to (`register/login/logout/updatePlayer/
     earnGold/topUpGems/redeemCoupon`) — no component calls `accountRepository` or `localStorage`
     directly.
   - New `TopBar` "+" buttons: gold = demo "collect drop" (random 20–80, stand-in until a real
     quest/battle system exists); gem = opens new `GemShopModal` (3 static package tiers,
     **no real payment gateway wired — always succeeds, demo only**).
   - `SettingsModal`'s previously non-functional "คูปอง" tab now actually calls `redeemCoupon`.
     Seeded test code: `WELCOME2026` → 50 gems, one redemption per account.
   - `src/hooks/usePlayer.ts` confirmed **dead code** — `App.tsx` uses `useAuth` exclusively;
     `usePlayer` is leftover mock-hook scaffolding, not part of the live data path.
   - `README.md` rewritten to match current reality (was claiming "no login/backend" — false).

---

## 🎯 Current Status (สถานะปัจจุบัน)

- **Repo Status**: 🟢 Clean & Synced (`origin/master`) — working tree matches `HEAD`, no pending changes
- **CI Pipelines**: 🟢 Passing (Typecheck 0 errors, Lint 0 errors, Build clean) — re-verified `npx tsc -b --noEmit` after latest merges, zero errors
- **Security & Protection**: 🛡️ 100% Enabled & Monitored (CodeQL + Dependabot + Secret Scanning + Gitleaks + NPM Audit)
- **Deployment**: Configured for GitHub Pages (`/GameTurnBase/`)
- **⚠️ Remote mismatch noted**: `git remote -v` currently points `origin` at
  `https://github.com/DemoGODRTX/GameTurnBase.git`, but this file's header still says repo
  `LegendofSoulTH/GameTurnBase`. Not corrected here since it's unclear which is authoritative
  (fork vs. rename vs. stale doc) — flag to human operator to confirm and fix the header, or the
  remote, whichever is wrong.
- **Player accounts/currency**: functional locally (see item 6 above) but entirely client-side —
  no real backend, no payment gateway. Do not treat as production-ready for real money or
  cross-device play.
- **Open/next work**: no quest system, no real drop table, no shop UI beyond `GemShopModal`, no
  battle system — `earnGold('drop', ...)` on the TopBar "+" is a placeholder standing in for all
  of that.

---

## 📌 Agent Rules & Memory Mandates (กฎเหล็ก Agents)

- Every agent working on this workspace MUST inspect `MEMORY.md` before starting tasks.
- Every agent MUST update `MEMORY.md` upon completing major tasks, stamping with timestamp and identity (`HetCreep` operator).
