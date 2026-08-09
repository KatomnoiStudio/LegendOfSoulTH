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
- A one-second authority heartbeat timeout detects force-quit/network loss even when no explicit
  disconnect command arrives. The ten-second reconnect grace is checked before any late input or
  reconnect can revive a participant; single-player and double-forfeit resolution are authority
  signed.
- HTTP and Realtime snapshots share one strictly increasing `stateVersion` gate, so an older
  response cannot rewind tick, HP, position, or pending input state.
- A cryptographically generated per-match RNG seed is committed into the deterministic state hash.
- Failed input POSTs retain and resend the identical sequence/action frame until acknowledged.
- #20 normalization constructs both PvP entities; opposing player Heroes use elite-tier reactions.
- Completed results are copied into a detached audit table before ephemeral room cleanup; a
  minute-scheduled reaper removes expired unfinished rooms without deleting those audit records.
- Matchmaking, Rank/MMR, rewards, and public lobbies are not implemented (P13).

## Automated two-client / adversarial coverage

- Two independent reconcilers complete a match and converge to the authority hash.
- Asymmetric 50 ms / 200 ms latency, burst reordering, duplicate retries, and repeated corrections.
- Frame-by-frame deterministic replay, per-match seed coverage, and a future-affecting state hash
  that includes authority clocks/heartbeats but excludes presentation-only `finishedAt`.
- Input deduplication, bounded action backlog, identity injection, axis clamping, sequence-gap guard,
  newest-action retention, failed-POST retry, and server-clock anti-speedup.
- Force-quit liveness detection, reconnect inside grace, and rejection of reconnect/input after
  expiry.
- PGLite create/join, behavioural third-user denial under `SET ROLE authenticated`, receive-only
  Realtime RLS, service-role-only CAS, stale-version rejection, participant-only result, retained
  audit results, scheduled cleanup, and empty `search_path` checks.
- Mounted hook/modal coverage for input retry, reconnect messaging, create/join, two-player state,
  and authority result rendering.
- The Edge entry point is checked by Deno and executed by two Deno tests in the normal CI command;
  structured non-2xx error codes survive the Supabase SDK wrapper.

## Clean verification rounds

1. Before review fixes, two consecutive `npm run ci` rounds passed with 99 Vitest files / 851 tests.
2. After the review fixes, `npm run ci` passes TypeScript plus Deno typecheck, zero-warning lint,
   101 Vitest files / 862 tests, 2 Deno execution tests, production build, and all bundle budgets.

## Remaining graduation gate

These are clean automated verification rounds, not a substitute for the repo's required live
browser dogfood. Therefore P12 remains 90%, not 100%, until the migration and Edge Function are
deployed and two real signed-in clients complete two clean private-channel rounds covering normal
play, asymmetric latency, desync correction, disconnect, and reconnect/forfeit.
