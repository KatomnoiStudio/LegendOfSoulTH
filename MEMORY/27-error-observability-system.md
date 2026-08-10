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
(The button itself is now gone, not repaired — see the HOLD below.)

**A read is not always a read.** `source[key]` invokes a getter, and a getter can throw
(revoked Proxy, cross-origin `Window`/`Location`, a hostile object). My first pass at
`normalizeError` read `name`/`message`/`stack`/`code`/`details`/`hint`/`cause` bare, so a
library rejecting with such a value made `reportError` itself throw — and because
`globalErrorHandlers` feeds it fully arbitrary values (`event.error ?? event.message`,
`event.reason`), the last-resort net became the failure. Worse, this was a regression I
introduced: on master `reportError` only handed the raw value to `console.*` and touched no
properties. Every property read in this subsystem now goes through `readProperty`, and
`reportError` wraps the whole normalize step as a structural guarantee. The QC gate caught
this, not me — I had written the invariant "ตัวแปลง error ต้องไม่กลายเป็น error เสียเอง" in a
comment and then honoured it in only one of the two code paths.

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

## HOLD — the crash screen cannot back up a player's data, and no code I own can fix it

**Status: the backup button is REMOVED, not fixed.** Do not read the closed F1 entries in
`MEMORY.md`/`TASKS.md` as "the backup works now" — it does not exist.

`accountRepository.supabase.ts:763-768` `exportSave()` is a hardcoded stub that always returns
`{ ok: false, error: 'ฟีเจอร์นี้ใช้กับบัญชี Supabase ไม่ได้ — ข้อมูลอยู่บนเซิร์ฟเวอร์แล้ว' }`. So the
button failed 100% of the time both before and after I repointed it: first answering "not
logged in" (dormant repo), then answering "this feature doesn't work" (live stub). Two
different sentences, one identical outcome — the player never gets a file.

I removed the button rather than relabel it. A crash screen that tells a frightened player to
press a control which always errors is worse than a screen with no control at all, and a
relabel keeps the broken control on the screen. The screen now states plainly that progress is
saved on the server and offers only "โหลดใหม่", which actually works.
`ErrorBoundary.test.tsx` pins the absence, so re-adding it without fixing the stub goes red.

**A real fix needs `accountRepository.supabase.ts` — the persistence lane's file, outside my
fence — or an owner decision** on whether a server-side export is wanted at all (arguably it
is not: the data is already durable server-side, which is exactly what the stub's message
says). If it lands, re-add the button here and delete this HOLD.

**Second surface, same root cause, also unfixed:** `SettingsModal.tsx`'s "ส่งออก save เป็นไฟล์"
button routes through `useAuth.ts:348` to the same stub and toasts the same error every time.
Both `useAuth.ts` and `SettingsModal.tsx` were outside my dispatch. That button is still on
screen and still broken.

**Method scar from this one:** the old tests missed it for two rounds because all three
`vi.mock`'d `accountRepository.supabase` wholesale and asserted an `ok:true` path the real
module cannot produce. A mock that fabricates a return value the real callee never returns
tests the test author's belief, not the system. When mocking a module boundary, check the real
implementation can actually produce the value being mocked.

## Open / deliberately not done

- **No sink is wired.** `setErrorSink()` exists with the console as its default; picking a real
  destination is the owner's call. My recommendation is on the branch's dispatch report: a
  Supabase table + `INSERT`-only RPC fits the existing stack and keeps the no-third-party
  decision intact.
- **`webVitals.ts` still early-returns unless DEV.** Field CWV has nowhere to go until a sink is
  chosen; shipping collection first would be speculative work. Revisit when a sink lands.
- **Star ascension** (`ascendCharacterStar` call site) was outside my dispatch's file list and
  still has no `reportError`. Same defect class as the five I closed.
- **The crash-screen backup** — see the HOLD above. Blocked on the persistence lane, not on me.
