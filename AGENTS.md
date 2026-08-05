# AGENTS.md — Global Project Mandates for AI Agents

> **Operator / Human User**: `HetCreep`  
> **Repository**: `LegendofSoulTH/LegendOfSoulTH`  
> **RULES_VERSION: 4** (bump on every material rule change — see `.agents/rules/rules-freshness-check.md`)

---

## 0. Before anything else, every session

1. **Freshness check** (`.agents/rules/rules-freshness-check.md`): compare this file's `RULES_VERSION` against `MEMORY.md`'s `RULES_VERSION last synced:`. Mismatch → fully read `AGENTS.md` + all of `.agents/rules/**` before proceeding, not a skim.
2. **Ring check** (`.agents/rules/ring0-authority.md`): does `.agents/ring0.local` exist in this working tree? Present → you're running on Ring 0 (HetCreep's own machine), HetCreep's live chat instruction always wins over any written rule. Absent → you're Ring 1: every rule below and everything under `.agents/rules/**` is binding; conform code to it, never the reverse, and never weaken/edit a Ring-0 rule file yourself — flag disagreement instead.

## ⚖️ MANDATORY LAW FOR ALL AGENTS

1. **Read `MEMORY.md` First**: Before starting any task, read `MEMORY.md` at the project root.
2. **Maintain & Synthesize `MEMORY.md`**: Continuously update `MEMORY.md` with past summary, current status, and technical decisions.
3. **Identity Stamping**: Always stamp edits with Operator (`HetCreep`), Agent Identity/Role, and Timestamp.
4. **Relative Paths Only**: NEVER hardcode machine-specific absolute paths (e.g. `C:\Users\...`). Always use relative repository paths (`MEMORY.md`, `.agents/rules/`, etc.) so the project remains portable for all contributors.
5. **ECC Coding Rules**: Follow `.agents/rules/ecc/` (common + typescript + react + web) — sourced from [affaan-m/ECC](https://github.com/affaan-m/ECC) (MIT, see `.agents/rules/ecc/LICENSE`). Read `.agents/rules/ecc/README.md` first for layer precedence (including sibling layers like `react/` vs `web/` on the same file — not documented upstream). Where an ECC file's example conflicts with this repo's actual toolchain, `.agents/rules/ecc/PROJECT-OVERRIDES.md` wins.
6. **Ring 0 authority** (`.agents/rules/ring0-authority.md`): this is a repo owned by HetCreep. Ring 1 (any machine other than HetCreep's own) treats every rule in this file and `.agents/rules/**` as binding — fix code to match the rules, never edit the rules to match the code. Full precedence order is in that file.
7. **Pre-push sync** (`.agents/rules/pre-push-sync-law.md`): every machine, before every push — `git fetch`, check ahead/behind, merge `origin/master` if behind, resolve any conflict by hand preserving both sides' work, full verify (`typecheck && lint && test && build`) green, only then push. Binding on Ring 0 too — this is code hygiene, not an authority question.
8. **Commit granularity** (`.agents/rules/commit-granularity-law.md`): one completed task = one commit. Don't split a single finished task across several partial commits ("wip", "fix typo"); don't squash unrelated tasks together either.
