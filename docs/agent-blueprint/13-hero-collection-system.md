# 13. Hero Collection System

> Category: Hero / Progression · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns: the hero roster as unlockable _content_ (`ROSTER` in `src/game/characters.ts:59-117` — id, name, rarity, archetype/`role`, base stats, model) and the single account-side ownership ledger write-path (`grantCharacter` in `src/data/accountRepository.ts:813-849`, mirrored in `accountRepository.supabase.ts:313`) that turns "hero exists in the game" into "this account owns it" (`OwnedCharacter` in `src/types/player.ts:12-18`). It also owns the design constraint from §4.1: every roster entry must be a distinct archetype, never a reskin. This is **System #13 "Hero Collection System"** in `AGENT_BLUEPRINT.md:61` ("gacha unlock, archetype-differentiation rule. Source: §4.1") — see Dependencies below for a doc-tracking note tied to that numbering.

Does NOT own: the RNG/roll/pity/cost mechanics that will eventually call `grantCharacter` (that's **Gacha System #23**, not built — `accountRepository.ts:807` says outright "ยังไม่มีระบบกาชา/เควสที่มอบตัวละครได้จริง"); leveling/star-ascension/skill-level math (**Progression #14** / **Star Ascension #15** — `OwnedCharacter` has no `star` field at all today); the hero's actual combat kit/kit-file pattern (**Hero Kit/Archetype System #12**).

### Inputs/Outputs

- In: `grantCharacter(uid: string, characterId: string): Promise<CharacterGrantResult>` — `characterId` must resolve via `getCharacter()` (`characters.ts:119-122`).
- Out: `CharacterGrantResult` = `{ ok: true, player: Player, characterId: string } | { ok: false, error: string }` — type declared at `accountRepository.ts:801-802`; the `grantCharacter` function signature returning it is at `accountRepository.ts:813-816`. On success, appends one `OwnedCharacter { characterId, level: 1, exp: 0, expToNext: 500, obtainedAt: ISOString }` to `player.ownedCharacters`; does not touch `teamSlots` (comment at `accountRepository.ts:811` — team placement is a separate player choice).
- Static content shape consumed by everything downstream: `Character` interface (`characters.ts:36-52`), `Rarity` union (`characters.ts:11`).

### Dependencies

- **Backend/Server-Authority System (#25)** — `grantCharacter` is duplicated by hand across `accountRepository.ts` (local) and `accountRepository.supabase.ts` (production), the same unresolved drift risk already flagged as a "Contract note" under #25 in `AGENT_BLUEPRINT.md:85` (also referenced at lines 17 and 101 of that file).
- **Hero Kit/Archetype System (#12)** — a roster entry isn't actually playable until its kit exists.
- Feeds **Progression (#14)** and **Star Ascension (#15)**, which will operate on the `OwnedCharacter` entries this system creates.
- Feeds **Gacha System (#23)** — per the code comment at `accountRepository.ts:807-809`, when gacha ships it must call this same `grantCharacter`, not add a new grant path.
- Currently only invoked from the World Chat admin command grammar (`src/components/WorldChat/`, wired through `App.tsx:35,58` and `useAuth.ts:184-226`) — i.e. today's only "unlock" trigger is an admin debug command, not real gameplay.
- **Doc-tracking note**: `AGENT_BLUEPRINT.md:30` currently files #13 under Tier 2 with "**zero implementation found**" (grouped with #23 Gacha and #15 Star Ascension). That line is stale for #13 specifically — this contract documents a real, working `ROSTER` (3 heroes) and a wired-up `grantCharacter` ledger, which is implementation, just not gacha-gated implementation yet. Landing this contract into `AGENT_BLUEPRINT.md` should also correct or split that Tier 2 line so #13 isn't asserted as both "zero implementation" (line 30) and documented-working (this contract) at the same time.

### Done-criteria

1. `grantCharacter` on an already-owned `characterId` returns `{ ok: false }` and leaves `ownedCharacters` unchanged (existing behavior at `accountRepository.ts:825-827` — needs a regression test, none found under `src/data/`).
2. `grantCharacter` on an unknown `characterId` returns `{ ok: false }` without touching the DB (`accountRepository.ts:817`).
3. Every `ROSTER` entry has a `role` (archetype) distinct from every other entry — currently true for all 3 (นักรบกองหน้า / ผู้พิทักษ์ / ผู้สนับสนุน, `characters.ts:66,85,104`); add a data-lint/test asserting this before roster count grows, so §4.1's "no reskin" rule is machine-checked instead of eyeballed.
4. `accountRepository.ts` and `accountRepository.supabase.ts` implementations of `grantCharacter` stay behaviorally identical (same success/error shape, same `OwnedCharacter` defaults) — no test currently enforces this.
5. No second write path to `ownedCharacters` is introduced anywhere in `src/` outside `grantCharacter` (grep gate, per the file's own comment at `accountRepository.ts:809`).

### World-class bar

**Brawl Stars (Supercell)** — same genre shape (real-time skill-based action combat, large collectible-character roster feeding PvP), and Supercell is publicly disciplined about never shipping a Brawler that's mechanically a reskin: every new character brings a genuinely distinct Basic/Super interaction before it's allowed into the pool. The concrete pattern worth borrowing isn't a code pattern from their client (not observable) but their _process_ gate — treat archetype-uniqueness as a checked property of the content pipeline, not a design-review judgment call. That's directly actionable here as item 3 above: a small test/lint over `ROSTER` that fails the moment two heroes collide on archetype, catching the §4.1 anti-pattern mechanically as the roster scales past 3.

### Stay-current note

With only 3 heroes and blueprint's own P10 ("Hero Collection expansion", `MASTER_BLUEPRINT_v3.0.md:509`) still pending, archetype-uniqueness checking by eye is fine today but will stop scaling once the roster grows past a handful — that's the one part of this design plausibly needing a real automated check later, not a redesign.

### Low-maintenance-cost design

Keep `ROSTER` a flat plain-object array (already the case, `characters.ts:59-117`) rather than a class hierarchy or per-archetype subtype/interface — there's exactly one shape (`Character`) and one archetype differentiator (`role`, a plain string), so no factory/strategy abstraction is warranted for 3 (soon more, but still homogeneous) data rows. Equally, keep `grantCharacter` the single mutator of `ownedCharacters` — the file already states this explicitly as policy ("เมื่อมีระบบได้ตัวละครของจริงแล้ว ให้ระบบนั้นเรียกฟังก์ชันเดียวกันนี้ ไม่ต้องเขียนทางเพิ่มตัวละครเส้นใหม่", `accountRepository.ts:808-809`) — future Gacha System #23 work should extend this call site, not add a parallel one. Both are the project's own established style (data-driven config over hardcoded branching, single source of truth over premature interfaces) — no new abstraction is justified until a second concrete unlock mechanism (gacha) actually exists to justify one.

### Known scars (real historical precedent)

- **Scar**: A special-event login-timing bug let players receive the "New event!" entry reward twice by logging in around 5:00 PM on the event's start day — the reward grant fired a second time instead of being rejected as already-claimed. — Source: NamuWiki, "Brawl Stars/Bug" (en.namu.wiki/w/브롤스타즈/버그)
- **Test-for-us**: Call `grantCharacter(uid, characterId)` for the same account+hero twice back-to-back (and again racing two calls concurrently, e.g. via `Promise.all`), including across a process/day boundary if a future quest or login-reward path calls it — confirm the second call always returns `{ ok: false }` and `ownedCharacters` never ends up with two entries for the same `characterId`. This exercises done-criterion 1, but under concurrency/repeat-call pressure, not just a single sequential re-call.

- **Scar**: In the Pizza Planet event, leftover event currency from the _previous_ event incorrectly carried over and converted into the new event's currency instead of resetting to zero, so some players started the new event already holding unearned currency; Supercell later confirmed the cause and paid out compensation. — Source: talkesport.com, "Brawl Stars Pizza Planet Event Bug: Causes, Fixes, and Compensation Detail"; corroborated by sportskeeda.com, "Brawl Stars offers compensation for Pizza Planet event bugs"
- **Test-for-us**: When any future feature (gacha, seasonal quest, login-reward) is wired to call `grantCharacter` per §4.1's "extend the same call site" policy, try running that flow across a reset/campaign boundary (e.g. simulate leftover in-flight state from a prior session/version) and check no `OwnedCharacter` entries appear in the ledger that the account didn't actually earn in the current cycle — i.e. state from an old code path or stale client build can't leak a hero grant into the new one.

- **Scar**: A "99 Brawler Quest" feature failed to recognize that a player already owned certain brawlers even though the underlying unlock had genuinely happened — a downstream consumer read stale/incorrect ownership state, distinct from the grant itself. Supercell's official account confirmed it as a tracking desync, not a lost unlock. — Source: Brawl Stars official X/Twitter account (x.com/BrawlStars, "BUG CHECKPOINT: 99 — We're aware of the issue causing the 99 Brawler Quests not recognising Brawler ownership")
- **Test-for-us**: This project has two live implementations of `grantCharacter` (`accountRepository.ts` local vs `accountRepository.supabase.ts` production, per the Dependencies section's flagged drift risk). Grant a hero through one implementation, then read `ownedCharacters` through every other consumer that will eventually depend on it (Progression #14, Star Ascension #15, any future quest/achievement check) and confirm they all agree a hero granted by one path is recognized as owned everywhere — not just by whichever function wrote it.

This project's own spec — `docs/agent-blueprint/13-hero-collection-system.md` and `docs/MASTER_BLUEPRINT_v3.0.md` — decides what "correct" behavior looks like here; Brawl Stars only supplies the shape of failure to test for, not the fix to copy.
