<!-- coalmine: verified 2026-08-05 · exemplar affaan-m/ECC rules/README.md + agents.md open spec · revalidate 90d -->
# ECC rule import — structure & precedence

Adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC) `rules/README.md` (MIT, see [LICENSE](LICENSE)). This file exists locally so an agent doesn't have to fetch the upstream repo to understand how these rules layer — the upstream README explains the `common/` vs language-directory split but was not itself copied over during import.

## Layers imported here

```
ecc/
├── common/      # language-agnostic — always applies
├── typescript/  # extends common/, applies to .ts/.tsx/.js/.jsx
├── react/       # extends typescript/ + common/, applies to .tsx/.jsx
└── web/         # extends common/, applies to .css/.html/.tsx/.jsx (styling/DOM/browser concerns)
```

Only these four layers were pulled in — this project doesn't use Angular/Vue/Nuxt/Python/Go/etc, so those upstream directories were skipped. See [MEMORY.md](../../../MEMORY.md) for the import record.

## Precedence

1. **Common vs. language-specific**: language-specific overrides common on conflict (documented upstream, and in [AGENTS.md](../../../AGENTS.md)).
2. **Sibling layers on the same file** (not documented upstream — this project's own rule, since a `.tsx` file matches `typescript/`, `react/`, AND `web/` simultaneously): more specific layer wins, same order as the directory list above — `react/` > `typescript/` > `web/` > `common/`. `web/` sits below `typescript/`/`react/` here because it targets DOM/CSS/browser concerns; where it and `react/` both touch React component files, `react/` wins.
3. Where this project's actual toolchain differs from what an ECC file assumes (package manager, linter, installed test framework, available subagents), **[PROJECT-OVERRIDES.md](PROJECT-OVERRIDES.md) wins over any conflicting statement in `common/`, `typescript/`, `react/`, or `web/`.**

## Known gaps (tracked, not yet filled)

- No `performance.md` existed for `react/` or a game-engine layer upstream — this project added `react/performance.md` locally (R3F/Three.js/Phaser-specific, not from ECC upstream).
- No `observability.md` existed upstream in any imported layer — this project added `web/observability.md` locally.
- No `compatibility.md` existed upstream — this project added `web/compatibility.md` locally.
- Project's own `LICENSE` (for GameTurnBase itself, distinct from this `ecc/` subtree's MIT terms) is still undecided — see MEMORY.md open item.
