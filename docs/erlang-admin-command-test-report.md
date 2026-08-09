# Erlang Admin Command — TDD Evidence

> Operator: `HetCreep`
> Agent: `Codex / primary`
> Timestamp: `2026-08-09T19:07:00+07:00`

## Behaviour

An authenticated account that the existing admin gate recognises can enter
`/givecharacter erlang` in World Chat. The command resolves to
`spear-warrior`, then uses the existing `grantCharacter` authority path. A
non-admin's identical text remains a normal chat message and cannot grant a
character.

## RED

Before implementation, the parser and admin resolver tests failed because
`erlang` was not a roster character or alias. Both returned the unknown-character
error listing the existing roster.

## GREEN

- `commands.test.ts`: parser and admin-gate resolution map `erlang` to
  `spear-warrior`.
- `WorldChat.test.tsx`: the admin UI calls `onGiveCharacter('spear-warrior')`,
  shows the private Erlang success message, and does not post the command.
- `heroCollection.test.ts`: `grantCharacter` persists Erlang in the owned roster.
- `battleAssets.test.ts`: includes `spear-warrior`, so every registered Erlang
  battle frame must exist under `public/`.

## Validation run

```
npm.cmd test -- src/components/WorldChat/commands.test.ts src/components/WorldChat/WorldChat.test.tsx src/data/heroCollection.test.ts src/game/realtimeBattle/battleAssets.test.ts src/game/realtimeBattle/entitySpritePresentation.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

The focused suite, typecheck, lint, and production build passed locally. The
repository-wide coverage report remains below the TDD skill's 80% target
(6.15% statements): this is a pre-existing global coverage gap, not represented
as feature-specific coverage.

`npm.cmd run ci` was also attempted. Its initial typecheck and lint steps passed,
but the full parallel Vitest process exhausted Node's memory. Re-running the
reported `AuthModal`, `WorldChat`, and Hero Collection files together passed all
32 tests, including the two command paths changed here.
