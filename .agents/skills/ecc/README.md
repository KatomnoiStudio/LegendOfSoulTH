<!-- coalmine: verified 2026-08-07 · exemplar affaan-m/ECC skills/ · revalidate 90d -->

# ECC skill import — reference material, not binding rules

Vendored from [affaan-m/ECC](https://github.com/affaan-m/ECC) `skills/` (MIT, see [`.agents/rules/ecc/LICENSE`](../../rules/ecc/LICENSE) — same source repo, one license covers both trees).

**This is a separate tree from [`.agents/rules/ecc/`](../../rules/ecc/) on purpose.** ECC itself splits `rules/` (binding coding-style/security/testing conventions per language, imported there) from `skills/` (reference playbooks an agent consults when the situation calls for it — not something every file must comply with). Keeping them apart here mirrors that distinction instead of flattening it.

## Imported

- `postgres-patterns/SKILL.md` — index selection, data types, RLS patterns; relevant because `supabase/migrations/*.sql` is real schema in this repo.
- `database-migrations/SKILL.md` — migration safety checklist (forward-only, concurrent index creation, NOT NULL without a default, etc.); consult before writing a new `supabase/migrations/*.sql` file.

## Not imported

The rest of ECC's `skills/` tree (brand/content/research/other-language skills) — not relevant to this project's stack.
