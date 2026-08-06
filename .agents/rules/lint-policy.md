<!-- coalmine: verified 2026-08-07 · exemplar excalidraw `eslint --max-warnings=0` + oxlint CLI docs + WAI-ARIA APG + MDN BroadcastChannel · revalidate 90d -->
# Project Law: Lint Policy

> `.oxlintrc.json` is JSON and cannot carry comments. This file is where the reasoning
> lives. Change one without the other and the next person inherits a rule they cannot
> explain — which is how the config drifted into meaning nothing in the first place.

## The gate is real now

`npm run lint` runs `oxlint --deny-warnings`. **Any** finding fails it, and it fails
`ci.yml`, `deploy.yml`, and the pre-commit hook with it.

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

### `unicorn/require-post-message-target-origin` — off for `src/components/WorldChat/chatStorage.ts` only

Fired on `channel.postMessage('new-message')`. `BroadcastChannel.postMessage()` takes
exactly one argument per spec — `targetOrigin` belongs to `window.postMessage()` and
`MessagePort`. The rule cannot distinguish the receivers.

Scoped to the one file on purpose: a real cross-origin `window.postMessage` elsewhere in
the codebase must still be caught.

### The exploration subsystem — four rules off, **temporarily**

Scoped to `src/components/{GameExplorationSession,ExplorationScene,DialogueBox}/**` and
`src/hooks/useDialogue.ts`.

That subsystem has **no live entry point** — nothing imports `GameExplorationSession`
(see `MEMORY.md`). Its findings are real (`exhaustive-deps` ×3, a non-interactive click
handler ×2, a mixed-export file ×1), but changing effect dependencies in code that
nobody can exercise and no test covers is how a silent bug gets planted. Fixing them
would also be wasted if the subsystem is deleted.

**This override expires with the keep-or-delete decision on exploration mode, which is
HetCreep's to make.** Keep it → fix the six findings and delete this override. Delete
it → the override goes with the code. Either way it does not survive as a permanent
exemption.

## What is NOT a reason to turn a rule off

- "It fires a lot." 18 identical findings is a signal about the rule's fit, not a
  licence to silence anything numerous.
- "The fix is tedious." Tedious is affordable; wrong is not.
- "It only fires in code we don't run." Say that out loud in an override with an expiry
  condition, as above — do not fold it into a global `off`.
