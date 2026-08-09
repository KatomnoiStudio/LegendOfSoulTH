# P12 Private PvP Verification Report

Date: 2026-08-09 · Owner: Codex · Scope: #20 + #21 only

## Implemented contract

- Six-character invite code; one host and one guest only.
- Authenticated create/join RPCs validate Hero ownership.
- JWT-protected Edge Function injects the authenticated player identity and advances a 50 ms
  fixed-tick authority.
- Clients send inputs only. They cannot directly mutate rooms/results or publish authority state.
- Postgres compare-and-swap commits state/result and emits snapshots to a participant-only private
  Realtime topic. Authenticated users have receive permission and no Broadcast INSERT policy.
- Client prediction resets to each authority snapshot and replays only unacknowledged inputs.
- Ten-second reconnect grace, single-player forfeit, and double-forfeit resolution.
- #20 normalization constructs both PvP entities; opposing player Heroes use elite-tier reactions.
- Matchmaking, Rank/MMR, rewards, and public lobbies are not implemented (P13).

## Automated two-client / adversarial coverage

- Two independent reconcilers complete a match and converge to the authority hash.
- Asymmetric 50 ms / 200 ms latency, burst reordering, duplicate retries, and repeated corrections.
- Frame-by-frame deterministic replay and a full future-affecting state hash.
- Input deduplication, bounded action backlog, identity injection, axis clamping, sequence-gap guard,
  and server-clock anti-speedup.
- Disconnect/reconnect inside grace; authority-confirmed forfeit after expiry.
- PGLite create/join, RLS/direct-write denial, receive-only Realtime policy, service-role-only CAS,
  stale-version rejection, participant-only result, and empty `search_path` checks.
- Mounted modal coverage for room create/join input, two-player state, and authority result rendering.

## Clean verification rounds

1. `npm run ci`: typecheck and zero-warning lint passed; 99 test files / 851 tests passed;
   production build and all 16 bundle budgets passed.
2. `npm run ci`: identical clean result; 99 test files / 851 tests passed; production build and all
   16 bundle budgets passed. The two-client replay did not expose nondeterminism/flakiness.

## Remaining graduation gate

These are clean automated verification rounds, not a substitute for the repo's required live
browser dogfood. The Cloud Browser could not open the local production preview
(`ERR_BLOCKED_BY_CLIENT`), and the available Supabase connector does not expose the
LegendOfSoulTH project. Therefore P12 remains 90%, not 100%, until the migration and Edge Function
are deployed and two real signed-in clients complete two clean private-channel rounds covering
normal play, asymmetric latency, desync correction, disconnect, and reconnect/forfeit.
