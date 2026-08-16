---
paths:
  - '**/*.ts'
  - '**/*.tsx'
  - '**/*.jsx'
  - '**/*.mjs'
  - 'tools/**/*.mjs'
  - 'index.html'
  - 'vite.config.ts'
---

<!-- coalmine: verified 2026-08-07 · exemplar caniuse.com WebGL2 + WebGPU support matrices + Three.js WebGL.isWebGL2Available() pattern + MDN "Detect WebGL" + Vite build.target docs · revalidate 90d -->

# Browser / WebGL Compatibility

> Project-authored — no `compatibility.md` exists in the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import; `web/coding-style.md` and `web/design-quality.md` cover CSS/typography/motion only, nothing about WebGL/device support.

## WebGL availability check (MUST-HAVE)

Mount the R3F `<Canvas>` only after confirming WebGL2 is available; show a fallback message otherwise. **Two** components mount a `<Canvas>` and both gate it — `LobbyScene.tsx` and `BattleScene/RealtimeBattleRoom.tsx` (`WukongAdventure` is 2D/DOM, no WebGL). Any third one must do the same.

> Corrected 2026-08-07: this section previously called `LobbyScene` "the only component that mounts a `<Canvas>`", which stopped being true when the realtime battle room landed. The rule itself was right and both call sites already comply — only the count was wrong.

```ts
import { WebGL } from 'three/examples/jsm/capabilities/WebGL.js'

if (!WebGL.isWebGL2Available()) {
  // render a fallback UI instead of <Canvas>
}
```

## Minimum support floor

**The enforced floor is `build.target` in `vite.config.ts`** — currently `chrome111 · edge111 · firefox115 · safari16.4 · ios16.4` (firefox ยกจาก 114 เมื่อ 2026-08-16 — ดูหัวข้อท้ายไฟล์) (Vite's `baseline-widely-available`, written out explicitly so a Vite upgrade cannot move it silently).

**`browserslist` in `package.json` enforces nothing.** Verified 2026-08-07: no `@vitejs/plugin-legacy`, no `autoprefixer`, no `postcss` config, no Babel — nothing in this build reads that field. It records intent; treat it as a comment. `tsconfig.app.json`'s `target` is a third value that never reaches output (`noEmit: true`).

Binding consequences:

- **Never cite `browserslist` as a compatibility guarantee** in code comments or reviews. Three source files did exactly that and had to be corrected alongside this rule (`src/lib/audio/AudioEngine.ts`, `src/lib/audio/sounds.ts`, `src/components/WorldChat/chatStorage.ts`). Cite `build.target`, or caniuse/MDN as a reference.
- A support claim about a specific browser still wants a real check at the call site — the feature-detect pattern `chatStorage.ts` and `AudioEngine.ts` use. `build.target` controls what syntax is emitted; it does not conjure missing APIs.
- Moving the floor **down** is not a thing worth doing here: the game needs WebGL2 at minimum, which is already far above it.
- Whether to delete the `browserslist` field, or wire it as the source for `build.target`, is still a human call — but it is no longer urgent, because the floor is now enforced somewhere real.

> History, 2026-08-07: this section used to read "CLOSED — `package.json` already carries a `browserslist` field, so Vite/esbuild target the declared floor instead of defaulting." That was false, and the false CLOSED was load-bearing — three source files cited the guarantee it claimed to provide. It was rewritten as OPEN the same day, then closed for real once `build.target` was set explicitly.

## Mobile / touch

**CLOSED 2026-08-16** — touch controls shipped (`WukongAdventure.module.css:697-708`). This section and the 2026-08-07 gold-standard baseline both still described it as open; the code had moved and the rules had not. History below.

`index.html`'s viewport meta (`width=device-width`, `viewport-fit=cover`) signals mobile is a target, but `WukongAdventure`'s on-screen hint documents WASD/arrow-key controls only. A `onPointerDown` floor-click handler already exists — either surface it as a visible on-screen control for touch devices, or explicitly scope mobile out in the HUD/README so the mismatch is a decision, not an oversight.

## GPU tiering (nice-to-have)

`dpr` is no longer a flat cap — `LobbyScene` already scales its max dpr down (2 → 1.5) on ≥120Hz displays via `useDeviceRefreshRate()`, since render cost scales with dpr² × refresh rate. `@react-three/drei`'s `PerformanceMonitor` or `pmndrs/detect-gpu` remain the standard way to step quality down further on low-end hardware if reports of poor mobile performance come in — still not needed pre-emptively.

<!-- coalmine: verified 2026-08-16 · exemplar caniuse.com "JavaScript built-in: Array: toSorted" (Firefox 115 / Chrome 110 / Safari 16.0 / Edge 110, fetched live 2026-08-16) + esbuild target semantics (lowers syntax, never polyfills a built-in) · revalidate 90d -->

## The build floor covers syntax, not built-in methods (2026-08-16)

**`vite.config.ts`'s `build.target` is the only enforceable browser floor in this project**
(the `browserslist` field in `package.json` is read by nothing in this build — stated in
`vite.config.ts` itself). What that floor does NOT do is protect against a **built-in
method** that ships later than the floor: esbuild lowers _syntax_ and never polyfills a
prototype method, so calling one below its support version is a `TypeError` at runtime,
invisible to build, typecheck, lint and every CI workflow.

**Before using an array/object/string built-in that is newer than the floor, check its
support version and either raise the floor deliberately or use the older form.**

**The live instance this is written from — CLOSED the same day (2026-08-16).** `build.target`
declared `firefox114` while `Array.prototype.toSorted`/`toReversed` require **Firefox 115**
(caniuse, verified live). Eleven shipped call sites — six in
`src/game/pvp/PvPAuthorityEngine.ts`, two in `stageConfig.ts`, one each in `WorldChat.tsx`,
`chatStorage.ts` and `combatCameraFraming.ts` — so a Firefox 114 user got a TypeError, not a
degraded experience, on a version the project publicly declared supported.

**HetCreep ruled: raise the floor.** It dropped nobody. Firefox 114 shipped 6 June 2023 and
went out of support **4 July 2023**, the day 115 arrived — roughly one month of patches, and
none since. **115 is the ESR line**, the last version supporting Windows 7/8/8.1 and macOS
10.12–10.14, still patched (115.38.0, 21 July 2026). Anyone on a legacy OS is on 115 by
definition; nobody is deliberately on 114. The floor had been set **below the range Mozilla
supports**, so this was a correction rather than a reduction in what the game runs on.

**And the linter is pushing the codebase past its own floor.** `oxlint`'s
`unicorn/no-array-sort` rule flags `.sort()` and recommends `.toSorted()`; it fired during
the 2026-08-16 session and the suggested fix was taken. **The lint gate and the build floor
disagree, and the lint gate wins because it is enforced while the floor is never checked
against built-ins.**

The rule that outlives that instance: **the floor states which built-in set it clears, and
using one newer than the floor means raising the floor deliberately — not discovering it
when a player hits a TypeError.**

**Enforcement**: ADVISORY. Deliberately not proposed as a rule with a check — "verify every
new built-in against the floor" has no enforcer and would fail this estate's own entry gate.
The durable form is a comment at `build.target` naming which built-in set the floor to
clear, so the floor states its own reason.
