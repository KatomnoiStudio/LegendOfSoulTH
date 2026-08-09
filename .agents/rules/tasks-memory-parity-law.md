<!-- coalmine: verified 2026-08-08 · exemplar this project's own TASKS.md drift, HetCreep caught it twice same day (item 114's 7 stale rows, then row 9 pointing at nothing after 5 real features shipped) · revalidate 90d -->

# Tasks/Memory Parity Law

> **Scope**: Binding for every dev/agent. `TASKS.md` is `.agents/rules/agent-memory-law.md`'s
> `MEMORY.md` cadence applied to the multi-dev claim ledger — same discipline, different file.

## The rule

**Any task-shaped work that touches a `TASKS.md` row gets that row updated in the SAME
commit/push as the code — not "eventually," not "at claim/graduation time only."** This mirrors
`agent-memory-law.md` §2 (Continuous Memory Updates) exactly: if the work is worth a `MEMORY.md`
timeline item, and it maps onto an existing `TASKS.md` row (or clearly should get a new one),
that row's `%`/Notes/Claimed-date gets touched too, in the same delivery.

Concretely, this fires when:

- Work lands that a `TASKS.md` row already claims (bump `%`, refresh the date, note what shipped
  — even a one-line pointer to the `MEMORY.md` item number is enough, full re-narration isn't
  required).
- A `%`/status stops being true because reality moved past it (the exact shape of item 101's
  41-agent workflow leaving 7 rows reading "⚪ not started 0%" for an entire session).
- Direct, unambiguous, same-session work (no claim conflict possible — a single dev/agent asked
  to do X, did X) still counts. `TASKS.md`'s claim protocol exists to prevent collisions between
  concurrent devs; it is not a reason to skip documenting real work just because there was no
  collision to prevent. Route it to the row that already covers that system (see row 9's own
  "grows as later tasks land" framing) rather than skipping the file entirely.

## Why this needed writing down

Found via HetCreep asking directly, twice: first at item 114 (7 rows stale an entire session),
then again 2026-08-08 after Google OAuth + guest accounts + Turnstile + audit-log cleanup all
shipped, each logged faithfully to `MEMORY.md`, none touching `TASKS.md` at all — including row 9
("Backend / Server-Authority System"), which exists specifically to cover this class of work and
sat unpointed-to through all of it. `MEMORY.md` already gets this discipline (`agent-memory-law.md`
§4: pushed with every submit); `TASKS.md` drifting while `MEMORY.md` stays current is the same
failure mode restated — a reader trusting `TASKS.md`'s `%` column gets a false picture of what's
actually done.

## What this doesn't mean

- Doesn't require a `TASKS.md` row for every commit — trivial fixes, doc typos, and work with no
  reasonable row to attach to (a one-off CI env-var fix, say) don't need an entry invented for
  them. The bar is the same one `MEMORY.md` timeline items already clear: worth a reader knowing.
- Doesn't relax the claim protocol in `.agents/rules/multi-dev-task-queue-law.md` — claiming
  before starting still applies wherever collision is actually possible. This rule is about
  _keeping the row honest once work lands_, not about who's allowed to start it.
- Doesn't mean re-deriving `%` bands from scratch each time — same bands as the law file
  (`multi-dev-task-queue-law.md`), same discipline: objective, not vibes.
