# 28. Social / Communication System

> Category: Social · Generated via gold-standard FILL + adversarial CB-lite verify (2 seats), 2026-08-07 · **revised after verify flagged an issue**.

### Scope

Owns two shipped surfaces: (1) **World Chat** — a global Supabase-backed text channel with Realtime delivery, player-local block preferences, and a hidden admin command grammar; and (2) **Friends** — UID-based player lookup + one-way "add friend" snapshots. It does NOT own guild/private chat, a reciprocal friend-request flow, or a full report/takedown moderation console. Data ownership is locked in Master Blueprint §7.5: messages are server-authoritative; `/block` is only a client-local viewing preference.

### Inputs/Outputs

- **World Chat** — in: message text only; `post_world_chat_message(text)` derives author id/name and timestamp from `auth.uid()` + `profiles`, rate-limits to 10 posts/minute, and inserts `world_chat_messages`. Authenticated clients read the latest 200 rows through SELECT RLS and receive inserts via Supabase Realtime. The UI shape stays `ChatMessage { id, authorName, text, createdAt }`; command results remain private system entries and are never inserted into the feed.
- **Friends** — in: UID string (10 digits, `game/uid.ts`) via `onSearch(uid) => Promise<FriendCandidate | null>`; out: `FriendCandidate { uid, name, level, title }` (`types/player.ts:62-67`), a point-in-time snapshot, appended to `Player.friends: FriendCandidate[]` through `onPlayerChange(next: Player) => Promise<boolean>` (`AddFriendModal.tsx:8-15`, `AddFriendPanel.tsx:47-71`). Server-side: `public.friends` table, one row per `(profile_id, friend_uid)`, RLS `auth.uid() = profile_id` for both select and write (`supabase/migrations/0001_init.sql:55-60,112-113`) — **write-your-own-row only, no reciprocal accept step, no notification to the added player.**

### Dependencies

- **hero** (`game/characters.ts` — `ROSTER`, `getCharacter`) for `/givecharacter` command resolution and display (`commands.ts:1,48-63`, `WorldChat.tsx:2,176`).
- **backend** — Supabase `profiles`/`friends` plus `world_chat_messages`, RLS, the rate-limit helper and Realtime publication. `src/data/accountRepository.ts` remains the dormant local account fallback; World Chat no longer uses it or localStorage for history.
- **economy** — indirectly, since `/givecharacter` grants an owned character through the same account-mutation path currency/inventory grants use (`accountRepository.ts` `CharacterGrantResult` type).
- Feeds **none** of the other 28 systems currently — no other system reads chat or friends data (grep confirms no cross-imports of `WorldChat`/`AddFriendModal` outside `LobbyPage.tsx:4,8,263,313`).

### Done-criteria

1. `npm run test` passes `src/components/WorldChat/commands.test.ts` unchanged in behavior (admin-gate: non-admin sender always returns `null` regardless of text).
2. A message posted by one authenticated player appears cross-device through Realtime and survives reload from `world_chat_messages`; client code sends text only and cannot choose author/timestamp.
3. Typing `/anything` as a non-admin (or admin on a non-admin account) sends it as a literal chat message character-for-character — never dropped, never intercepted.
4. Adding a friend that fails to persist (`onPlayerChange` resolves `false`) shows the error toast and does **not** show the success toast (`AddFriendPanel.tsx:62-71`) — this is the one existing regression test worth pinning if not already covered.
5. Migration tests pin server-derived author data, length validation and the 10/minute throttle. Guild/private chat and report/takedown moderation remain explicit future decisions.

### World-class bar

**Guardian Tales** (already the project's own cited exemplar for the single-active-hero combat model, `docs/MASTER_BLUEPRINT_v3.0.md:334`) also ships a comparably lightweight social layer: a single global/local chat channel plus a friend list gated by an in-game numeric ID — not a full social graph, matching this project's UID-based friend lookup almost exactly. ⚠️ unverified: whether Guardian Tales' friend list surfaces a presence/last-active signal next to each entry — targeted searches did not turn up a source confirming this detail, so it should not be treated as settled. If confirmed, it would be the one pattern worth borrowing: this project's `FriendCandidate` snapshot (`uid, name, level, title`, no timestamp) cannot show presence today — worth a `lastSeenAt` field if/when friends move off snapshot semantics, contingent on verifying the exemplar first.

### Stay-current note

World Chat now uses Postgres Changes. Re-check Supabase Realtime/RLS guidance whenever the subscription or JWT model changes, and keep `world_chat_messages` in the Realtime publication. Blocked names remain local by design until a server-side moderation scope is explicitly chosen.

### Low-maintenance-cost design

The existing split between **command parsing** (`commands.ts`, pure functions, no React, unit-testable) and **command execution** (`WorldChat.tsx`, calls into `accountRepository` via props) is the one structural choice worth preserving and extending — it's already the project's proven pattern (`commands.ts:6-8` states this explicitly as the reason it was split out). Any new admin command or social action should follow the same shape: a pure resolver function with a discriminated-union return type, no new abstraction/interface layer, no speculative "command registry" class until there are enough commands that a flat `if` chain (`commands.ts:106-158`) actually hurts — YAGNI per this repo's own established style (`.agents/rules/ecc`). For the friends-list-growth pattern specifically, follow the **live** Supabase path's shape — `friends` built inline via `.map()` over the query result in `accountRepository.supabase.ts:117` — rather than the `Player.friends: FriendCandidate[] ?? []` guard in `accountRepository.ts`'s `normalizePlayer`, which is real but lives in the dead localStorage file and isn't demonstrated as current production practice.

### Known scars (real historical precedent)

- **Scar**: Guardian Tales' guild chat had a bug where a member's chat message would disappear when it overlapped with a (re)connection event. — Source: Guardian Tales official patch notes, November 30, 2021 (mirrored at guardiantalesguides.com/game/patches/view/22 — "An issue where the guild member chat disappears when it overlaps with the connection is fixed").
  **Test-for-us**: Insert while another client disconnects/reconnects. If the Realtime event is missed, the next `loadWorldChat()` query must recover the durable Postgres row rather than lose the message.

- **Scar**: In the same patch, Guardian Tales reduced guild chat to 10 messages per minute per user — the patch note frames this as a reduction from a prior, looser throttle, not a move from fully unthrottled to capped. — Source: Guardian Tales official patch notes, November 30, 2021 (guardiantalesguides.com/game/patches/view/22 — "Guild chat is reduced to 10 times per minute").
  **Test-for-us**: Fire 11 posts inside 60 seconds from one account. The first 10 may commit; the 11th must fail inside `post_world_chat_message`, including concurrent bursts serialized by the shared advisory-lock rate limiter.

- **Scar**: When Guardian Tales migrated its friend system to mutual-acceptance, it introduced a hard cap of 30 pending friend requests per user; the patch note states requests exceeding the maximum limit "will not be sent" once a user is at capacity. — Source: Guardian Tales official patch notes, September 19, 2023 (guardiantalesguides.com/game/patches/view/62).
  **Test-for-us**: This project's `AddFriendPanel.tsx:62-71` already distinguishes only two outcomes from `onPlayerChange` — success toast vs. generic error toast (pinned by the existing regression test, per this doc's item 4). Try a friend-add that fails for a capacity/limit-shaped reason (or any reason other than plain persistence failure) and check whether it collapses into the same undifferentiated error toast as a real save failure — i.e. whether the current two-outcome contract can actually distinguish "your request didn't go through" from "it went through but was silently dropped/undeliverable."

This project's own spec — `docs/MASTER_BLUEPRINT_v3.0.md` and `docs/agent-blueprint/28-social-communication-system.md` — decides what "correct" looks like here; Guardian Tales' patch notes only indicate what _kind_ of chat/friend-list failure to go looking for, not how to fix it.
