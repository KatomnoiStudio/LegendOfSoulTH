# MEMORY.md — Project State & History Journal

> **Operator / Human User**: `HetCreep`  
> **Repository**: `LegendofSoulTH/GameTurnBase`  
> **Default Branch**: `master`  
> **Last Updated**: 2026-08-05T22:11:00+07:00 by `Antigravity AI (HetCreep Agent)`

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

---

## 🎯 Current Status (สถานะปัจจุบัน)

- **Repo Status**: 🟢 Clean & Synced (`origin/master`)
- **CI Pipelines**: 🟢 Passing (Typecheck 0 errors, Lint 0 errors, Build clean)
- **Deployment**: Configured for GitHub Pages (`/GameTurnBase/`)

---

## 📌 Agent Rules & Memory Mandates (กฎเหล็ก Agents)

- Every agent working on this workspace MUST inspect `MEMORY.md` before starting tasks.
- Every agent MUST update `MEMORY.md` upon completing major tasks, stamping with timestamp and identity (`HetCreep` operator).
