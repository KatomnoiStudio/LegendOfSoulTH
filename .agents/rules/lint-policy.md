<!-- coalmine: verified 2026-08-07 · exemplar excalidraw `eslint --max-warnings=0` + oxlint CLI docs + WAI-ARIA APG + MDN BroadcastChannel · revalidate 90d -->

# Project Law: Lint Policy

> `.oxlintrc.json` is JSON and cannot carry comments. This file is where the reasoning
> lives. Change one without the other and the next person inherits a rule they cannot
> explain — which is how the config drifted into meaning nothing in the first place.

## The gate is real now

`npm run lint` runs `oxlint --deny-warnings`. **Any** finding fails it, and it fails
`ci.yml` and `deploy.yml` with it.

> **⚠️ Correction, 2026-08-16 — this line said "and the pre-commit hook" and that was
> false.** Measured at `package.json` `lint-staged`: the pre-commit hook runs **bare
> `oxlint`** with no `--deny-warnings`, and only over `*.{ts,tsx}` — `tools/*.mjs` is not
> linted before a commit at all. **A warning therefore passes pre-commit and fails CI**,
> which happened during this same session: `unicorn/no-array-sort` on a new test file was
> clean locally and would have gone red in `ci.yml`.
>
> Blast radius is low — CI still catches it before master — but a binding rule naming an
> enforcement point it was never wired into is the exact class this file's own opening
> paragraph says costs a ruleset its authority. **The deny gate is CI-only until
> `lint-staged`'s `oxlint` invocation is changed to match `npm run lint`** (`--deny-warnings`,
> and cover `*.mjs`). Until then, run `npm run lint` yourself before pushing any code file.
>
> **Enforcement**: this correction is ADVISORY; the fix that makes it unnecessary is a
> two-token change in `package.json` (audit item A12).

Before 2026-08-07 it did not. Every category was `warn`, no script passed a deny flag,
and `oxlint` exited `0` with 34 findings printed — including two
`react-hooks/exhaustive-deps` and a `no-console` in a file whose own header claimed the
rule was enforced. A gate that cannot fail is worse than no gate: it reads as green and
teaches everyone to scroll past the output.

**Consequence to accept:** adding a rule now means fixing every existing violation of it
in the same change, or turning it off deliberately and writing down why, here. That cost
is the point.

## Rules turned off, and why

Turning a rule off is a real decision and belongs here, not in a silent config diff.
A rule is off only when it is **wrong for this codebase**, never because fixing it is
tedious.

### `jsx-a11y/prefer-tag-over-role` — off globally

Fired 18 times, telling us to replace `role="dialog"` with `<dialog>`,
`role="progressbar"` with `<progress>`, `role="status"` with `<output>`, and
`role="group"` with `<fieldset>`.

Each of those is a behavioral change wearing a lint rule's clothes:

- `<dialog>` brings its own top layer, backdrop, and `showModal()` lifecycle. This
  project deliberately hand-rolls modal behavior through `src/hooks/useModalA11y.ts`
  and has twice rejected adopting a UI library for this same territory (see
  `MEMORY.md`). Swapping eight modals to `<dialog>` to satisfy a linter would be the
  largest untested UI change in the repo, made for no user-visible gain.
- `<progress>` is notoriously resistant to styling across engines; these are themed game
  HUD bars, not form progress.
- `<output>` is defined for the result of a form calculation. Using it for a toast or a
  loading announcement would be semantically wrong — `role="status"` on a `<div>` is
  what WAI-ARIA's own live-region guidance describes.

The accessibility outcome the rule is reaching for is already met: the roles are
present and correct. Only the element choice differs, and here the element choice is
load-bearing.

### `import/no-unassigned-import` — off globally

Fired on `import './index.css'` in `src/main.tsx`. That is how Vite loads a stylesheet
and how side-effect imports work generally. The rule has no way to tell that apart from
an accidental import, and the accidental case is caught by review far more cheaply than
by living with a false positive in the entry file.

### `no-console` — off for `src/lib/webVitals.ts` only

Same shape as the `src/lib/errors/**` exemption above: this is the sole point that logs
Core Web Vitals (LCP/INP/CLS), dev-only (`import.meta.env.DEV` gate, dynamic `import()`
so production builds tree-shake it out entirely), local-only console.debug, nothing sent
anywhere — see `.agents/rules/ecc/web/observability.md` for the standing decision against
external telemetry. Scoped to the one file so a stray `console.log` anywhere else in the
app still gets caught.

### `no-console` — off for `supabase/functions/**` only

Added 2026-08-10 with the Edge Function's structured logging (audit wave 1, finding F6).

`supabase/functions/pvp-authority/index.ts` runs on Deno inside Supabase's Edge Runtime,
not in the browser. It cannot import `src/lib/errors/reportError` — that module's whole
job is to route a _client_ failure to a _client_ surface (the console the player's
devtools shows, the visible-error relay that renders a banner). On the server there is no
player and no banner; the one channel that exists is the function's own log stream, and
`console.error` is exactly how Supabase's log explorer ingests it.

Before this override the file had zero log statements in 238 lines — every failure path
(a commit rejected by a constraint/RLS/deadlock, a malformed key JSON booting into a 500)
returned a short error code to the client and vanished. `no-console` was, in this one
directory, a rule enforcing silence on the only place that could speak.

Scoped to `supabase/functions/**`, not widened to a Deno file glob: everything under
`src/` still routes through the error registry, and a stray `console.log` there still
fails the build. Logs there are structured single-line JSON via the file's own
`logFailure()` helper and never carry a key, token, or player secret — only ids and the
error's own `code`/`details`/`hint`.

### `unicorn/require-post-message-target-origin` — off for `src/components/WorldChat/chatStorage.ts` only

Fired on `channel.postMessage('new-message')`. `BroadcastChannel.postMessage()` takes
exactly one argument per spec — `targetOrigin` belongs to `window.postMessage()` and
`MessagePort`. The rule cannot distinguish the receivers.

Scoped to the one file on purpose: a real cross-origin `window.postMessage` elsewhere in
the codebase must still be caught.

### The exploration subsystem — override REMOVED 2026-08-07, expiry condition fired

There used to be an override here turning off four rules for
`src/components/{GameExplorationSession,ExplorationScene,DialogueBox}/**` and
`src/hooks/useDialogue.ts`, because that subsystem had no live entry point and changing
effect dependencies in code nobody can exercise is how a silent bug gets planted.

It was written with an explicit expiry condition: _"expires with the keep-or-delete
decision on exploration mode, which is HetCreep's to make."_ That decision landed the same
day — comment the subsystem out rather than delete it — so the rules cannot fire there any
more and the override is gone.

Recorded because it worked as designed: a scoped exemption with a stated end condition,
removed when the condition fired rather than quietly becoming permanent. Write the next
one the same way.

## What is NOT a reason to turn a rule off

- "It fires a lot." 18 identical findings is a signal about the rule's fit, not a
  licence to silence anything numerous.
- "The fix is tedious." Tedious is affordable; wrong is not.
- "It only fires in code we don't run." Say that out loud in an override with an expiry
  condition, as above — do not fold it into a global `off`.
