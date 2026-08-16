---
paths:
  - '**/*.tsx'
  - '**/*.jsx'
  - 'tools/**/*.mjs'
---

<!-- coalmine: verified 2026-08-07 · exemplar pmndrs/react-three-fiber "Performance Pitfalls" docs + excalidraw vite.config.mts manual-chunking + Vite build-options defaults + Khronos glTF-Transform Draco/Meshopt convention · revalidate 90d -->

# React Three Fiber / Phaser Performance

> Project-authored — not part of the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import. No `react/performance.md` exists upstream; `common/performance.md` and `web/performance.md` don't cover this stack's actual bottleneck surface (see [PROJECT-OVERRIDES.md](../PROJECT-OVERRIDES.md)). Written for this repo's dependencies: `@react-three/fiber`, `three`, `phaser`.

## `useFrame` discipline (R3F)

- Never call `setState`/trigger a React re-render inside `useFrame` — mutate refs directly (`meshRef.current.rotation.y += delta`).
- Read/write Three.js objects (position, rotation, material props) via refs, not component props re-rendered every frame.
- Keep `useFrame` callbacks cheap — no allocations (`new Vector3()`, `new THREE.Color()`) per frame; hoist reusable objects outside the callback.

## Draw calls & geometry

- Prefer `<Instances>`/`InstancedMesh` for repeated geometry (character roster slots, tile grids) over N separate `<mesh>` components.
- Dispose geometries/materials/textures on unmount (`geometry.dispose()`, `material.dispose()`, `texture.dispose()`) — R3F doesn't do this automatically for objects you construct manually outside its declarative tree.

## GLB / asset pipeline (`tools/build-models.mjs`) — dev tooling only, not page weight

**Nothing in `src/` loads a `.glb`.** Characters render as 2D sprites; `public/models/` is gitignored and `deploy.yml` deliberately skips `build:models` for exactly this reason. This section therefore governs the weight of a _development_ pipeline, not anything a player downloads — read it that way, and do not cite it as a page-performance rule.

- If that pipeline is ever wired into the shipped game, compress before shipping: Draco or Meshopt (`glTF-Transform`'s `draco()`/`meshopt()` transforms, or `GLTFExporter`'s built-in Draco option). Uncompressed GLBs bloat both the repo and initial load.
- Reuse textures/materials across character variants where visually identical; don't bake duplicate texture atlases per model.

> Corrected 2026-08-07: this section previously read as though it governed shipped asset weight. It never has — the pipeline's own header says nothing loads its output, and the deploy workflow skips it.

## Phaser (`WukongAdventure` / tile-based scenes)

- Use texture atlases (`this.load.atlas`) instead of individual sprite images — reduces draw calls via batching.
- Pool reusable game objects (dust particles, projectiles) instead of `destroy()`+recreate every use.
- Keep `update()` callbacks allocation-free for the same reason as `useFrame` above — Phaser's loop runs every tick regardless of React's render cycle.

## Bundle budget

- `vite.config.ts` currently raises `chunkSizeWarningLimit` to silence the Three.js chunk warning rather than budgeting it. If bundle size matters going forward, add `rollup-plugin-visualizer` or `size-limit` to `npm run ci` instead of suppressing the warning — a raised limit hides regressions, it doesn't fix them.
