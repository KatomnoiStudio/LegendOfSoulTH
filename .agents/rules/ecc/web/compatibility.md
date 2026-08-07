---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "index.html"
---
<!-- coalmine: verified 2026-08-07 · exemplar caniuse.com WebGL2 + WebGPU support matrices + Three.js WebGL.isWebGL2Available() pattern + MDN "Detect WebGL" + Vite build.target docs · revalidate 90d -->
# Browser / WebGL Compatibility

> Project-authored — no `compatibility.md` exists in the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import; `web/coding-style.md` and `web/design-quality.md` cover CSS/typography/motion only, nothing about WebGL/device support.

## WebGL availability check (MUST-HAVE)

Mount the R3F `<Canvas>` only after confirming WebGL2 is available; show a fallback message otherwise. **Two** components mount a `<Canvas>` and both gate it — `LobbyScene.tsx` and `BattleScene/RealtimeBattleRoom.tsx` (`WukongAdventure` is 2D/DOM, no WebGL). Any third one must do the same.

> Corrected 2026-08-07: this section previously called `LobbyScene` "the only component that mounts a `<Canvas>`", which stopped being true when the realtime battle room landed. The rule itself was right and both call sites already comply — only the count was wrong.

```ts
import { WebGL } from 'three/examples/jsm/capabilities/WebGL.js';

if (!WebGL.isWebGL2Available()) {
  // render a fallback UI instead of <Canvas>
}
```

## Minimum support floor

**The enforced floor is `build.target` in `vite.config.ts`** — currently `chrome111 · edge111 · firefox114 · safari16.4 · ios16.4` (Vite's `baseline-widely-available`, written out explicitly so a Vite upgrade cannot move it silently).

**`browserslist` in `package.json` enforces nothing.** Verified 2026-08-07: no `@vitejs/plugin-legacy`, no `autoprefixer`, no `postcss` config, no Babel — nothing in this build reads that field. It records intent; treat it as a comment. `tsconfig.app.json`'s `target` is a third value that never reaches output (`noEmit: true`).

Binding consequences:

- **Never cite `browserslist` as a compatibility guarantee** in code comments or reviews. Three source files did exactly that and had to be corrected alongside this rule (`src/lib/audio/AudioEngine.ts`, `src/lib/audio/sounds.ts`, `src/components/WorldChat/chatStorage.ts`). Cite `build.target`, or caniuse/MDN as a reference.
- A support claim about a specific browser still wants a real check at the call site — the feature-detect pattern `chatStorage.ts` and `AudioEngine.ts` use. `build.target` controls what syntax is emitted; it does not conjure missing APIs.
- Moving the floor **down** is not a thing worth doing here: the game needs WebGL2 at minimum, which is already far above it.
- Whether to delete the `browserslist` field, or wire it as the source for `build.target`, is still a human call — but it is no longer urgent, because the floor is now enforced somewhere real.

> History, 2026-08-07: this section used to read "CLOSED — `package.json` already carries a `browserslist` field, so Vite/esbuild target the declared floor instead of defaulting." That was false, and the false CLOSED was load-bearing — three source files cited the guarantee it claimed to provide. It was rewritten as OPEN the same day, then closed for real once `build.target` was set explicitly.

## Mobile / touch

`index.html`'s viewport meta (`width=device-width`, `viewport-fit=cover`) signals mobile is a target, but `WukongAdventure`'s on-screen hint documents WASD/arrow-key controls only. A `onPointerDown` floor-click handler already exists — either surface it as a visible on-screen control for touch devices, or explicitly scope mobile out in the HUD/README so the mismatch is a decision, not an oversight.

## GPU tiering (nice-to-have)

`dpr` is no longer a flat cap — `LobbyScene` already scales its max dpr down (2 → 1.5) on ≥120Hz displays via `useDeviceRefreshRate()`, since render cost scales with dpr² × refresh rate. `@react-three/drei`'s `PerformanceMonitor` or `pmndrs/detect-gpu` remain the standard way to step quality down further on low-end hardware if reports of poor mobile performance come in — still not needed pre-emptively.
