# MEMORY/13 — Hero Collection System (caretaker)

Contract: `docs/agent-blueprint/13-hero-collection-system.md`. Sensitive-adjacent: `grantCharacter`
write-path (both impls) touches account ledger shape (`OwnedCharacter`) — opus flip on RLS/RPC
touches, no delegate-down on that surface. Never touch: gacha RNG/pity (#23), progression/star
math (#14/#15), combat kit files (#12).

## Live state (2026-08-10)

- **Two legitimate write paths to hero ownership** — design-lock 3.a: `grantCharacter` (client-side,
  `accountRepository.ts:753-783` local / `accountRepository.supabase.ts:682-701` prod, RPC-fronted)
  AND `perform_gacha_pull`'s own `insert into owned_characters`
  (`supabase/migrations/20260809073000_p9_gacha_server_authority.sql:254-263`, server-authoritative,
  atomic-by-design). The contract's old "single write-path, grep-gate enforced" claim (done-criterion 5) is amended, not violated — the exception is server-side RPC transactions that never round-trip
  through client-callable `grantCharacter`. A NEW server-side grant path (future quest/login-reward
  RPC) is NOT automatically covered by this exception — check by hand.
- **Gacha System #23 shipped** (TASKS.md row 22, 90% CI-green, prod migration applied) — contract's
  "not built yet" Dependencies claim was stale, now fixed. **NOT "order restored"**: the lock
  (`MASTER_BLUEPRINT_v3.0.md:549-550`) puts P9 (Gacha/Star) BEFORE P10 (Hero Collection expansion);
  #13 shipped first anyway (`AGENT_BLUEPRINT.md:36`, "reverse order"). #23 landing only closes half
  the divergence — #15 Star Ascension is still below 100% (`AGENT_BLUEPRINT.md:35`), so the owner's
  pause on further #13 expansion stays in force until #15 lands, not until #23 alone lands.
- Roster is 6 heroes, all distinct archetypes, machine-checked (`heroCollection.test.ts:100-112`).

## File:line drift — expect it, don't trust old numbers

Every citation in the contract had drifted between the 2026-08-08 onboarding read and this dispatch
(files moved again in between). Re-derived + verified 2026-08-10:
`characters.ts` ROSTER `70-197`, `getCharacter` `199-202`, `Character` interface `42-63`, `Rarity`
`17`; `accountRepository.shared.ts` `CharacterGrantResult` `74-75`; `accountRepository.ts`
`grantCharacter` `753-783` (policy comment `748-749`); `accountRepository.supabase.ts`
`grantCharacter` `682-701`; `player.ts` `OwnedCharacter` `26-50`; `AGENT_BLUEPRINT.md` #13 entry
`:83`; `App.tsx` `grantCharacter` import `:40` / prop `:182`; `useAuth.ts` `:70,273,375`.
**Lesson**: grep-reverify every contract citation at the start of each dispatch, including ones you
personally verified last time — do not carry forward as fact. (Same lesson #22 already logged
independently — cross-system pattern, not #13-specific.)

## QC bounce, wave 2 (2026-08-10) — lesson

Bounced on a HIGH: my own rewritten Status-note sentence claimed "order is now #13 → #23 as
originally locked" — wrong, the lock is the REVERSE (P9/#23 before P10/#13), and #15 was still
incomplete, so the pause hadn't actually lifted. Citations in that same edit were all exact; the
claim built on top of them wasn't checked against the source it was summarizing.
**Lesson (didn't fully take)**: re-deriving a citation's line number is not the same as
re-deriving its CLAIM.

## QC bounce, wave 3 (2026-08-10) — lesson that actually took

Bounced again, same file, 5 citation problems — 3 on lines I'd just rewritten in wave 2, including
a `MASTER_BLUEPRINT_v3.0.md:509` cite for P10 that pointed at World Chat prose (`:550` was the
right line — I even had the correct line right above it in the Status note and didn't cross-check
the sibling cite). Also: an "unresolved drift risk" claim that was actually resolved
(`AccountRepositorySubset` shared-type assertion, `accountRepository.shared.ts:156` +
`.ts:786`/`.supabase.ts:769`), a "no test enforces this" claim contradicted by a real test
(`heroCollection.test.ts:115-149`), a wrong claimed 2nd invocation site for `grantCharacter` (only
real call site is `useAuth.ts:276` — `perform_gacha_pull` never calls it, it writes directly), and
one more surviving "roster is 3" stale number.
**Root cause**: I was verifying citations against MY OWN edit as I wrote it, not re-grepping the
DOC'S FINAL SAVED TEXT afterward as one pass. Errors accumulate silently across a multi-edit
session even when each individual edit felt checked.
**Actual lesson**: after ALL edits in a citation-fix dispatch, run one closing pass — grep the
whole file for every `:\d+` citation pattern and re-verify each against the live tree, treating it
as if someone else wrote it. Do this even for sections/lines not directly touched this round if
they sit inside a section that was.

## Known but out-of-scope (flagged, not fixed)

- Dependencies' #25 mentions the resolved drift risk directly now (no separate cross-reference
  line numbers left to track).
