# MEMORY/27 — Error / Observability System

Caretaker memory. Working knowledge only — git log holds history.

## What I own (contract: `docs/agent-blueprint/27-error-observability-system.md`)

The error-code registry (`src/lib/errors/codes.ts`), the single reporting funnel
(`reportError.ts` + `normalizeError.ts`), the visible-error relay, the two screens that show a
failure to a player (`ErrorBoundary`, `GlobalErrorBanner`), the out-of-React net
(`globalErrorHandlers.ts`), and — since 2026-08-10 — the Edge Function's server-side log
channel, which is the same duty on the other side of the wire.

Not mine: what each caller does about its own failure (retry, fallback, degrade), WebGL/WebGPU
recovery logic itself, non-error toasts, and the decision of whether to ship telemetry at all.
That last one is the owner's, permanently — see below.

## Load-bearing facts about this system

**The `ErrorCode` is this project's stack trace.** There is no external error sink, by a
settled decision (`.agents/rules/ecc/web/observability.md`). The player is the transport: they
read a code off the screen and paste it into an issue. Everything else follows from that — a
code that never reaches the screen is worth nothing, and a failure that reports nothing at all
is invisible forever, because there is no server log to fall back on.

**`no-console` is on repo-wide with three exemptions**, and they are not decoration:
`src/lib/errors/**` (the funnel itself), `src/lib/webVitals.ts`, `tools/**`, and now
`supabase/functions/**`. Adding one is a lint-policy decision that must be written up in
`.agents/rules/lint-policy.md` (rule 13) — never a silent config diff.

**oxlint DOES lint `supabase/functions/**`.** A dispatch told me to "confirm the Edge Function
is outside oxlint's src scope" — it is not; `oxlint --deny-warnings` has no path filter and the
Deno file was in scope. Check, don't assume, before writing `console.*` anywhere.

**`ErrorBoundary` must never statically import a Supabase-backed module.** `main.tsx` imports
the boundary statically, before `createRoot`, and imports `App.tsx` _dynamically_ precisely
because `supabaseClient.ts` throws at module-evaluate time when env vars are missing. A static
import of `accountRepository.supabase` inside the boundary moves that throw ahead of React and
white-screens the whole app — the exact bug main.tsx's long comment records as having happened
in production. The backup button uses `await import(...)` inside the handler. The test suite
catches this (LobbyBattleSession.test.tsx dies first), but only if you run it.

**The `err` argument travels all the way to the visible tier.** `reportError(code, tier, err)`
normalizes once and hands the normalized object to both the sink and every visible-error
subscriber. `GlobalErrorBanner` used to destructure only `(code)` and silently drop it.

## Scars

**A failure that is handled politely is still a failure that must report.** The crash screen's
backup button returned `{ok:false, 'ยังไม่ได้ล็อกอิน'}` 100% of the time for the whole life of
the Supabase migration — it called the dormant localStorage repo, whose `readActiveSession()`
reads a key the live backend never writes. It was invisible because the `ok:false` branch
reported nothing; only the `catch` did, and it never threw. Same shape in five subsystems
(gacha, hero skill/talent/awakening, currency shop, chat send): a Thai toast and no report.
**Rule I now apply: if a branch tells the player something went wrong, it reports.**

**A stale comment is load-bearing.** `ErrorBoundary`'s header asserted "เกมนี้เก็บทุกอย่างไว้ใน
localStorage … ไม่มี backend ให้กู้คืน" long after the Supabase migration, and that false premise
is exactly what justified leaving the button pointed at the dead repo. Doc rot in a comment is
not cosmetic when the comment is the argument for the code beneath it.

**`JSON.stringify(new Error('x')) === '{}'`.** `name`/`message`/`stack` are non-enumerable. Any
report that leaves the console — a sink, a file, a string the player copies — loses the entire
error unless it is normalized field by field first. Supabase's `PostgrestError` is worse: it is
a plain object whose `code`/`details`/`hint` carry the real cause (42501 = RLS) while `.message`
stays generic.

**One code for four call sites destroys the signal it was added to create.** `usePvPRoom` used
`PVP_AUTHORITY_FAIL` for create/join, input, reconnect and disconnect. "Can't enter a room" and
"in a room but inputs aren't reaching the server" are different bugs with different severities
and were indistinguishable in the logs.

## Open / deliberately not done

- **No sink is wired.** `setErrorSink()` exists with the console as its default; picking a real
  destination is the owner's call. My recommendation is on the branch's dispatch report: a
  Supabase table + `INSERT`-only RPC fits the existing stack and keeps the no-third-party
  decision intact.
- **`webVitals.ts` still early-returns unless DEV.** Field CWV has nowhere to go until a sink is
  chosen; shipping collection first would be speculative work. Revisit when a sink lands.
- **Star ascension** (`ascendCharacterStar` call site) was outside my dispatch's file list and
  still has no `reportError`. Same defect class as the five I closed.
